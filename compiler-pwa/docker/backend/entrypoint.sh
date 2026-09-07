#!/bin/sh
set -e

if [ -f /var/www/html/artisan ]; then
    composer install --no-interaction --prefer-dist --no-progress || true

    # Ensure php-fpm (www-data) can write runtime dirs
    chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

    php artisan migrate --force || true
    php artisan db:seed --force || true
    php artisan optimize:clear || true
fi

exec php-fpm