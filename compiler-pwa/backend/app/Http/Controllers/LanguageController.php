<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\LanguageResource;
use App\Models\Language;
use Illuminate\Http\JsonResponse;

class LanguageController extends Controller
{
    public function index(): JsonResponse
    {
        $languages = Language::where('is_active', true)->get();

        return response()->json([
            'success' => true,
            'message' => 'Languages retrieved successfully',
            'data' => LanguageResource::collection($languages),
        ]);
    }
}