<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $file = $this->route('file');
        $projectId = $file ? $file->project_id : null;

        return [
            'folder_id' => [
                'nullable',
                'integer',
                'exists:folders,id',
            ],
            'filename' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'regex:/^[a-zA-Z0-9][a-zA-Z0-9_.\-]*$/',
                Rule::unique('files', 'filename')
                    ->where('project_id', $projectId)
                    ->ignore($file?->id),
            ],
            'language' => ['sometimes', 'required', 'string', 'max:20', Rule::exists('languages', 'slug')],
            'content' => ['sometimes', 'nullable', 'string', 'max:5242880'],
        ];
    }

    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator) {
            $folderId = $this->input('folder_id');
            if (! $folderId) {
                return;
            }

            $file = $this->route('file');
            $projectId = $file ? $file->project_id : null;
            $folder = \App\Models\Folder::find($folderId);

            if (! $folder || $folder->project_id !== $projectId) {
                $validator->errors()->add('folder_id', 'The folder does not belong to this project.');
            }
        });
    }
}