<?php

namespace App\Services;

use App\Models\Execution;
use App\Models\Language;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;

class DockerExecutionService
{
    protected int $timeout;
    protected string $memoryLimit;
    protected int $outputLimit;
    protected int $maxProcesses;

    public function __construct()
    {
        $this->timeout = (int) config('execution.timeout', 5);
        $this->memoryLimit = (string) config('execution.memory_limit', '134217728');
        $this->outputLimit = (int) config('execution.output_limit', 1000000);
        $this->maxProcesses = (int) config('execution.max_processes', 100);
    }

    /**
     * Execute user code inside a Docker sandbox.
     *
     * @return array{status: string, stdout: string, stderr: string, exit_code: ?int, execution_time: ?float, memory_usage: ?int}
     */
    public function execute(Execution $execution, Language $language): array
    {
        $workDir = $this->createWorkDir($execution->id);
        if ($workDir === null) {
            return $this->result('system_error', '', 'Failed to create execution workspace', null);
        }

        // The mounted workdir lives inside this container's filesystem. When running the
        // sandbox container via the host docker daemon, the bind mount must reference the
        // path as seen on the host. Translate with EXECUTION_HOST_BASE (e.g. the project
        // directory on the host) when set.
        $hostWorkDir = config('execution.host_base', '')
            ? rtrim((string) config('execution.host_base'), '/').'/'.ltrim(str_replace(base_path(), '', $workDir), '/')
            : $workDir;

        try {
            $this->writeSourceFile($workDir, $execution, $language);
            $this->writeStdinFile($workDir, $execution);
            $this->writeRunnerScript($workDir, $language);

            $command = [
                'docker', 'run', '--rm',
                '--name', 'coderunner-'.$execution->id,
                '--network', 'none',
                '--cpus', '0.5',
                '--memory', $this->memoryLimit,
                '--memory-swap', $this->memoryLimit,
                '--pids-limit', (string) $this->maxProcesses,
                '--read-only',
                '--cap-drop', 'ALL',
                '--security-opt', 'no-new-privileges',
                '--tmpfs', '/tmp:rw,size=64m,exec',
                '--env', 'HOME=/tmp',
                '--env', 'TMPDIR=/tmp',
                '--env', 'PYTHONDONTWRITEBYTECODE=1',
                '--user', '1000:1000',
                '--volume', $hostWorkDir.':/app:rw',
                '--workdir', '/app',
                $language->docker_image,
                '/app/run.sh',
            ];

            $process = new Process($command);
            $process->setTimeout($this->timeout + 15);
            $process->setIdleTimeout($this->timeout + 15);
            $start = microtime(true);

            try {
                $process->run();
            } catch (ProcessTimedOutException) {
                $this->forceCleanup($execution->id);
                return $this->result('timeout', '', 'Execution timed out', null, round(microtime(true) - $start, 3));
            }

            $stdout = $process->getOutput();
            $stderr = $process->isTerminated() ? $process->getErrorOutput() : '';
            $exitCode = $process->getExitCode();
            $elapsed = round(microtime(true) - $start, 3);

            $stdout = mb_substr($stdout, 0, $this->outputLimit);
            $stderr = mb_substr($stderr, 0, $this->outputLimit);

            $status = $this->determineStatus($exitCode, $stderr);

            return [
                'status' => $status,
                'stdout' => $stdout,
                'stderr' => $stderr,
                'exit_code' => $exitCode,
                'execution_time' => $elapsed,
                'memory_usage' => null,
            ];
        } catch (\Throwable $e) {
            Log::error('Docker execution failed', [
                'execution_id' => $execution->id,
                'error' => $e->getMessage(),
            ]);
            $this->forceCleanup($execution->id);
            return $this->result('system_error', '', 'Docker execution failed', null);
        } finally {
            $this->cleanup($workDir);
        }
    }

