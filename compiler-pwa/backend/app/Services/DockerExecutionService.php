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

            // The sandbox runs as uid 1000 while this workdir was created by the
            // worker (root): without opening the permissions up, the mounted /app
            // is read-only for the program and file I/O (fopen/fwrite/unlink) in
            // the working directory fails. Same tradeoff as the interactive path
            // below — the directory only ever holds this run's own files and is
            // removed immediately after execution.
            chmod($workDir, 0777);
            foreach (glob($workDir.'/*') ?: [] as $file) {
                $perm = str_ends_with($file, '/run.sh') ? 0755 : 0666;
                @chmod($file, $perm);
            }

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

            $stdoutRaw = $process->getOutput();
            $stderrRaw = $process->isTerminated() ? $process->getErrorOutput() : '';
            $exitCode = $process->getExitCode();
            $elapsed = round(microtime(true) - $start, 3);

            $stdout = mb_substr($stdoutRaw, 0, $this->outputLimit);
            $stderr = mb_substr($stderrRaw, 0, $this->outputLimit);
            $truncated = strlen($stdoutRaw) > $this->outputLimit || strlen($stderrRaw) > $this->outputLimit;

            $status = $this->determineStatus($exitCode, $stderr);

            return [
                'status' => $status,
                'stdout' => $stdout,
                'stderr' => $stderr,
                'exit_code' => $exitCode,
                'execution_time' => $elapsed,
                'memory_usage' => null,
                'truncated' => $truncated,
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
                '--env', 'PYTHONUNBUFFERED=1',
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
            // A compile/syntax error writes rc.txt and exits WITHOUT ever
            // writing ready.txt — break early so the real error is surfaced
            // (via readSessionState) instead of a 20s stall -> system_error.
            $start = microtime(true);
            while (! is_file($workDir.'/ready.txt') && (microtime(true) - $start) < 20) {
                $rcProbe = trim((string) $this->readCappedFile($workDir.'/rc.txt'));
                if ($rcProbe !== '' && is_numeric($rcProbe)) {
                    break;
                }
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
     * Forward raw terminal bytes (keystrokes) to a running interactive
     * program via the PTY's control fifo. The bytes go straight to the PTY
     * master, so the pty line discipline echoes them inline at the cursor and
     * Ctrl+C (\x03) becomes a real SIGINT to the program's process group.
     * Optional rows/cols resize the PTY. Passing $close = true stops the
     * session (kills the container) and finalizes whatever output remained.
     *
     * @return array<string, mixed>
     */
    public function provideInput(Execution $execution, ?string $line, ?string $chunk, bool $close, int $rows, int $cols): array
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
                // We stopped it before it had a chance to write its own rc —
                // always label this a user stop, never "terminated unexpectedly".
                return $this->result(
                    Execution::STATUS_STOPPED,
                    $result['stdout'],
                    'Session stopped',
                    null,
                    null,
                    true,
                    $result['truncated'] ?? false,
                );
            }
            return $result;
        }

        if ($this->isContainerRunning($name)) {
            $payload = '';
            if ($rows > 0 && $cols > 0) {
                $payload .= "\x1c".pack('V', $rows).pack('V', $cols);
            }
            if (is_string($chunk) && $chunk !== '') {
                $raw = base64_decode($chunk, true);
                if ($raw !== false) {
                    $payload .= $raw;
                }
            } elseif (is_string($line)) {
                // Legacy line input behaves like typing the text and pressing
                // Enter in the terminal.
                $payload .= str_replace(["\r", "\n"], '', $line)."\n";
            }
            if ($payload !== '') {
                $this->writeFifoChunk($execution, $payload);
            }
        }

        return $this->readSessionState($execution);
    }

    /**
     * Deliver a low-level signal (SIGINT for Ctrl+C) to the running program.
     * The recorded PID is the PTY child's process-group leader, so the signal
     * targets the whole group (the runner wrapper + the program itself).
     *
     * @return array<string, mixed>
     */
    public function signalInteractive(Execution $execution, string $signal): array
    {
        $allowed = [
            'SIGINT' => 'INT',
            'SIGTERM' => 'TERM',
            'SIGKILL' => 'KILL',
            'SIGHUP' => 'HUP',
            'SIGQUIT' => 'QUIT',
        ];
        $name = 'coderunner-'.$execution->id;

        if (isset($allowed[$signal])) {
            $workDir = storage_path('app/executions/'.$execution->id);
            $pid = trim($this->readCappedFile($workDir.'/pid.txt'));
            if (ctype_digit($pid) && $this->isContainerRunning($name)) {
                // NOTE: no `--` before the negative pgid — the sandbox's /bin/sh is
                // dash, which rejects `kill -INT -- -10` ("Illegal number: -").
                // `kill -INT -10` is valid in dash and busybox alike.
                $process = new Process(['docker', 'exec', $name, 'sh', '-c', 'kill -'.$allowed[$signal].' -'.$pid]);
                $process->setTimeout(5);
                try {
                    $process->run();
                } catch (\Throwable) {
                    // Container vanished mid-signal — the poll finalizes it.
                }
            }
        }

        return $this->readSessionState($execution);
    }

    /**
     * Forward a raw byte payload into the control fifo from INSIDE the
     * container. Using `docker exec` instead of opening the fifo from the
     * host means a dead container fails fast (and the open can't block a PHP
     * request forever). Base64 avoids any shell-quoting surprises in the
     * bytes (binary-safe — the pty stream may contain any byte value).
     */
    protected function writeFifoChunk(Execution $execution, string $raw): void
    {
        $name = 'coderunner-'.$execution->id;
        $encoded = base64_encode($raw);
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
                'truncated' => false,
                'output_b64' => base64_encode($execution->stdout ?? ''),
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
            $truncated = $this->isTruncatedWorkDir($workDir);
            $this->cleanup($workDir);

            return [
                'status' => Execution::STATUS_FAILED,
                'stdout' => $stdout,
                'stderr' => $stderr,
                'exit_code' => null,
                'execution_time' => null,
                'memory_usage' => null,
                'interactive_finished' => true,
                'truncated' => $truncated,
                'output_b64' => base64_encode($stdout),
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
            'truncated' => $this->isTruncatedWorkDir($workDir),
            'output_b64' => base64_encode($stdout),
        ];
    }

    /** Build the finished-session result from an rc.txt value and clean up. */
    protected function finalize(string $workDir, int $rc, string $stdout, string $stderr, string $timedOut): array
    {
        $status = $this->determineStatus($rc, $stderr);
        // Exit 130 = terminated by SIGINT (Ctrl+C) — an intentional stop,
        // not a runtime error.
        if ($rc === 130 && $timedOut === '') {
            $status = Execution::STATUS_STOPPED;
        }
        if ($status === Execution::STATUS_MEMORY_LIMIT && $timedOut !== '') {
            // `timeout -s KILL` also exits 137 — distinguish it from an OOM kill.
            $status = Execution::STATUS_TIMEOUT;
        }
        $truncated = $this->isTruncatedWorkDir($workDir);
        $this->cleanup($workDir);

        return [
            'status' => $status,
            'stdout' => $stdout,
            'stderr' => $stderr,
            'exit_code' => $rc,
            'execution_time' => null,
            'memory_usage' => null,
            'interactive_finished' => true,
            'truncated' => $truncated,
            'output_b64' => base64_encode($stdout),
        ];
    }

    /**
     * Build the interactive runner. The program is attached to a real
     * pseudo-terminal (written by pbridge.py) so key presses echo inline at
     * the prompt, ANSI fades through, and Ctrl+C is delivered by the PTY's
     * line discipline exactly like a shell. The control fifo carries raw
     * terminal bytes; pbridge relays them into the PTY master and streams
     * the master output (stdout + stderr + echo, merged like a real
     * terminal) into stdout.txt.
     */
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

        // ready.txt is only a "container is booting the session" marker now —
        // pbridge opens the fifo O_RDWR so input writers never block.
        $script .= "printf ready > /app/ready.txt\n";
        $script .= "timeout -s KILL {$timeout}s python3 -u /app/pbridge.py --cmd '{$runCmd}' --in /app/control.fifo --out /app/stdout.txt --pid /app/pid.txt --rows 24 --cols 80 --max {$outputLimit}\n";
        $script .= "run_rc=\$?\n";
        $script .= "if [ \$run_rc -eq 137 ]; then echo 1 > /app/timedout.txt; fi\n";
        $script .= "echo \$run_rc > /app/rc.txt\n";
        $script .= "exit 0\n";

        file_put_contents($workDir.'/run.sh', $script);
        file_put_contents($workDir.'/pbridge.py', $this->ptyBridgeSource());
        chmod($workDir.'/run.sh', 0755);
        chmod($workDir.'/pbridge.py', 0755);
    }

    /**
     *  The PTY relay script embedded next to run.sh. Runs a command attached
     *  to a pseudo-terminal, relays raw bytes from the control fifo into the
     *  PTY master, and streams the master output to /app/stdout.txt.
     *  A 9-byte control packet starting with 0x1c (rows + cols, LE32 each)
     *  resizes the PTY; everything else is forwarded verbatim as keystrokes.
     */
    protected function ptyBridgeSource(): string
    {
        return <<<'PY'
#!/usr/bin/env python3
"""PTY bridge: attach a command to a pseudo-terminal and relay bytes."""
import fcntl
import os
import select
import signal
import struct
import sys
import termios

RS = b'\x1c'  # control-packet sentinel (File Separator)


def arg(name, default=None):
    try:
        index = sys.argv.index(name)
    except ValueError:
        return default
    if index + 1 < len(sys.argv):
        return sys.argv[index + 1]
    return default


cmd = arg('--cmd', '')
inpipe = arg('--in', '/app/control.fifo')
outfile = arg('--out', '/app/stdout.txt')
pidfile = arg('--pid', '/app/pid.txt')
rows = int(arg('--rows', '0') or 0)
cols = int(arg('--cols', '0') or 0)
max_bytes = int(arg('--max', '0') or 0)

master, slave = os.openpty()

attrs = termios.tcgetattr(slave)
# IUTF8 is Linux-specific and missing from some Python builds — guard it.
attrs[0] = termios.IXON | termios.ICRNL | getattr(termios, 'IUTF8', 0)
attrs[1] = termios.OPOST | termios.ONLCR
# 8-bit chars + receiver enabled + ignore modem control (safe pty cflags).
attrs[2] = termios.CS8 | termios.CREAD | termios.CLOCAL
# Real interactive editor: ECHO with ECHOE/ECHOK/ECHOCTL so Backspace erases
# on screen (ECHOE echoes "\b \b" instead of a stray DEL byte) and Ctrl+C
# prints as ^C. Without ECHOE the line buffer DOES erase but the typed text
# never visually disappears — the "can't backspace" symptom.
attrs[3] = (termios.ECHO | termios.ECHOE | termios.ECHOK | termios.ICANON
            | termios.ISIG | termios.IEXTEN
            | getattr(termios, 'ECHOCTL', 0) | getattr(termios, 'ECHOKE', 0))
# Backspace key: xterm.js sends DEL (0x7f). Make it the explicit erase char.
attrs[6][termios.VERASE] = 0x7f
termios.tcsetattr(slave, termios.TCSANOW, attrs)

# Only the master is non-blocking (per-open-file-description): the child's
# slave stays blocking, so normal reads keep working, while big pastes cannot
# wedge the bridge on a full pty input buffer.
os.set_blocking(master, False)

if 0 < rows <= 1000 and 0 < cols <= 5000 and (rows or cols):
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))

