<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = optional($this->route('project'))->id ?? $this->route('project');

        return [
            'folder_id' => [
                'nullable',
                'integer',
                'exists:folders,id',
            ],
            'filename' => [
                'required',
                'string',
                'max:255',
                'regex:/^(?!\.+$)[a-zA-Z0-9_.\-]+$/',
                Rule::unique('files', 'filename')->where('project_id', $projectId),
            ],
            'language' => ['required', 'string', 'max:20', Rule::exists('languages', 'slug')],
            'content' => ['nullable', 'string', 'max:5242880'],
        ];
    }

    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator) {
            $folderId = $this->input('folder_id');
            if (! $folderId) {
                return;
            }

            $projectId = optional($this->route('project'))->id ?? $this->route('project');
            $folder = \App\Models\Folder::find($folderId);

            if (! $folder || $folder->project_id !== $projectId) {
                $validator->errors()->add('folder_id', 'The folder does not belong to this project.');
            }
        });
    }
}