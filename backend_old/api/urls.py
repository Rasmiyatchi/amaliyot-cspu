from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, LogoutView, DashboardView, CSRFView,
    UserViewSet, StudentViewSet, SupervisorViewSet, CompanyViewSet,
    InternshipViewSet, DailyReportViewSet, DocumentViewSet, 
    NotificationViewSet, FacultyViewSet, DepartmentViewSet, DailyStatusViewSet
)
from .hemis_import import HemisImportView, HemisTemplateView

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'students', StudentViewSet)
router.register(r'supervisors', SupervisorViewSet)
router.register(r'companies', CompanyViewSet)
router.register(r'internships', InternshipViewSet)
router.register(r'daily-reports', DailyReportViewSet)
router.register(r'documents', DocumentViewSet)
router.register(r'notifications', NotificationViewSet)
router.register(r'faculties', FacultyViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'daily-statuses', DailyStatusViewSet)

urlpatterns = [
    path('auth/csrf/', CSRFView.as_view(), name='csrf'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('hemis/import/', HemisImportView.as_view(), name='hemis-import'),
    path('hemis/template/', HemisTemplateView.as_view(), name='hemis-template'),
    path('', include(router.urls)),
]
