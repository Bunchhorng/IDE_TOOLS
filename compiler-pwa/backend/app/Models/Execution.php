<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Execution extends Model
{
    use HasFactory;

    public const STATUS_QUEUED = 'queued';
    public const STATUS_RUNNING = 'running';
    public const STATUS_SUCCESS = 'success';
    public const STATUS_COMPILE_ERROR = 'compile_error';
    public const STATUS_RUNTIME_ERROR = 'runtime_error';
    public const STATUS_TIMEOUT = 'timeout';
    public const STATUS_MEMORY_LIMIT = 'memory_limit';
    public const STATUS_SYSTEM_ERROR = 'system_error';
    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'user_id',
        'project_id',
        'file_id',
        'language_id',
        'status',
        'source_code',
        'stdin',
        'stdout',
        'stderr',
        'exit_code',
        'execution_time',
        'memory_usage',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'project_id' => 'integer',
        'file_id' => 'integer',
        'language_id' => 'integer',
        'exit_code' => 'integer',
        'execution_time' => 'float',
        'memory_usage' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(File::class);
    }

    public function language(): BelongsTo
    {
        return $this->belongsTo(Language::class);
    }
}