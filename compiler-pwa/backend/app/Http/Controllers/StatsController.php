<?php

namespace App\Http\Controllers;

use App\Models\Execution;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Platform usage statistics for the dashboard analytics panel.
 *
 * All queries are aggregate-only — no user-identifiable rows are returned,
 * so exposing this to any authenticated user is safe (it answers "how many
 * people use the IDE", not "who uses the IDE").
 */
class StatsController extends Controller
{
    public function overview(): JsonResponse
    {
        $now = CarbonImmutable::now();
        $today = $now->startOfDay();
        $weekAgo = $now->subDays(6)->startOfDay(); // 7-day window incl. today

        // ---- Users -----------------------------------------------------
        $totalUsers = (int) User::count();
        $guestUsers = (int) User::where('is_guest', true)->count();
        $registeredUsers = $totalUsers - $guestUsers;

        // "Active" = executed at least one program in the window.
        $activeToday = (int) Execution::where('created_at', '>=', $today)
            ->distinct('user_id')->count('user_id');
        $activeWeek = (int) Execution::where('created_at', '>=', $weekAgo)
            ->distinct('user_id')->count('user_id');

        // ---- Executions ------------------------------------------------
        $executionsToday = (int) Execution::where('created_at', '>=', $today)->count();
        $executionsTotal = (int) Execution::count();

        // Peak day: executions grouped by date, highest first.
        $peak = Execution::select(
            DB::raw('DATE(created_at) as day'),
            DB::raw('COUNT(*) as count')
        )
            ->groupBy('day')
            ->orderByDesc('count')
            ->first();

        // ---- 14-day trend (fills missing days with zero) ---------------
        $perDay = Execution::select(
            DB::raw('DATE(created_at) as day'),
            DB::raw('COUNT(*) as count')
        )
            ->where('created_at', '>=', $now->subDays(13)->startOfDay())
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('count', 'day');

        $trend = [];
        for ($i = 13; $i >= 0; $i--) {
            $day = $now->subDays($i)->toDateString();
            $trend[] = [
                'date' => $day,
                'count' => (int) ($perDay[$day] ?? 0),
            ];
        }

        // ---- Language popularity (top 5) --------------------------------
        $languages = Execution::select('languages.name', 'languages.slug', DB::raw('COUNT(*) as count'))
            ->join('languages', 'languages.id', '=', 'executions.language_id')
            ->groupBy('languages.id', 'languages.name', 'languages.slug')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        // ---- Status breakdown -------------------------------------------
        $statusRows = Execution::select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $statuses = [];
        foreach ($statusRows as $status => $count) {
            $statuses[] = ['status' => $status, 'count' => (int) $count];
        }

        return response()
            ->json([
                'success' => true,
                'message' => 'Usage statistics retrieved successfully',
                'data' => [
                'users' => [
                    'total' => $totalUsers,
                    'registered' => $registeredUsers,
                    'guests' => $guestUsers,
                    'active_today' => $activeToday,
                    'active_week' => $activeWeek,
                ],
                'executions' => [
                    'total' => $executionsTotal,
                    'today' => $executionsToday,
                    'peak_day' => $peak?->day,
                    'peak_count' => (int) ($peak?->count ?? 0),
                ],
                'trend' => $trend,
                'languages' => $languages,
                'statuses' => $statuses,
            ],
        ])
        // Never cache: the landing page polls this endpoint, and the numbers
        // must always reflect the current database state.
        ->header('Cache-Control', 'no-store, max-age=0')
        ->header('Vary', 'Accept-Encoding');
    }
}
