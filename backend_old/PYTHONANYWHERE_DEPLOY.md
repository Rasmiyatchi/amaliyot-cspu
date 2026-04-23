# PythonAnywhere uchun deploy qo'llanmasi

## 1. PythonAnywhere da Web App yaratish

1. PythonAnywhere ga kiring va "Web" tabiga o'ting
2. "Add a new web app" tugmasini bosing
3. Domain nomini tanlang
4. "Manual configuration" ni tanlang
5. Python versiyasini tanlang (3.11 tavsiya qilinadi)

## 2. Kodni yuklash

1. Terminal orqali:
```bash
cd ~
git clone https://github.com/yourusername/amaliyot_platform.git
# yoki
mkdir amaliyot_platform
cd amaliyot_platform
# Kodlarni yuklang
```

2. Virtual environment yaratish:
```bash
cd ~/amaliyot_platform/backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 3. Environment variables sozlash

1. `~/.env` faylini yarating:
```bash
cd ~/amaliyot_platform/backend
nano .env
```

2. Quyidagi ma'lumotlarni kiriting:
```
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=logistika.pythonanywhere.com
DATABASE_ENGINE=django.db.backends.sqlite3
DATABASE_NAME=db.sqlite3
CORS_ALLOWED_ORIGINS=https://integrnship-platform.vercel.app,http://localhost:3000
CSRF_TRUSTED_ORIGINS=https://integrnship-platform.vercel.app,http://localhost:3000
```

## 4. Database sozlash

```bash
cd ~/amaliyot_platform/backend
source venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

## 5. WSGI konfiguratsiyasi

1. Web app da "Code" tabiga o'ting
2. WSGI configuration file ni oching
3. Quyidagi kodni qo'ying:

```python
import os
import sys

path = '/home/yourusername/amaliyot_platform/backend'
if path not in sys.path:
    sys.path.append(path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'amaliyot_platform.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

## 6. Static files sozlash

1. Web app da "Static files" tabiga o'ting
2. Quyidagi URL va directory qo'shing:
   - URL: `/static/`
   - Directory: `/home/yourusername/amaliyot_platform/backend/staticfiles`

3. Media files uchun:
   - URL: `/media/`
   - Directory: `/home/yourusername/amaliyot_platform/files`

## 7. Web app ni qayta yuklash

"Reload" tugmasini bosing

## 8. Test qilish

1. `https://logistika.pythonanywhere.com/` - Asosiy sahifa
2. `https://logistika.pythonanywhere.com/swagger/` - Swagger dokumentatsiya
3. `https://logistika.pythonanywhere.com/redoc/` - ReDoc dokumentatsiya
4. `https://logistika.pythonanywhere.com/api/` - API endpointlar

## 9. Frontend uchun CORS sozlash

Settings.py da CORS_ALLOWED_ORIGINS ga frontend URL ni qo'shing:
```python
CORS_ALLOWED_ORIGINS = [
    "https://integrnship-platform.vercel.app",
    "http://localhost:3000",  # Development uchun
]
```

## 10. Xatoliklar bilan ishlash

1. Error logs: Web app da "Logs" tabiga o'ting
2. Server logs: "Error log" ni tekshiring
3. Debug: Agar kerak bo'lsa, DEBUG=True qiling (production da False qiling)

## 11. SSL sertifikat

PythonAnywhere da SSL sertifikat avtomatik beriladi, lekin qo'lda ham sozlash mumkin.

## 12. Backup

Muntazam ravishda:
```bash
cd ~/amaliyot_platform/backend
cp db.sqlite3 ~/backup_$(date +%Y%m%d).sqlite3
```

## 13. Yangilanishlar

Kod yangilanganda:
```bash
cd ~/amaliyot_platform/backend
source venv/bin/activate
git pull  # agar git ishlatayotgan bo'lsangiz
python manage.py migrate
python manage.py collectstatic --noinput
# Web app ni reload qiling
```

## 14. Performance optimizatsiya

1. Database indekslarni tekshiring
2. Static files caching
3. Gzip compression
4. CDN ishlatish (ixtiyoriy)

## 15. Monitoring

1. PythonAnywhere dashboard da traffic ni kuzating
2. Error logs ni tekshiring
3. Performance metrics ni kuzating
