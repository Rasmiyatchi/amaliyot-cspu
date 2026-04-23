# PythonAnywhere uchun WSGI konfiguratsiyasi
# Bu faylni PythonAnywhere da WSGI configuration fayliga qo'ying

import os
import sys

# PythonAnywhere da project path
path = '/home/yourusername/amaliyot_platform/backend'
if path not in sys.path:
    sys.path.append(path)

# Django settings module
os.environ['DJANGO_SETTINGS_MODULE'] = 'amaliyot_platform.settings'

# Django application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
