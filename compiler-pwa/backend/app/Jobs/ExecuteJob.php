<?php

namespace App\Jobs;

use App\Models\Execution;
use App\Services\ExecutionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ExecuteJob implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 60;
    public int $tries = 1;

    public function __construct(
        public Execution $execution
    ) {}

    public function handle(ExecutionService $service): void
    {
        $service->run($this->execution);
    }

    public function failed(\Throwable $e): void
    {
        $this->execution->update([
            'status' => Execution::STATUS_FAILED,
            'stderr' => 'Queued job failed',
        ]);
    }
}