<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFolderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = optional($this->route('project'))->id ?? $this->route('project');
        $parentId = $this->input('parent_id');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                'regex:/^[^\/]+$/',
                Rule::unique('folders', 'name')
                    ->where(function ($query) use ($projectId, $parentId) {
                        $query->where('project_id', $projectId);
                        $parentId
                            ? $query->where('parent_id', $parentId)
                            : $query->whereNull('parent_id');
                    }),
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
            $parentId = $this->input('parent_id');
            if (! $parentId) {
                return;
            }

            $projectId = optional($this->route('project'))->id ?? $this->route('project');
            $parent = \App\Models\Folder::find($parentId);

            if (! $parent || $parent->project_id !== $projectId) {
                $validator->errors()->add('parent_id', 'The parent folder does not belong to this project.');
            }
        });
    }
}