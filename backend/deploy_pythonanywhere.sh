#!/bin/bash
# PythonAnywhere uchun startup script

echo "Amaliyot Platformasi deploy qilish..."

# Virtual environment aktivlashtirish
source venv/bin/activate

# Kerakli paketlarni o'rnatish
echo "Paketlarni o'rnatish..."
pip install -r requirements.txt

# Database migration
echo "Database migration..."
python manage.py migrate

# Static files yig'ish
echo "Static files yig'ish..."
python manage.py collectstatic --noinput

# Superuser yaratish (agar mavjud bo'lmasa)
echo "Superuser yaratish..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser yaratildi: admin/admin123')
else:
    print('Superuser allaqachon mavjud')
"

# Logs papkasini yaratish
mkdir -p logs

echo "Deploy yakunlandi!"
echo "Web app ni reload qiling"
