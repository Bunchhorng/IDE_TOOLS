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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class ExecutionController extends Controller
{
    protected ExecutionService $service;

    public function __construct(ExecutionService $service)
    {
        $this->service = $service;
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

        // Verify ownership when project/file provided
        if ($request->project_id) {
            $project = Project::where('id', $request->project_id)->first();
            if (! $project || $project->user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Project not found or you do not have permission.',
                    'data' => null,
                ], 403);
            }

            if ($request->file_id) {
                $file = File::where('id', $request->file_id)->where('project_id', $project->id)->first();
                if (! $file) {
                    return response()->json([
                        'success' => false,
                        'message' => 'File not found in this project.',
                        'data' => null,
                    ], 404);
                }
            }
        }

        $execution = $this->service->queueExecution($user, $request->validated());

        ExecuteJob::dispatch($execution);

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

        $execution->delete();

        return response()->json([
            'success' => true,
            'message' => 'Execution deleted successfully',
            'data' => null,
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