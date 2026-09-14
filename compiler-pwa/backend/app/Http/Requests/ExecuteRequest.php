<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExecuteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'language' => ['required', 'string', 'exists:languages,slug,is_active,1'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'file_id' => ['nullable', 'integer', 'exists:files,id'],
            'code' => ['required', 'string', 'max:5242880'],
            'stdin' => ['nullable', 'string', 'max:5242880'],
            'interactive' => ['sometimes', 'boolean'],
        ];
    }
}