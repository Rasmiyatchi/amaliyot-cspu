# PythonAnywhere uchun maxsus settings
# Bu faylni settings.py ga import qiling

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# PythonAnywhere specific settings
def get_pythonanywhere_settings():
    """PythonAnywhere uchun maxsus sozlamalar"""
    
    settings = {
        # Allowed hosts
        'ALLOWED_HOSTS': ['localhost', '127.0.0.1', 'logistika.pythonanywhere.com'],
        
        # Static files
        'STATIC_URL': '/static/',
        'STATIC_ROOT': os.path.join(os.path.dirname(os.path.dirname(__file__)), 'staticfiles'),
        
        # Media files
        'MEDIA_URL': '/media/',
        'MEDIA_ROOT': os.path.join(os.path.dirname(os.path.dirname(__file__)), 'files'),
        
        # Security settings
        'SECURE_SSL_REDIRECT': False,  # PythonAnywhere da avtomatik SSL
        'SESSION_COOKIE_SECURE': False,  # HTTP da ham ishlashi uchun
        'SESSION_COOKIE_SAMESITE': 'None',  # Cross-origin uchun
        'SESSION_COOKIE_DOMAIN': None,  # Barcha domainlar uchun
        'CSRF_COOKIE_SECURE': False,
        'CSRF_COOKIE_SAMESITE': 'None',  # Cross-origin uchun
        'CSRF_COOKIE_DOMAIN': None,  # Barcha domainlar uchun
        
        # CORS settings
        'CORS_ALLOWED_ORIGINS': [
            "https://integrnship-platform.vercel.app",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        
        # CSRF trusted origins
        'CSRF_TRUSTED_ORIGINS': [
            "https://integrnship-platform.vercel.app",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        
        # Logging
        'LOGGING': {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'verbose': {
                    'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
                    'style': '{',
                },
            },
            'handlers': {
                'file': {
                    'level': 'INFO',
                    'class': 'logging.FileHandler',
                    'filename': os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs', 'django.log'),
                    'formatter': 'verbose',
                },
                'console': {
                    'level': 'INFO',
                    'class': 'logging.StreamHandler',
                    'formatter': 'verbose',
                },
            },
            'root': {
                'handlers': ['file', 'console'],
                'level': 'INFO',
            },
            'loggers': {
                'django': {
                    'handlers': ['file', 'console'],
                    'level': 'INFO',
                    'propagate': False,
                },
            },
        },
    }
    
    return settings
