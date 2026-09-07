<?php

namespace App\Policies;

use App\Models\Execution;
use App\Models\User;

class ExecutionPolicy
{
    public function view(User $user, Execution $execution): bool
    {
        return $user->id === $execution->user_id;
    }

    public function delete(User $user, Execution $execution): bool
    {
        return $user->id === $execution->user_id;
    }
}