    protected function writeRunnerScript(string $workDir, Language $language): void
    {
        $filename = $language->filename_template ?? 'main';
        $outputLimit = $this->outputLimit;
        $compileFlags = trim((string) $language->compile_flags);
        $compileFlags = $compileFlags === '' ? '' : ' '.$compileFlags;

        $script = "#!/bin/sh\n";
        $script .= "cd /app\n";

        if (! empty($language->compile_command)) {
            $script .= "{$language->compile_command} /app/{$filename}{$compileFlags} -o /tmp/main 2>/tmp/compile_errors.txt\n";
            $script .= "compile_rc=\$?\n";
            $script .= "if [ \$compile_rc -ne 0 ]; then\n";
            $script .= "  echo 'COMPILATION ERROR' >&2\n";
            $script .= "  head -c {$outputLimit} /tmp/compile_errors.txt >&2\n";
            $script .= "  exit \$compile_rc\n";
            $script .= "fi\n";
            $runCmd = '/tmp/main';
        } else {
            $runCmd = "{$language->run_command} /app/{$filename}";
            // Interpreted languages can still be syntax-checked before the run
            // (e.g. `python3 -m py_compile`) so errors show before execution.
            if (! empty($language->syntax_check_command)) {
                $script .= "{$language->syntax_check_command} /app/{$filename} 2>/tmp/syntax_errors.txt\n";
                $script .= "syntax_rc=\$?\n";
                $script .= "if [ \$syntax_rc -ne 0 ]; then\n";
                $script .= "  echo 'SYNTAX ERROR' >&2\n";
                $script .= "  head -c {$outputLimit} /tmp/syntax_errors.txt >&2\n";
                $script .= "  exit \$syntax_rc\n";
                $script .= "fi\n";
            }
        }

        $script .= "timeout {$this->timeout}s {$runCmd} < /app/stdin.txt > /tmp/stdout.txt 2>/tmp/runtime_stderr.txt\n";
        $script .= "run_rc=\$?\n";
        $script .= "head -c {$outputLimit} /tmp/stdout.txt\n";
        $script .= "if [ -s /tmp/runtime_stderr.txt ]; then\n";
        $script .= "  head -c {$outputLimit} /tmp/runtime_stderr.txt >&2\n";
        $script .= "fi\n";
        $script .= "exit \$run_rc\n";

        file_put_contents($workDir.'/run.sh', $script);
        chmod($workDir.'/run.sh', 0755);
    }

    protected function determineStatus(?int $exitCode, string $stderr): string
    {
        if ($exitCode === null) {
            return Execution::STATUS_TIMEOUT;
        }
        if (str_contains($stderr, 'COMPILATION ERROR') || str_contains($stderr, 'SYNTAX ERROR')) {
            return Execution::STATUS_COMPILE_ERROR;
        }
        if ($exitCode === 124) {
            return Execution::STATUS_TIMEOUT;
        }
        if ($exitCode === 137) {
            return Execution::STATUS_MEMORY_LIMIT;
        }
        if ($exitCode === 0) {
            return Execution::STATUS_SUCCESS;
        }
        return Execution::STATUS_RUNTIME_ERROR;
    }

    protected function createWorkDir(int $executionId): ?string
    {
        $dir = storage_path('app/executions/'.$executionId);
        if (! is_dir($dir)) {
            if (! mkdir($dir, 0755, true)) {
                return null;
            }
        }
        return $dir;
    }

    protected function writeSourceFile(string $workDir, Execution $execution, Language $language): void
    {
        $filename = $language->filename_template ?? 'main';
        file_put_contents($workDir.'/'.$filename, $execution->source_code);
    }

    protected function writeStdinFile(string $workDir, Execution $execution): void
    {
        file_put_contents($workDir.'/stdin.txt', $execution->stdin ?? '');
    }

    protected function forceCleanup(int $executionId): void
    {
        try {
            $process = new Process(['docker', 'rm', '-f', 'coderunner-'.$executionId]);
            $process->setTimeout(10);
            $process->run();
        } catch (\Throwable $e) {
            Log::warning('Container cleanup failed', ['execution_id' => $executionId]);
        }
        Log::warning('Forced container cleanup', ['execution_id' => $executionId]);
    }

