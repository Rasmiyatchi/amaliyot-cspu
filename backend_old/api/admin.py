from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, Student, Supervisor, Company, Internship, 
    DailyReport, Document, Notification, Faculty, Department
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'phone', 'first_name', 'last_name', 'role', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'phone', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    # Email fieldini optional qilish
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'phone')}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('Additional Info', {'fields': ('role', 'avatar')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'first_name', 'last_name', 'email', 'phone', 'role'),
        }),
    )


@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)
    ordering = ('name',)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'faculty', 'created_at')
    list_filter = ('faculty',)
    search_fields = ('name', 'faculty__name')
    ordering = ('faculty', 'name')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('user', 'student_id', 'faculty', 'department', 'course', 'group', 'internship_status')
    list_filter = ('faculty', 'department', 'course', 'internship_status', 'internship_type')
    search_fields = ('user__first_name', 'user__last_name', 'student_id')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Asosiy ma\'lumotlar', {
            'fields': ('user', 'student_id')
        }),
        ('Ta\'lim ma\'lumotlari', {
            'fields': ('faculty', 'department', 'course', 'group', 'education_language', 'academic_year', 'semester', 'education_type', 'education_form', 'specialization', 'is_graduate')
        }),
        ('Shaxsiy ma\'lumotlar', {
            'fields': ('birth_date', 'passport', 'jshshir', 'region', 'district', 'gender')
        }),
        ('Amaliyot ma\'lumotlari', {
            'fields': ('internship_type', 'internship_status', 'supervisor', 'company', 'grade', 'start_date', 'end_date')
        }),
        ('Parol ma\'lumotlari', {
            'fields': ('auto_generated_password', 'is_password_changed')
        }),
    )


@admin.register(Supervisor)
class SupervisorAdmin(admin.ModelAdmin):
    list_display = ('user', 'position', 'department', 'faculty', 'capacity', 'assigned_students', 'rating', 'status')
    list_filter = ('department', 'faculty', 'status')
    search_fields = ('user__first_name', 'user__last_name', 'position')
    ordering = ('-created_at',)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'direction', 'capacity', 'assigned_students', 'rating', 'status')
    list_filter = ('direction', 'status')
    search_fields = ('name', 'direction', 'phone')
    ordering = ('-created_at',)


@admin.register(Internship)
class InternshipAdmin(admin.ModelAdmin):
    list_display = ('student', 'supervisor', 'company', 'type', 'start_date', 'end_date', 'status', 'grade')
    list_filter = ('type', 'status', 'start_date')
    search_fields = ('student__user__first_name', 'student__user__last_name', 'supervisor__first_name')
    ordering = ('-created_at',)


@admin.register(DailyReport)
class DailyReportAdmin(admin.ModelAdmin):
    list_display = ('student', 'internship', 'date', 'hours', 'status')
    list_filter = ('status', 'date')
    search_fields = ('student__user__first_name', 'student__user__last_name')
    ordering = ('-date',)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('student', 'internship', 'type', 'name', 'status', 'uploaded_at')
    list_filter = ('type', 'status')
    search_fields = ('student__user__first_name', 'student__user__last_name', 'name')
    ordering = ('-uploaded_at',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'type', 'read', 'created_at')
    list_filter = ('type', 'read', 'created_at')
    search_fields = ('user__first_name', 'user__last_name', 'title')
    ordering = ('-created_at',)