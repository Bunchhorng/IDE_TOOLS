<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFolderRequest;
use App\Http\Requests\UpdateFolderRequest;
use App\Http\Resources\FolderResource;
use App\Models\Folder;
use App\Models\Project;
use Illuminate\Http\JsonResponse;

class FolderController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $folders = $project->folders()->latest()->get();

        return response()->json([
            'success' => true,
            'message' => 'Folders retrieved successfully',
            'data' => FolderResource::collection($folders),
        ]);
    }

    public function store(StoreFolderRequest $request, Project $project): JsonResponse
    {
        $this->authorize('create', $project);

        $folder = $project->folders()->create([
            'parent_id' => $request->parent_id,
            'name' => $request->name,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Folder created successfully',
            'data' => new FolderResource($folder),
        ], 201);
    }

    public function show(Folder $folder): JsonResponse
    {
        $this->authorize('view', $folder);

        return response()->json([
            'success' => true,
            'message' => 'Folder retrieved successfully',
            'data' => new FolderResource($folder),
        ]);
    }

    public function update(UpdateFolderRequest $request, Folder $folder): JsonResponse
    {
        $this->authorize('update', $folder);

        $data = [];
        if ($request->has('name')) {
            $data['name'] = $request->name;
        }
        if ($request->has('parent_id')) {
            $data['parent_id'] = $request->parent_id;
        }

        $folder->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Folder updated successfully',
            'data' => new FolderResource($folder->fresh()),
        ]);
    }

    public function destroy(Folder $folder): JsonResponse
    {
        $this->authorize('delete', $folder);

        // Deleting a folder cascades to its subfolders and their files.
        $folder->delete();

        return response()->json([
            'success' => true,
            'message' => 'Folder deleted successfully',
            'data' => null,
        ]);
    }
}