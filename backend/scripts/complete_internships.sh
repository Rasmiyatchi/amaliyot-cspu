#!/bin/bash
# Amaliyotlarni avtomatik yakunlash uchun cron script

cd /path/to/your/project/backend
source venv/bin/activate  # Virtual environment aktivlashtirish
python manage.py complete_expired_internships