    /**
     * Start an interactive execution: the sandbox container runs in the
     * background with its stdin connected to a named pipe (control.fifo).
     * Each line written into the fifo is forwarded to the running program,
     * so menu-driven programs can be answered line-by-line. Output streams
     * live into host-visible files (stdout.txt / stderr.txt).
     *
     * @return array<string, mixed>
     */
    public function startInteractive(Execution $execution, Language $language): array
    {
        $workDir = $this->createWorkDir($execution->id);
        if ($workDir === null) {
            return $this->result('system_error', '', 'Failed to create execution workspace', null, null, false);
        }

        try {
            // A fresh session: drop any files left by a previous interactive run,
            // but keep the directory itself (writeSourceFile needs it to exist).
            $this->clearWorkDir($workDir);
            $this->writeSourceFile($workDir, $execution, $language);
            if (! $this->createFifo($workDir.'/control.fifo')) {
                throw new \RuntimeException('Failed to create control fifo');
            }
            $this->writeInteractiveRunnerScript($workDir, $language);
            // The sandbox container runs as uid 1000 (like the batch path) but
            // writes its outputs back into /app (ready/stdout/stderr/rc.txt and
            // the control fifo). php-fpm runs as www-data and cannot chown to
            // 1000, so open the workdir up to world read/write instead.
            chmod($workDir, 0777);
            foreach (glob($workDir.'/*') ?: [] as $file) {
                $perm = str_ends_with($file, '/run.sh') ? 0777 : 0666;
                @chmod($file, $perm);
            }

            $hostWorkDir = $this->hostWorkDirPath($workDir);
            $command = [
                'docker', 'run', '-d', '--rm',
                '--name', 'coderunner-'.$execution->id,
                '--network', 'none',
                '--cpus', $this->cpuPercent(),
                '--memory', $this->memoryLimit,
                '--memory-swap', $this->memoryLimit,
                '--pids-limit', (string) $this->maxProcesses,
                '--read-only',
                '--cap-drop', 'ALL',
                '--security-opt', 'no-new-privileges',
                '--tmpfs', '/tmp:rw,size=128m,exec',
                '--env', 'HOME=/tmp',
                '--env', 'TMPDIR=/tmp',
                '--env', 'PYTHONDONTWRITEBYTECODE=1',
                '--user', '1000:1000',
                '--volume', $hostWorkDir.':/app:rw',
                '--workdir', '/app',
                $language->docker_image,
                '/app/run.sh',
            ];

            $this->forceCleanup($execution->id); // drop any orphan with the same name

            $process = new Process($command);
            $process->setTimeout(15);
            $process->run();
            if (! $process->isSuccessful()) {
                throw new \RuntimeException('Failed to start container: '.$process->getErrorOutput());
            }

            // Wait until the relay has opened the control fifo (ready marker),
            // so the first input line does not block waiting for a reader.
            $start = microtime(true);
            while (! is_file($workDir.'/ready.txt') && (microtime(true) - $start) < 20) {
                usleep(100000);
            }

            return $this->readSessionState($execution);
        } catch (\Throwable $e) {
            Log::error('Interactive start failed', [
                'execution_id' => $execution->id,
                'error' => $e->getMessage(),
            ]);
            $this->forceCleanup($execution->id);
            $this->cleanup($workDir);
            return $this->result('system_error', '', 'Failed to start interactive session', null, null, true);
        }
    }

