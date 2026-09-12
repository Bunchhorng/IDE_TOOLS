<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFolderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var \App\Models\Folder|null $folder */
        $folder = $this->route('folder');
        $projectId = $folder ? $folder->project_id : null;
        $parentId = $this->input('parent_id');

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'regex:/^[^\/]+$/',
                Rule::unique('folders', 'name')
                    ->where(function ($query) use ($projectId, $parentId, $folder) {
                        $query->where('project_id', $projectId);
                        $parentId
                            ? $query->where('parent_id', $parentId)
                            : $query->whereNull('parent_id');
                    })
                    ->ignore($folder?->id),
            ],
            'parent_id' => [
                'nullable',
                'integer',
                'exists:folders,id',
            ],
        ];
    }

    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator) {
            /** @var \App\Models\Folder $folder */
            $folder = $this->route('folder');

            $projectId = $folder->project_id;
            $parentId = $this->input('parent_id');

            if ($parentId === null || $parentId === $folder->id) {
                return;
            }

            $parent = \App\Models\Folder::find($parentId);

            if (! $parent || $parent->project_id !== $projectId) {
                $validator->errors()->add('parent_id', 'The parent folder does not belong to this project.');

                return;
            }

            // Reject cycles: the new parent must not be the folder itself or one
            // of its descendants (moving a folder under its own subtree).
            $ancestor = $parent;
            while ($ancestor) {
                if ($ancestor->id === $folder->id) {
                    $validator->errors()->add('parent_id', 'A folder cannot be moved inside itself.');

                    return;
                }
                $ancestor = $ancestor->parent;
            }
        });
    }
}