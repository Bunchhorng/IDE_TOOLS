<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LanguageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'version' => $this->version,
            'docker_image' => $this->docker_image,
            'compile_command' => $this->compile_command,
            'run_command' => $this->run_command,
            'filename_template' => $this->filename_template,
            'is_active' => $this->is_active,
        ];
    }
}