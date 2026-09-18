<?php

use Illuminate\Auth\AuthenticationException;
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
        // API-only auth app: the default redirectGuestsTo() resolves route('login'),
        // which does not exist here — an unauthenticated API request then died with
        // RouteNotFoundException (500 + debug trace) instead of a clean 401.
        $middleware->redirectGuestsTo(fn () => null);
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
        // AuthenticationException::unauthenticated() only honours shouldRenderJsonWhen
        // via expectsJson(); a plain API request without an Accept header would fall
        // through to redirect()->guest(route('login')) — a route that does not exist
        // in this token API — surfacing as a 500 + debug stack trace instead of a 401.
        // Render the app's standard JSON envelope for API auth failures.
        $exceptions->render(function (AuthenticationException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated.',
                    'data' => null,
                ], 401);
            }
        });
    })
    ->create();