child = os.fork()
if child == 0:
    os.setsid()
    fcntl.ioctl(slave, termios.TIOCSCTTY, 0)
    os.dup2(slave, 0)
    os.dup2(slave, 1)
    os.dup2(slave, 2)
    if slave > 2:
        os.close(slave)
    os.close(master)
    # `exec` makes the program itself the session/process-group leader, so a
    # SIGINT raised by Ctrl+C hits exactly the program (and its children) —
    # never the sh wrapper, which would otherwise report an extra death.
    os.execvp('/bin/sh', ['sh', '-c', 'exec ' + cmd])
    os._exit(127)

os.close(slave)
try:
    open(pidfile, 'w').write(str(child))
except OSError:
    pass

# Open the fifo read+write so host-side writers never block on a missing
# reader, even in the brief window after the program has exited.
try:
    infd = os.open(inpipe, os.O_RDWR | os.O_NONBLOCK)
except OSError:
    infd = -1

out = os.fdopen(os.open(outfile, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644), 'wb', buffering=0)


def kill_child(_signum=None, _frame=None):
    try:
        os.killpg(child, signal.SIGKILL)
    except OSError:
        pass


signal.signal(signal.SIGTERM, kill_child)
signal.signal(signal.SIGINT, kill_child)


def write_bytes(fd, data):
    # Some clients/platforms send plain BS (^H, 0x08) for Backspace instead of
    # DEL (0x7f). Normalize it to DEL so the pty's canonical erase always fires.
    data = data.replace(b'\x08', b'\x7f')
    while data:
        try:
            written = os.write(fd, data)
        except BlockingIOError:
            select.select([], [fd], [])
            continue
        except OSError:
            return
        data = data[written:]