    /**
     * Forward one line of input to a running interactive program.
     * Passing $close = true stops the session (kills the container) and
     * finalizes whatever output was produced.
     *
     * @return array<string, mixed>
     */
    public function provideInput(Execution $execution, ?string $line, bool $close): array
    {
        $workDir = storage_path('app/executions/'.$execution->id);
        $name = 'coderunner-'.$execution->id;

        if ($close) {
            // Capture the rc BEFORE the cleanup — readSessionState may delete
            // the workspace when it finalizes a stopped session.
            $rcBefore = trim((string) $this->readCappedFile($workDir.'/rc.txt'));
            $this->forceCleanup($execution->id);
            $result = $this->readSessionState($execution);
            if ($result['interactive_finished'] && ! is_numeric($rcBefore)) {
                // We stopped it before it had a chance to write its own rc.
                return $this->result(
                    Execution::STATUS_FAILED,
                    $result['stdout'],
                    $result['stderr'] !== '' ? $result['stderr'] : 'Session stopped',
                    null,
                    null,
                    true,
                );
            }
            return $result;
        }

        if ($this->isContainerRunning($name) && is_string($line)) {
            $payload = str_replace(["\r", "\n"], '', $line);
            $this->writeFifoLine($execution, $payload);
        }

        return $this->readSessionState($execution);
    }

    /**
     * Forward a line into the control fifo from INSIDE the container. Using
     * `docker exec` instead of opening the fifo from the host means a dead
     * container fails fast (and the open can't block a PHP request forever).
     * Base64 avoids any shell-quoting surprises in the user's line.
     */
    protected function writeFifoLine(Execution $execution, string $payload): void
    {
        $name = 'coderunner-'.$execution->id;
        $line = $payload."\n";
        $encoded = base64_encode($line);
        $inner = 'printf %s '.escapeshellarg($encoded).' | base64 -d > /app/control.fifo';
        $process = new Process(['docker', 'exec', '-i', $name, 'sh', '-c', $inner]);
        $process->setTimeout(5);
        try {
            $process->run();
        } catch (\Throwable) {
            // Container vanished mid-write — the session poll finalizes it.
        }
    }

    /**
     * Poll a live interactive session. Returns the current output and, once
     * the program has exited (rc.txt written), the final result.
     *
     * @return array<string, mixed>
     */
    public function pollInteractive(Execution $execution): array
    {
        return $this->readSessionState($execution);
    }

    /** Force-stop a live interactive session and free its workspace. */
    public function stopInteractive(int $executionId): void
    {
        $this->forceCleanup($executionId);
        $this->cleanup(storage_path('app/executions/'.$executionId));
    }

    /**
     * Read the current state of an interactive session from its host files.
     * An rc.txt that is a number means the program has finished.
     *
     * @return array<string, mixed>
     */
    protected function readSessionState(Execution $execution): array
    {
        // If a prior call (provideInput or poll) already finalized this session,
        // the workdir has been cleaned up. Return the persisted DB result
        // instead of re-reading deleted files, which would wrongly report
        // "Process terminated unexpectedly".
        if ($execution->status !== Execution::STATUS_QUEUED
            && $execution->status !== Execution::STATUS_RUNNING
        ) {
            return [
                'status' => $execution->status,
                'stdout' => $execution->stdout ?? '',
                'stderr' => $execution->stderr ?? '',
                'exit_code' => $execution->exit_code,
                'execution_time' => $execution->execution_time,
                'memory_usage' => $execution->memory_usage,
                'interactive_finished' => true,
            ];
        }

        $workDir = storage_path('app/executions/'.$execution->id);
        $stdout = $this->readCappedFile($workDir.'/stdout.txt');
        $stderr = $this->readCappedFile($workDir.'/stderr.txt');
        $rcRaw = trim($this->readCappedFile($workDir.'/rc.txt'));
        $timedOut = trim($this->readCappedFile($workDir.'/timedout.txt'));

        if ($rcRaw !== '' && is_numeric($rcRaw)) {
            return $this->finalize($workDir, (int) $rcRaw, $stdout, $stderr, $timedOut);
        }

        if (! $this->isContainerRunning('coderunner-'.$execution->id)) {
            // The runner writes rc.txt immediately before the container exits,
            // so the container can look "gone without rc" during that last
            // moment. Give the finalize a short grace window before declaring
            // the session dead.
            for ($i = 0; $i < 6; $i++) {
                usleep(150000);
                $rcRaw = trim($this->readCappedFile($workDir.'/rc.txt'));
                if ($rcRaw !== '' && is_numeric($rcRaw)) {
                    $stdout = $this->readCappedFile($workDir.'/stdout.txt');
                    $stderr = $this->readCappedFile($workDir.'/stderr.txt');
                    $timedOut = trim($this->readCappedFile($workDir.'/timedout.txt'));
                    return $this->finalize($workDir, (int) $rcRaw, $stdout, $stderr, $timedOut);
                }
            }
            // The container is gone without writing an rc.txt — an OOM kill, a
            // manual stop, or a daemon issue. Finalize so polling ends instead
            // of hanging on a session that no longer exists.
            $stderr = $stderr !== '' ? $stderr : 'Process terminated unexpectedly';
            $this->cleanup($workDir);

            return [
                'status' => Execution::STATUS_FAILED,
                'stdout' => $stdout,
                'stderr' => $stderr,
                'exit_code' => null,
                'execution_time' => null,
                'memory_usage' => null,
                'interactive_finished' => true,
            ];
        }

        return [
            'status' => Execution::STATUS_RUNNING,
            'stdout' => $stdout,
            'stderr' => $stderr,
            'exit_code' => null,
            'execution_time' => null,
            'memory_usage' => null,
            'interactive_finished' => false,
        ];
    }

