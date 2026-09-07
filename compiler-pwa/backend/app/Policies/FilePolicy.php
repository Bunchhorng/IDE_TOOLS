<?php

namespace App\Policies;

use App\Models\File;
use App\Models\User;

class FilePolicy
{
    public function view(User $user, File $file): bool
    {
        return $user->id === $file->project->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, File $file): bool
    {
        return $user->id === $file->project->user_id;
    }

    public function delete(User $user, File $file): bool
    {
        return $user->id === $file->project->user_id;
    }
}