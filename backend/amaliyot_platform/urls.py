from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Swagger schema view
schema_view = get_schema_view(
    openapi.Info(
        title="Amaliyot Platformasi API",
        default_version='v1',
        description="""
        Amaliyot Platformasi uchun to'liq API dokumentatsiyasi.
        
        Bu platforma talabalar, rahbarlar, korxonalar va amaliyotlarni boshqarish uchun mo'ljallangan.
        
        ## Autentifikatsiya
        Platforma session-based autentifikatsiyadan foydalanadi. 
        Avval `/api/auth/csrf/` endpoint orqali CSRF token oling, 
        keyin `/api/auth/login/` endpoint orqali tizimga kiring.
        
        ## Rollar
        - **Super Admin**: Barcha ma'lumotlarga to'liq ruxsat
        - **Admin**: Admin funksiyalari (super_admin dan tashqari)
        - **Supervisor**: O'z talabalari va amaliyotlari
        - **Student**: O'z ma'lumotlari va amaliyoti
        
        ## WebSocket
        Real-time yangilanishlar uchun WebSocket endpoint: `ws://localhost:8000/ws/internship/`
        """,
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="admin@amaliyot.uz"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    
    # Swagger va ReDoc dokumentatsiyasi
    path('swagger<format>/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
