<?php
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$svc = app(App\Services\DockerExecutionService::class);
$r = new ReflectionMethod($svc, 'ptyBridgeSource');
file_put_contents('/var/www/html/pbridge_render.py', $r->invoke($svc));
echo "OK\n";
