<?php

namespace App\Services;

use App\Models\Execution;
use App\Models\Language;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class ExecutionService
{
    protected DockerExecutionService $dockerService;

    public function __construct(DockerExecutionService $dockerService)
    {
        $this->dockerService = $dockerService;
    }

    /**
     * Create a queued execution and dispatch it to the queue.
     */
    public function queueExecution(User $user, array $data): Execution
    {
        $language = Language::where('slug', $data['language'])->where('is_active', true)->firstOrFail();

        $execution = $user->executions()->create([
            'project_id' => $data['project_id'] ?? null,
            'file_id' => $data['file_id'] ?? null,
            'language_id' => $language->id,
            'status' => Execution::STATUS_QUEUED,
            'interactive' => $data['interactive'] ?? false,
            'source_code' => $data['code'],
            'stdin' => $data['stdin'] ?? '',
            'stdout' => '',
            'stderr' => '',
        ]);

        Log::info('Execution created', ['execution_id' => $execution->id]);

        return $execution;
    }

    /**
     * Apply a live (or finalized) result from an interactive sandbox session
     * to the execution record. Called after each input line and poll.
     */
    public function applyInteractiveResult(Execution $execution, array $result): void
    {
        $execution->update([
            'status' => $result['status'],
            'stdout' => $result['stdout'] ?? '',
            'stderr' => $result['stderr'] ?? '',
            'exit_code' => $result['exit_code'],
            'execution_time' => $result['execution_time'],
        ]);
        // Transient flag the resource exposes so callers stop polling when done.
        $execution->interactive_finished = $result['interactive_finished'] ?? false;
    }

    /**
     * Run execution in the sandbox and update the record.
     */
    public function run(Execution $execution): Execution
    {
        $execution->update(['status' => Execution::STATUS_RUNNING]);
        Log::info('Execution started', ['execution_id' => $execution->id]);

        $language = $execution->language;
        if (! $language) {
            $execution->update([
                'status' => Execution::STATUS_FAILED,
                'stderr' => 'Language configuration not found',
            ]);
            return $execution;
        }

        try {
            $result = $this->dockerService->execute($execution, $language);

            $execution->update([
                'status' => $result['status'],
                'stdout' => $result['stdout'] ?? '',
                'stderr' => $result['stderr'] ?? '',
                'exit_code' => $result['exit_code'],
                'execution_time' => $result['execution_time'],
                'memory_usage' => $result['memory_usage'],
            ]);

            Log::info('Execution completed', [
                'execution_id' => $execution->id,
                'status' => $result['status'],
            ]);
        } catch (\Throwable $e) {
            $execution->update([
                'status' => Execution::STATUS_SYSTEM_ERROR,
                'stderr' => 'Internal execution error',
            ]);
            Log::error('Execution failed', [
                'execution_id' => $execution->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $execution;
    }
}