def mark_truncated():
    global truncated_flag
    if truncated_flag:
        return
    truncated_flag = True
    try:
        open('/app/truncated.txt', 'w').write('1')
    except OSError:
        pass


def drain_master():
    global written
    try:
        data = os.read(master, 65536)
    except OSError:
        return False
    if not data:
        return False
    if written >= max_bytes:
        mark_truncated()
    else:
        room = max_bytes - written
        out.write(data[:room])
        written += len(data[:room])
        if len(data) > room:
            mark_truncated()
    return True


buf = b''
written = 0
truncated_flag = False
status = None
while status is None:
    fds = [master]
    if infd >= 0:
        fds.append(infd)
    ready, _, _ = select.select(fds, [], [])
    if infd >= 0 and infd in ready:
        try:
            buf += os.read(infd, 65536)
        except OSError:
            pass
        while True:
            if buf[:1] == RS:
                if len(buf) < 9:
                    break
                rows_n, cols_n = struct.unpack('<II', buf[1:9])
                try:
                    fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack('HHHH', rows_n, cols_n, 0, 0))
                except OSError:
                    pass
                buf = buf[9:]
                continue
            marker = buf.find(RS)
            if marker < 0:
                break
            write_bytes(master, buf[:marker])
            buf = buf[marker:]
        if buf and buf[:1] != RS:
            write_bytes(master, buf)
            buf = b''
    if master in ready:
        drain_master()
    try:
        waited, st = os.waitpid(child, os.WNOHANG)
    except OSError:
        break
    if waited == child:
        status = st

