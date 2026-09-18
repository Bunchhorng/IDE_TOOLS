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

// Brute-force protection for credential endpoints: per-account+IP and
// per-IP limits, shared by login / register / guest provisioning.
RateLimiter::for('auth', function (Request $request) {
    return [
        Limit::perMinute(5)->by('auth:'.($request->input('email') ?: 'anon').'|'.$request->ip()),
        Limit::perMinute(30)->by('auth-ip:'.$request->ip()),
    ];
});

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('/guest', [AuthController::class, 'guest'])->middleware('throttle:auth');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::post('/upgrade', [AuthController::class, 'upgrade'])->middleware('auth:sanctum');
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