    /** Build the finished-session result from an rc.txt value and clean up. */
    protected function finalize(string $workDir, int $rc, string $stdout, string $stderr, string $timedOut): array
    {
        $status = $this->determineStatus($rc, $stderr);
        if ($status === Execution::STATUS_MEMORY_LIMIT && $timedOut !== '') {
            // `timeout -s KILL` also exits 137 — distinguish it from an OOM kill.
            $status = Execution::STATUS_TIMEOUT;
        }
        $this->cleanup($workDir);

        return [
            'status' => $status,
            'stdout' => $stdout,
            'stderr' => $stderr,
            'exit_code' => $rc,
            'execution_time' => null,
            'memory_usage' => null,
            'interactive_finished' => true,
        ];
    }

    protected function writeInteractiveRunnerScript(string $workDir, Language $language): void
    {
        $filename = $language->filename_template ?? 'main';
        $outputLimit = $this->outputLimit;
        $timeout = (int) config('execution.interactive_timeout', 120);
        $compileFlags = trim((string) $language->compile_flags);
        $compileFlags = $compileFlags === '' ? '' : ' '.$compileFlags;

        $script = "#!/bin/sh\n";
        $script .= "cd /app\n";

        if (! empty($language->compile_command)) {
            $script .= "{$language->compile_command} /app/{$filename}{$compileFlags} -o /tmp/main 2>/tmp/compile_errors.txt\n";
            $script .= "compile_rc=\$?\n";
            $script .= "if [ \$compile_rc -ne 0 ]; then\n";
            $script .= "  {\n";
            $script .= "    echo 'COMPILATION ERROR'\n";
            $script .= "    head -c {$outputLimit} /tmp/compile_errors.txt\n";
            $script .= "  } > /app/stderr.txt\n";
            $script .= "  echo \$compile_rc > /app/rc.txt\n";
            $script .= "  exit \$compile_rc\n";
            $script .= "fi\n";
            $runCmd = '/tmp/main';
        } else {
            $runCmd = "{$language->run_command} /app/{$filename}";
            if (! empty($language->syntax_check_command)) {
                $script .= "{$language->syntax_check_command} /app/{$filename} 2>/tmp/syntax_errors.txt\n";
                $script .= "syntax_rc=\$?\n";
                $script .= "if [ \$syntax_rc -ne 0 ]; then\n";
                $script .= "  {\n";
                $script .= "    echo 'SYNTAX ERROR'\n";
                $script .= "    head -c {$outputLimit} /tmp/syntax_errors.txt\n";
                $script .= "  } > /app/stderr.txt\n";
                $script .= "  echo \$syntax_rc > /app/rc.txt\n";
                $script .= "  exit \$syntax_rc\n";
                $script .= "fi\n";
            }
        }

        // The program runs in the foreground so a natural exit ends the
        // container; a background relay forwards control-fifo lines into a
        // regular pipe that acts as the program's stdin (no PTY needed).
        $script .= "mkfifo /tmp/in\n";
        $script .= "exec 3<> /tmp/in\n";
        $script .= "exec 4<> /app/control.fifo\n";
        $script .= "printf ready > /app/ready.txt\n";
        $script .= "(\n";
        $script .= "  while IFS= read -r line <&4; do\n";
        $script .= "    [ \"\$line\" = \"__EOF__\" ] && break\n";
        $script .= "    printf '%s\\n' \"\$line\" >&3\n";
        $script .= "  done\n";
        $script .= ") &\n";
        $script .= "relay=\$!\n";
        $script .= "trap '' PIPE\n";
        $script .= "timeout -s KILL {$timeout}s stdbuf -o0 {$runCmd} < /tmp/in > /app/stdout.txt 2>/app/stderr.txt\n";
        $script .= "run_rc=\$?\n";
        $script .= "if [ \$run_rc -eq 137 ]; then echo 1 > /app/timedout.txt; fi\n";
        $script .= "kill \$relay 2>/dev/null\n";
        $script .= "exec 3>&-\n";
        $script .= "wait \$relay 2>/dev/null\n";
        $script .= "echo \$run_rc > /app/rc.txt\n";
        $script .= "exit 0\n";

        file_put_contents($workDir.'/run.sh', $script);
        chmod($workDir.'/run.sh', 0755);
    }