# The child may have a few buffered bytes still in the pty after it exits —
# keep draining (bounded) so the very last output is not lost.
while True:
    ready, _, _ = select.select([master], [], [], 0.15)
    if not ready:
        break
    if not drain_master():
        break
out.close()

if status is None:
    code = 137
elif os.WIFEXITED(status):
    code = os.WEXITSTATUS(status)
elif os.WIFSIGNALED(status):
    code = 128 + os.WTERMSIG(status)
else:
    code = 137
sys.exit(code)
PY;
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

    /** True when stdout/stderr hit the output cap during this session. */
    protected function isTruncatedWorkDir(string $workDir): bool
    {
        foreach (['stdout.txt', 'stderr.txt'] as $file) {
            $path = $workDir.'/'.$file;
            if (is_file($path) && @filesize($path) > $this->outputLimit) {
                return true;
            }
        }
        // The pbridge stops writing at the cap and drops the marker file, so a
        // file that is exactly at the cap still reports truncated.
        return is_file($workDir.'/truncated.txt');
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

    protected function result(string $status, string $stdout, string $stderr, ?int $exitCode, ?float $time = null, bool $finish = false, bool $truncated = false): array
    {
        return [
            'status' => $status,
            'stdout' => $stdout,
            'stderr' => $stderr,
            'exit_code' => $exitCode,
            'execution_time' => $time,
            'memory_usage' => null,
            'interactive_finished' => $finish,
            'truncated' => $truncated,
            'output_b64' => base64_encode(substr($stdout, 0, $this->outputLimit)),
        ];
    }
}