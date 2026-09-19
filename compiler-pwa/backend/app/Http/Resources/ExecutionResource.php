<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExecutionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'project_id' => $this->project_id,
            'project_slug' => $this->whenLoaded('project', fn () => $this->project?->slug),
            'file_id' => $this->file_id,
            'filename' => $this->whenLoaded('file', fn () => $this->file?->filename),
            'language_id' => $this->language_id,
            'status' => $this->status,
            'interactive' => $this->interactive,
            'interactive_finished' => $this->interactive_finished,
            'source_code' => $this->source_code,
            'stdin' => $this->stdin,
            'stdout' => $this->stdout,
            'stderr' => $this->stderr,
            'exit_code' => $this->exit_code,
            'execution_time' => $this->execution_time,
            'memory_usage' => $this->memory_usage,
            'truncated' => $this->truncated ?? false,
            'output_b64' => $this->output_b64 ?? null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'language' => new LanguageResource($this->whenLoaded('language')),
        ];
    }
}