    protected function isContainerRunning(string $name): bool
    {
        try {
            $process = new Process(['docker', 'inspect', '-f', '{{.State.Running}}', $name]);
            $process->setTimeout(5);
            $process->run();
            return $process->isSuccessful() && trim($process->getOutput()) === 'true';
        } catch (\Throwable) {
            return false;
        }
    }

    protected function readCappedFile(string $path): string
    {
        if (! is_file($path)) {
            return '';
        }
        $content = @file_get_contents($path, false, null, 0, $this->outputLimit);
        return $content === false ? '' : $content;
    }

    /** The bind-mount path as seen from the host running the docker daemon. */
    protected function hostWorkDirPath(string $workDir): string
    {
        return config('execution.host_base', '')
            ? rtrim((string) config('execution.host_base'), '/').'/'.ltrim(str_replace(base_path(), '', $workDir), '/')
            : $workDir;
    }

    protected function cpuPercent(): string
    {
        $percent = (int) config('execution.cpu_percent', 50);
        return number_format($percent / 100, 2, '.', '');
    }

    protected function cleanup(string $workDir): void
    {
        if (is_dir($workDir)) {
            $files = glob($workDir.'/*') ?: [];
            foreach ($files as $file) {
                // Regular files, symlinks AND fifos all support unlink().
                @chmod($file, 0600);
                @unlink($file);
            }
            @rmdir($workDir);
        }
    }

    /** Remove stale files inside an existing workdir but keep the directory. */
    protected function clearWorkDir(string $workDir): void
    {
        if (! is_dir($workDir)) {
            return;
        }
        $files = glob($workDir.'/*') ?: [];
        foreach ($files as $file) {
            @chmod($file, 0600);
            @unlink($file);
        }
    }

    /** Create a named pipe (fifo) used as the interactive control channel. */
    protected function createFifo(string $path): bool
    {
        if (function_exists('posix_mkfifo')) {
            return posix_mkfifo($path, 0600);
        }
        $output = [];
        $exit = 1;
        @exec('mkfifo -m 600 '.escapeshellarg($path), $output, $exit);
        return $exit === 0;
    }

    protected function result(string $status, string $stdout, string $stderr, ?int $exitCode, ?float $time = null, bool $finish = false): array
    {
        return [
            'status' => $status,
            'stdout' => $stdout,
            'stderr' => $stderr,
            'exit_code' => $exitCode,
            'execution_time' => $time,
            'memory_usage' => null,
            'interactive_finished' => $finish,
        ];
    }
}