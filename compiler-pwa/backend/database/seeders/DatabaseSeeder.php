<?php

namespace Database\Seeders;

use App\Models\Language;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        Language::updateOrCreate(['slug' => 'c'], [
            'name' => 'C',
            'version' => 'GCC 13',
            'docker_image' => 'coderunner/c:latest',
            'compile_command' => 'gcc',
            'run_command' => './main',
            'filename_template' => 'main.c',
            'is_active' => true,
        ]);

        Language::updateOrCreate(['slug' => 'cpp'], [
            'name' => 'C++',
            'version' => 'G++ 13',
            'docker_image' => 'coderunner/cpp:latest',
            'compile_command' => 'g++',
            'run_command' => './main',
            'filename_template' => 'main.cpp',
            'is_active' => true,
        ]);

        Language::updateOrCreate(['slug' => 'python'], [
            'name' => 'Python',
            'version' => '3.12',
            'docker_image' => 'coderunner/python:latest',
            'compile_command' => null,
            'run_command' => 'python3 -u',
            'filename_template' => 'main.py',
            'is_active' => true,
        ]);
    }
}