<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;

class ProjectController extends Controller
{
    public function index(): JsonResponse
    {
        $projects = auth()->user()->projects()
            ->with('files')
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Projects retrieved successfully',
            'data' => ProjectResource::collection($projects)->response()->getData(true),
        ]);
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $project = auth()->user()->projects()->create([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Project created successfully',
            'data' => new ProjectResource($project->load('files')),
        ], 201);
    }

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json([
            'success' => true,
            'message' => 'Project retrieved successfully',
            'data' => new ProjectResource($project->load('files')),
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $project->update([
            'name' => $request->name ?? $project->name,
            'description' => $request->has('description') ? $request->description : $project->description,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Project updated successfully',
            'data' => new ProjectResource($project->load('files')),
        ]);
    }

    public function destroy(Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Project deleted successfully',
            'data' => null,
        ]);
    }
}