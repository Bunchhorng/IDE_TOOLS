<?php

return [
    'timeout' => env('EXECUTION_TIMEOUT', 5),
    'memory_limit' => env('EXECUTION_MEMORY_LIMIT', '134217728'),
    'output_limit' => env('EXECUTION_OUTPUT_LIMIT', 1000000),
    'cpu_percent' => env('EXECUTION_CPU_PERCENT', 50),
    'max_processes' => env('EXECUTION_MAX_PROCESSES', 100),
    'rate_per_minute' => env('EXECUTION_RATE_PER_MINUTE', 5),
    'rate_per_hour' => env('EXECUTION_RATE_PER_HOUR', 50),
    'host_base' => env('EXECUTION_HOST_BASE', ''),
];