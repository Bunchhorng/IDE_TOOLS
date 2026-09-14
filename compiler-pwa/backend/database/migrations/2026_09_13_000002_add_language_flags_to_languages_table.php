<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('languages', function (Blueprint $table) {
            // Libraries appended AFTER the source file on the link line, so
            // --as-needed cannot drop them (e.g. `-lm` for math.h users).
            $table->string('compile_flags')->nullable()->after('compile_command');
            // Pre-flight check for languages without a compile step (e.g.
            // `python3 -m py_compile`) so syntax errors surface BEFORE run.
            $table->string('syntax_check_command')->nullable()->after('compile_flags');
        });
    }

    public function down(): void
    {
        Schema::table('languages', function (Blueprint $table) {
            $table->dropColumn(['syntax_check_command', 'compile_flags']);
        });
    }
};