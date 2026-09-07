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
            'filename' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-zA-Z0-9][a-zA-Z0-9_.\-]*$/',
                Rule::unique('files', 'filename')->where('project_id', $projectId),
            ],
            'language' => ['required', 'string', 'max:20', Rule::exists('languages', 'slug')],
            'content' => ['nullable', 'string', 'max:5242880'],
        ];
    }
}