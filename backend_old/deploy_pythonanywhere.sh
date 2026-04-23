#!/bin/bash
# Static files yig'ish
echo "Static files yig'ish..."
python manage.py collectstatic --noinput

# ALLOWED_HOSTS ni tekshirish
echo "ALLOWED_HOSTS ni tekshirish..."
python manage.py shell -c "
from django.conf import settings
print('ALLOWED_HOSTS:', settings.ALLOWED_HOSTS)
print('DEBUG:', settings.DEBUG)
"

echo "Deploy yakunlandi!"
echo "Web app ni reload qiling"
