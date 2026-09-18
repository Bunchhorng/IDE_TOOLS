<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Jobs\ExecuteJob;
use App\Http\Requests\ExecuteRequest;
use App\Http\Resources\ExecutionResource;
use App\Models\Execution;
use App\Models\Language;
use App\Models\Project;
use App\Models\File;
use App\Services\ExecutionService;
use App\Services\DockerExecutionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class ExecutionController extends Controller
{
    protected ExecutionService $service;
    protected DockerExecutionService $dockerService;

    public function __construct(ExecutionService $service, DockerExecutionService $dockerService)
    {
        $this->service = $service;
        $this->dockerService = $dockerService;
    }

    public function store(ExecuteRequest $request): JsonResponse
    {
        $user = $request->user();

        // Per-user rate limiting
        if (! $this->checkRateLimit($user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Rate limit exceeded. Please try again later.',
                'data' => null,
            ], 429);
        }

        // Verify ownership of the referenced project
        if ($request->project_id) {
            $project = Project::where('id', $request->project_id)->first();
            if (! $project || $project->user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Project not found or you do not have permission.',
                    'data' => null,
                ], 403);
            }
        }

        // Verify the referenced file belongs to the current user and (when both given) the project
        if ($request->file_id) {
            $file = File::where('id', $request->file_id)->first();
            if (! $file || $file->project->user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'File not found or you do not have permission.',
                    'data' => null,
                ], 403);
            }

            if ($request->project_id && (int) $file->project_id !== (int) $request->project_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'File not found in this project.',
                    'data' => null,
                ], 404);
            }
        }

        $execution = $this->service->queueExecution($user, $request->validated());

        // Interactive sessions are started on demand (POST .../interactive/start),
        // not through the queue — the sandbox stays alive waiting for input.
        if (! $request->boolean('interactive')) {
            ExecuteJob::dispatch($execution);
        }

        return response()->json([
            'success' => true,
            'message' => 'Execution queued',
            'data' => new ExecutionResource($execution),
        ], 201);
    }

    public function show(Execution $execution): JsonResponse
    {
        $this->authorize('view', $execution);

        return response()->json([
            'success' => true,
            'message' => 'Execution retrieved successfully',
            'data' => new ExecutionResource($execution->load('language')),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $perPage = $request->integer('per_page', 20);

        $executions = auth()->user()->executions()
            ->with(['language', 'file:id,id,filename'])
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Executions retrieved successfully',
            'data' => ExecutionResource::collection($executions)->response()->getData(true),
        ]);
    }

    public function destroy(Execution $execution): JsonResponse
    {
        $this->authorize('delete', $execution);

        // Stop any live interactive sandbox before deleting the record.
        if ($execution->interactive) {
            $this->dockerService->stopInteractive($execution->id);
        }

        $execution->delete();

        return response()->json([
            'success' => true,
            'message' => 'Execution deleted successfully',
            'data' => null,
        ]);
    }

    public function destroyAll(): JsonResponse
    {
        $user = auth()->user();

        // Stop any live interactive sandboxes before clearing the history.
        $user->executions()->where('interactive', true)->get()->each(function (Execution $execution) {
            $this->dockerService->stopInteractive($execution->id);
        });

        $deleted = $user->executions()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Execution history cleared successfully',
            'data' => ['deleted' => $deleted],
        ]);
    }

    /** Start the sandbox container for a queued interactive execution. */
    public function startInteractive(Execution $execution): JsonResponse
    {
        $this->authorize('view', $execution);

        $language = $execution->language;
        if (! $language) {
            return response()->json([
                'success' => false,
                'message' => 'Language configuration not found',
                'data' => null,
            ], 422);
        }

        $result = $this->dockerService->startInteractive($execution, $language);
        $this->service->applyInteractiveResult($execution, $result);

        return response()->json([
            'success' => true,
            'message' => 'Interactive session started',
            'data' => new ExecutionResource($execution),
        ]);
    }

    /** Forward raw terminal bytes (or legacy line input), resize the PTY, or stop the session. */
    public function provideInput(Execution $execution, Request $request): JsonResponse
    {
        $this->authorize('view', $execution);

        $request->validate([
            'line' => ['nullable', 'string', 'max:1000000'],
            'chunk' => ['nullable', 'string', 'max:1400000'],
            'rows' => ['nullable', 'integer', 'between:1,1000'],
            'cols' => ['nullable', 'integer', 'between:1,5000'],
            'close' => ['sometimes', 'boolean'],
        ]);

        $result = $this->dockerService->provideInput(
            $execution,
            $request->input('line'),
            $request->input('chunk'),
            $request->boolean('close', false),
            $request->integer('rows', 0),
            $request->integer('cols', 0),
        );
        $this->service->applyInteractiveResult($execution, $result);

        return response()->json([
            'success' => true,
            'message' => 'Input delivered',
            'data' => new ExecutionResource($execution),
        ]);
    }

    /** Live poll: current output while running, final result once it exits. */
    public function pollInteractive(Execution $execution): JsonResponse
    {
        $this->authorize('view', $execution);

        $result = $this->dockerService->pollInteractive($execution);
        $this->service->applyInteractiveResult($execution, $result);

        return response()->json([
            'success' => true,
            'message' => 'Interactive session polled',
            'data' => new ExecutionResource($execution),
        ]);
    }

    /** Deliver a low-level signal (SIGINT = Ctrl+C) to the running program. */
    public function signalInteractive(Execution $execution, Request $request): JsonResponse
    {
        $this->authorize('view', $execution);

        $request->validate([
            'signal' => ['required', 'string', 'in:SIGINT,SIGTERM,SIGKILL'],
        ]);

        $result = $this->dockerService->signalInteractive($execution, $request->string('signal'));
        $this->service->applyInteractiveResult($execution, $result);

        return response()->json([
            'success' => true,
            'message' => 'Signal delivered',
            'data' => new ExecutionResource($execution),
        ]);
    }

    protected function checkRateLimit(int $userId): bool
    {
        $perMinute = (int) config('execution.rate_per_minute', 5);
        $perHour = (int) config('execution.rate_per_hour', 50);

        if (! RateLimiter::attempt('executions:user:'.$userId.':minute', $perMinute, fn () => true, 60)) {
            return false;
        }

        if (! RateLimiter::attempt('executions:user:'.$userId.':hour', $perHour, fn () => true, 3600)) {
            return false;
        }

        return true;
    }
}