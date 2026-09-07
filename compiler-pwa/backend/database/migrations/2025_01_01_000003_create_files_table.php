<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('filename');
            $table->string('language');
            $table->longText('content')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'filename']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
