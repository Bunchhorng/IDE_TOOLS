<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('slug', 191)->nullable()->after('user_id');
        });

        // Backfill existing rows with a guaranteed-unique slug.
        $slugs = [];
        DB::table('projects')->orderBy('id')->get(['id'])->each(function ($project) use (&$slugs) {
            do {
                $slug = Str::lower(Str::random(11));
            } while (isset($slugs[$slug]));
            $slugs[$slug] = true;
            DB::table('projects')->where('id', $project->id)->update(['slug' => $slug]);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->string('slug', 191)->nullable(false)->change();
            $table->unique('slug');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};