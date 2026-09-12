<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')
                ->nullable()
                ->constrained('folders')
                ->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();

            // SQLite/MySQL treat NULLs as distinct in a unique index, so root
            // folder uniqueness is enforced at the validation layer instead.
            $table->unique(['project_id', 'parent_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('folders');
    }
};