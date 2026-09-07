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

        $script = "#!/bin/sh\n";
        $script .= "cd /app\n";

        if (! empty($language->compile_command)) {
            $script .= "{$language->compile_command} /app/{$filename} -o /tmp/main 2>/tmp/compile_errors.txt\n";
            $script .= "compile_rc=\$?\n";
            $script .= "if [ \$compile_rc -ne 0 ]; then\n";
            $script .= "  echo 'COMPILATION ERROR' >&2\n";
            $script .= "  head -c {$outputLimit} /tmp/compile_errors.txt >&2\n";
            $script .= "  exit \$compile_rc\n";
            $script .= "fi\n";
            $runCmd = '/tmp/main';
        } else {
            $runCmd = "{$language->run_command} /app/{$filename}";
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
        if (str_contains($stderr, 'COMPILATION ERROR')) {
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

    protected function cleanup(string $workDir): void
    {
        if (is_dir($workDir)) {
            $files = glob($workDir.'/*') ?: [];
            foreach ($files as $file) {
                if (is_file($file) || is_link($file)) {
                    @unlink($file);
                }
            }
            @rmdir($workDir);
        }
    }

    protected function result(string $status, string $stdout, string $stderr, ?int $exitCode, ?float $time = null): array
    {
        return [
            'status' => $status,
            'stdout' => $stdout,
            'stderr' => $stderr,
            'exit_code' => $exitCode,
            'execution_time' => $time,
            'memory_usage' => null,
        ];
    }
}