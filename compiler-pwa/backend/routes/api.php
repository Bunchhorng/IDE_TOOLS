<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ExecutionController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\StatsController;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

// Brute-force protection for credential endpoints.
//
// The per-IP ceiling has to be generous: mobile carriers put thousands of
// subscribers behind a single carrier-grade NAT address, so a tight per-IP
// cap lets one busy network lock out every honest user on it (symptom:
// login/register rejected and guest session refused, which then breaks code
// execution too because the app has no token to poll with). Real abuse is
// contained by the per-account limit keyed on the submitted email, which an
// attacker cannot spread across accounts from one address.
RateLimiter::for('auth', function (Request $request) {
    return [
        Limit::perMinute(10)->by('auth:'.mb_strtolower((string) $request->input('email')).'|'.$request->ip()),
        Limit::perMinute(120)->by('auth-ip:'.$request->ip()),
    ];
});

// Guest provisioning takes a device id, not a credential, so it carries no
// brute-force surface; it only needs a ceiling to stop session-table abuse.
RateLimiter::for('guest', function (Request $request) {
    return [
        Limit::perMinute(60)->by('guest:'.$request->ip()),
    ];
});

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('/guest', [AuthController::class, 'guest'])->middleware('throttle:guest');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::post('/upgrade', [AuthController::class, 'upgrade'])->middleware('throttle:auth');
});

Route::get('/languages', [LanguageController::class, 'index']);

// Public landing-page analytics — aggregate-only (no per-user data returned).
Route::get('/stats/overview', [StatsController::class, 'overview']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

    Route::get('/projects/{project}/files', [FileController::class, 'index']);
    Route::post('/projects/{project}/files', [FileController::class, 'store']);
    Route::get('/files/{file}', [FileController::class, 'show']);
    Route::put('/files/{file}', [FileController::class, 'update']);
    Route::delete('/files/{file}', [FileController::class, 'destroy']);

    Route::get('/projects/{project}/folders', [FolderController::class, 'index']);
    Route::post('/projects/{project}/folders', [FolderController::class, 'store']);
    Route::get('/folders/{folder}', [FolderController::class, 'show']);
    Route::put('/folders/{folder}', [FolderController::class, 'update']);
    Route::delete('/folders/{folder}', [FolderController::class, 'destroy']);

    Route::post('/execute', [ExecutionController::class, 'store']);
    Route::get('/executions', [ExecutionController::class, 'index']);
    Route::delete('/executions', [ExecutionController::class, 'destroyAll']);
    Route::get('/executions/{execution}', [ExecutionController::class, 'show']);
    Route::delete('/executions/{execution}', [ExecutionController::class, 'destroy']);
    Route::post('/executions/{execution}/interactive/start', [ExecutionController::class, 'startInteractive']);
    Route::post('/executions/{execution}/interactive/input', [ExecutionController::class, 'provideInput']);
    Route::post('/executions/{execution}/interactive/signal', [ExecutionController::class, 'signalInteractive']);
    Route::get('/executions/{execution}/interactive', [ExecutionController::class, 'pollInteractive']);
});