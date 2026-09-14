#!/bin/sh
set -e

if [ -f /var/www/html/artisan ]; then
    composer install --no-interaction --prefer-dist --no-progress || true

    # Ensure php-fpm (www-data) can write runtime dirs
    chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

    # Let php-fpm's www-data reach the docker socket (host docker group gid)
    DOCKER_GROUP_ID="${DOCKER_GROUP_ID:-984}"
    if [ -S /var/run/docker.sock ]; then
        if ! getent group "$DOCKER_GROUP_ID" >/dev/null 2>&1; then
            addgroup --gid "$DOCKER_GROUP_ID" dockerhost 2>/dev/null || true
        fi
        usermod -aG "$DOCKER_GROUP_ID" www-data 2>/dev/null || true
    fi

    php artisan migrate --force || true
    php artisan db:seed --force || true
    php artisan optimize:clear || true
fi

exec php-fpm