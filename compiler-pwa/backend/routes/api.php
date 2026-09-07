<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ExecutionController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\ProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/guest', [AuthController::class, 'guest']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::post('/upgrade', [AuthController::class, 'upgrade'])->middleware('auth:sanctum');
});

Route::get('/languages', [LanguageController::class, 'index']);

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

    Route::post('/execute', [ExecutionController::class, 'store']);
    Route::get('/executions', [ExecutionController::class, 'index']);
    Route::get('/executions/{execution}', [ExecutionController::class, 'show']);
    Route::delete('/executions/{execution}', [ExecutionController::class, 'destroy']);
});