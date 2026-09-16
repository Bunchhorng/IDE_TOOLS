<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->trustProxies(at: '*');
        // Do not trim student code payloads — trailing newlines in source
        // code, stdin and file content are significant (EOF handling,
        // exact-bytes round-trips).
        $middleware->trimStrings(except: ['code', 'stdin', 'content']);
        // Preserve an empty interactive input line ("" must stay "" so a
        // blank Enter can be forwarded to running programs).
        $middleware->convertEmptyStringsToNull([
            fn ($request) => $request->is('api/executions/*/interactive/input'),
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn () => request()->is('api/*'));
    })
    ->create();