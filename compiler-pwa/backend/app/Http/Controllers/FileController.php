<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFileRequest;
use App\Http\Requests\UpdateFileRequest;
use App\Http\Resources\FileResource;
use App\Models\File;
use App\Models\Project;
use Illuminate\Http\JsonResponse;

class FileController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $files = $project->files()->latest()->get();

        return response()->json([
            'success' => true,
            'message' => 'Files retrieved successfully',
            'data' => FileResource::collection($files),
        ]);
    }

    public function store(StoreFileRequest $request, Project $project): JsonResponse
    {
        $this->authorize('create', $project);

        $file = $project->files()->create([
            'folder_id' => $request->folder_id,
            'filename' => $request->filename,
            'language' => $request->language,
            'content' => $request->content ?? '',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'File created successfully',
            'data' => new FileResource($file),
        ], 201);
    }

    public function show(File $file): JsonResponse
    {
        $this->authorize('view', $file);

        return response()->json([
            'success' => true,
            'message' => 'File retrieved successfully',
            'data' => new FileResource($file),
        ]);
    }

    public function update(UpdateFileRequest $request, File $file): JsonResponse
    {
        $this->authorize('update', $file);

        $file->update($request->only(['folder_id', 'filename', 'language', 'content']));

        return response()->json([
            'success' => true,
            'message' => 'File updated successfully',
            'data' => new FileResource($file->fresh()),
        ]);
    }

    public function destroy(File $file): JsonResponse
    {
        $this->authorize('delete', $file);

        $file->delete();

        return response()->json([
            'success' => true,
            'message' => 'File deleted successfully',
            'data' => null,
        ]);
    }
}