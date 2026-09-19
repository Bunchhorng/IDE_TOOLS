<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'slug',
        'name',
        'description',
    ];

    protected $casts = [
        'user_id' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (Project $project) {
            if (empty($project->slug)) {
                $project->slug = self::newSlug();
            }
        });
    }

    /** Random unguessable URL token so raw database IDs never leak into URLs. */
    public static function newSlug(): string
    {
        do {
            $slug = Str::lower(Str::random(11));
        } while (static::query()->where('slug', $slug)->exists());

        return $slug;
    }

    /** Let implicit route binding ({project}) resolve by slug instead of id. */
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(File::class);
    }

    public function folders(): HasMany
    {
        return $this->hasMany(Folder::class);
    }

    public function executions(): HasMany
    {
        return $this->hasMany(Execution::class);
    }
}