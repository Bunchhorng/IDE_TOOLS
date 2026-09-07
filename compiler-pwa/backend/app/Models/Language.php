<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Language extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'version',
        'docker_image',
        'compile_command',
        'run_command',
        'filename_template',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}