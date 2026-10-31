#!/bin/sh
set -e
cd /var/www/html
runuser -u www-data -- php artisan migrate --force
exec "$@"