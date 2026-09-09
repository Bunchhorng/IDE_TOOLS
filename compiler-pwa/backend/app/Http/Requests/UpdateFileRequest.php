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
}