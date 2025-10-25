from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
import os
from .models import (
    User, Student, Supervisor, Company, Internship,
    DailyReport, Document, Notification, Faculty, Department, DailyStatus
)
from django.db.models import Avg
import logging
logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    # Admin va Super Admin uchun login/parol ma'lumotlari
    login_info = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()
    supervisor_id = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role', 'phone', 'avatar', 'is_active', 'login_info', 'student_id', 'supervisor_id']
        read_only_fields = ['id']
    
    def get_student_id(self, obj):
        """Student ID ni olish"""
        if obj.role == 'student' and hasattr(obj, 'student_profile'):
            return obj.student_profile.student_id
        return None
    
    def get_supervisor_id(self, obj):
        """Supervisor ID ni olish"""
        if obj.role == 'supervisor' and hasattr(obj, 'supervisor_profile'):
            return obj.supervisor_profile.supervisor_id
        return None
    
    def get_login_info(self, obj):
        """Login/parol ma'lumotlarini ko'rsatish"""
        # Student uchun
        if obj.role == 'student':
            try:
                # Student profile mavjudligini tekshirish
                if hasattr(obj, 'student_profile'):
                    student = obj.student_profile
                    return {
                        'login': student.student_id,  # student_id ko'rsatish
                        'password': student.auto_generated_password if not student.is_password_changed else 'O\'zgartirilgan',
                        'is_password_changed': student.is_password_changed
                    }
                else:
                    return {
                        'login': obj.username,
                        'password': 'Student profile topilmadi',
                        'is_password_changed': False
                    }
            except Exception as e:
                return {
                    'login': obj.username,
                    'password': f'Xatolik: {str(e)}',
                    'is_password_changed': False
                }
        # Supervisor uchun
        elif obj.role == 'supervisor':
            try:
                if hasattr(obj, 'supervisor_profile'):
                    supervisor = obj.supervisor_profile
                    return {
                        'login': supervisor.supervisor_id,  # supervisor_id ko'rsatish
                        'password': supervisor.auto_generated_password if not supervisor.is_password_changed else 'O\'zgartirilgan',
                        'is_password_changed': supervisor.is_password_changed
                    }
                else:
                    return {
                        'login': obj.username,
                        'password': 'Supervisor profile topilmadi',
                        'is_password_changed': False
                    }
            except Exception as e:
                return {
                    'login': obj.username,
                    'password': f'Xatolik: {str(e)}',
                    'is_password_changed': False
                }
        # Admin va Super Admin uchun
        else:
            return {
                'login': obj.username,
                'password': 'Admin parol',
                'is_password_changed': True
            }


class FacultySerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = '__all__'


class DepartmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    
    class Meta:
        model = Department
        fields = '__all__'


class StudentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    department = serializers.CharField(source='department.name', read_only=True)
    faculty = serializers.CharField(source='faculty.name', read_only=True)
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    phone = serializers.CharField(source='user.phone', read_only=True)
    course = serializers.IntegerField(required=False)
    group = serializers.CharField(required=False)
    
    class Meta:
        model = Student
        fields = '__all__'
        read_only_fields = ['auto_generated_password', 'is_password_changed', 'student_id']
    
    def validate(self, attrs):
        """Custom validation for department and faculty"""
        # Department validation
        department_value = attrs.get('department')
        if isinstance(department_value, str):
            try:
                department = Department.objects.get(name=department_value)
                attrs['department'] = department
            except Department.DoesNotExist:
                raise serializers.ValidationError({'department': f"Kafedra '{department_value}' topilmadi"})
        
        # Faculty validation
        faculty_value = attrs.get('faculty')
        if isinstance(faculty_value, str):
            try:
                faculty = Faculty.objects.get(name=faculty_value)
                attrs['faculty'] = faculty
            except Faculty.DoesNotExist:
                raise serializers.ValidationError({'faculty': f"Fakultet '{faculty_value}' topilmadi"})
        
        return attrs
    
    def update(self, instance, validated_data):
        """Update student with proper field handling"""
        # Update user fields if provided
        user_data = {}
        if 'first_name' in validated_data:
            user_data['first_name'] = validated_data.pop('first_name')
        if 'last_name' in validated_data:
            user_data['last_name'] = validated_data.pop('last_name')
        if 'phone' in validated_data:
            phone_value = validated_data.pop('phone')
            if phone_value:  # Faqat bo'sh bo'lmagan qiymatni o'rnatamiz
                user_data['phone'] = phone_value
        
        if user_data:
            # To'g'ridan-to'g'ri user model ni yangilaymiz
            for key, value in user_data.items():
                setattr(instance.user, key, value)
            instance.user.save()
        
        # Update student fields
        return super().update(instance, validated_data)


class SupervisorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    company_name = serializers.SerializerMethodField()
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    department = serializers.CharField(write_only=True, required=False)
    faculty = serializers.CharField(write_only=True, required=False)
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    phone = serializers.CharField(source='user.phone', read_only=True)
    
    def get_company_name(self, obj):
        """Company nomini xavfsiz tarzda olish"""
        try:
            if obj.company:
                # Force evaluation of company object
                company = obj.company
                if hasattr(company, 'name'):
                    return str(company.name)
            return None
        except Exception as e:
            logger.error(f"Error getting company name: {str(e)}")
            return None
    
    def to_representation(self, instance):
        """Serializer representation ni xavfsiz qilish"""
        try:
            # Force evaluation of related objects to avoid proxy issues
            if hasattr(instance, 'company') and instance.company:
                try:
                    _ = str(instance.company.name)  # Force evaluation
                except (AttributeError, ValueError):
                    pass
            if hasattr(instance, 'department') and instance.department:
                try:
                    _ = str(instance.department.name)  # Force evaluation
                except (AttributeError, ValueError):
                    pass
            if hasattr(instance, 'faculty') and instance.faculty:
                try:
                    _ = str(instance.faculty.name)  # Force evaluation
                except (AttributeError, ValueError):
                    pass
            if hasattr(instance, 'user') and instance.user:
                try:
                    _ = str(instance.user.get_full_name())  # Force evaluation
                except (AttributeError, ValueError):
                    pass
            
            return super().to_representation(instance)
        except Exception as e:
            logger.error(f"Error in SupervisorSerializer.to_representation: {str(e)}")
            
            # Return basic representation without related fields
            return {
                'id': instance.id,
                'position': getattr(instance, 'position', ''),
                'specialization': getattr(instance, 'specialization', ''),
                'capacity': getattr(instance, 'capacity', 0),
                'experience': getattr(instance, 'experience', 0),
                'status': getattr(instance, 'status', 'active'),
                'company_name': None,
                'department_name': None,
                'faculty_name': None,
            }
    
    class Meta:
        model = Supervisor
        fields = '__all__'
        read_only_fields = ['auto_generated_password', 'is_password_changed', 'supervisor_id']
    
    def validate(self, attrs):
        """Custom validation for department and faculty"""
        logger.debug(f"SupervisorSerializer validating attrs: {attrs}")
        
        # Department validation
        department_value = attrs.get('department')
        if isinstance(department_value, str):
            try:
                department = Department.objects.get(name=department_value)
                logger.debug(f"Found department: {department.name} (ID: {department.id})")
                attrs['department'] = department
            except Department.DoesNotExist:
                logger.warning(f"Department '{department_value}' not found")
                raise serializers.ValidationError({'department': f"Kafedra '{department_value}' topilmadi"})
        
        # Faculty validation
        faculty_value = attrs.get('faculty')
        if isinstance(faculty_value, str):
            try:
                faculty = Faculty.objects.get(name=faculty_value)
                logger.debug(f"Found faculty: {faculty.name} (ID: {faculty.id})")
                attrs['faculty'] = faculty
            except Faculty.DoesNotExist:
                logger.warning(f"Faculty '{faculty_value}' not found")
                raise serializers.ValidationError({'faculty': f"Fakultet '{faculty_value}' topilmadi"})
        
        # Company validation (optional)
        company_value = attrs.get('company')
        logger.debug(f"Company value received: {company_value} (type: {type(company_value)})")
        
        # Agar company allaqachon Company object bo'lsa, uni o'zgartirmaslik
        if isinstance(company_value, Company):
            logger.debug(f"Company is already a Company object: {company_value.name}")
            attrs['company'] = company_value
        elif company_value and company_value != '' and company_value != 'null' and company_value is not None:
            try:
                # Convert to integer if it's a string
                company_id = int(company_value) if isinstance(company_value, str) else company_value
                company = Company.objects.get(id=company_id)
                logger.debug(f"Found company: {company.name} (ID: {company.id})")
                attrs['company'] = company
            except Company.DoesNotExist:
                logger.warning(f"Company '{company_value}' not found")
                raise serializers.ValidationError({'company': f"Korxona '{company_value}' topilmadi"})
            except ValueError as e:
                logger.error(f"Company ID validation error: {e}")
                raise serializers.ValidationError({'company': f"Korxona ID noto'g'ri formatda"})
        elif company_value is None or company_value == '' or company_value == 'null':
            # Company ni null qilish
            attrs['company'] = None
        
        return attrs
    
    def update(self, instance, validated_data):
        """Update supervisor and user data"""
        logger.debug(f"SupervisorSerializer update called with: {validated_data}")
        
        # Update user data if provided
        user_data = {}
        if 'first_name' in validated_data:
            user_data['first_name'] = validated_data.pop('first_name')
        if 'last_name' in validated_data:
            user_data['last_name'] = validated_data.pop('last_name')
        if 'phone' in validated_data:
            user_data['phone'] = validated_data.pop('phone')
        
        if user_data:
            logger.debug(f"Updating user data: {user_data}")
            for key, value in user_data.items():
                setattr(instance.user, key, value)
            instance.user.save()
        
        # Update supervisor data
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        
        return instance



class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            try:
                # Avval username orqali qidirish
                try:
                    user = User.objects.get(username=username)
                except User.DoesNotExist:
                    # Student ID orqali qidirish
                    try:
                        student = Student.objects.get(student_id=username)
                        user = student.user
                    except Student.DoesNotExist:
                        # Supervisor ID orqali qidirish
                        try:
                            supervisor = Supervisor.objects.get(supervisor_id=username)
                            user = supervisor.user
                        except Supervisor.DoesNotExist:
                            raise serializers.ValidationError('Foydalanuvchi topilmadi.')
                
                if user.check_password(password):
                    # Foydalanuvchi faol emas bo'lsa
                    if not user.is_active:
                        raise serializers.ValidationError('Foydalanuvchi hisobi faol emas.')
                    
                    attrs['user'] = user
                    return attrs
                else:
                    raise serializers.ValidationError('Noto\'g\'ri username yoki parol.')
                    
            except serializers.ValidationError:
                raise
            except Exception as e:
                raise serializers.ValidationError('Foydalanuvchi topilmadi.')
        else:
            raise serializers.ValidationError('Username va parol kiritilishi kerak.')
        
        return attrs


class StudentCreateSerializer(serializers.ModelSerializer):
    """Bitta talaba yaratish uchun serializer"""
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Student
        fields = [
            'student_id', 'first_name', 'last_name', 'phone',
            'faculty', 'department', 'course', 'group', 'passport',
            'birth_date', 'address', 'parent_phone', 'internship_type',
            'region', 'district', 'gender', 'jshshir', 'education_language',
            'academic_year', 'semester', 'is_graduate', 'specialization',
            'education_type', 'education_form'
        ]
    
    def create(self, validated_data):
        # User yaratish
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        phone = validated_data.pop('phone', '')
        student_id = validated_data['student_id']
        passport = validated_data['passport']
        
        # Login = student_id, Password = passport
        user = User.objects.create_user(
            username=student_id,
            password=passport,
            first_name=first_name,
            last_name=last_name,
            role='student',
            phone=phone
        )
        
        # Student profilini yaratish
        student = Student.objects.create(
            user=user,
            auto_generated_password=passport,
            is_password_changed=False,
            **validated_data
        )
        
        return student


class SupervisorCreateSerializer(serializers.ModelSerializer):
    """Bitta rahbar yaratish uchun serializer"""
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True, required=False)
    department = serializers.CharField(write_only=True)
    faculty = serializers.CharField(write_only=True)
    company = serializers.CharField(write_only=True, required=False)
    company_name = serializers.SerializerMethodField()
    
    def get_company_name(self, obj):
        """Company nomini xavfsiz tarzda olish"""
        try:
            if obj.company:
                return obj.company.name
            return None
        except:
            return None
    
    class Meta:
        model = Supervisor
        fields = [
            'first_name', 'last_name', 'phone',
            'position', 'department', 'faculty', 'specialization',
            'capacity', 'experience', 'status', 'company', 'company_name'
        ]
    
    def validate(self, attrs):
        """Custom validation for department and faculty"""
        logger.debug(f"SupervisorCreateSerializer validating attrs: {attrs}")
        
        # Department validation
        department_value = attrs.get('department')
        if isinstance(department_value, str):
            try:
                department = Department.objects.get(name=department_value)
                logger.debug(f"Found department: {department.name} (ID: {department.id})")
                attrs['department'] = department
            except Department.DoesNotExist:
                logger.warning(f"Department '{department_value}' not found")
                raise serializers.ValidationError({'department': f"Kafedra '{department_value}' topilmadi"})
        
        # Faculty validation
        faculty_value = attrs.get('faculty')
        if isinstance(faculty_value, str):
            try:
                faculty = Faculty.objects.get(name=faculty_value)
                logger.debug(f"Found faculty: {faculty.name} (ID: {faculty.id})")
                attrs['faculty'] = faculty
            except Faculty.DoesNotExist:
                logger.warning(f"Faculty '{faculty_value}' not found")
                raise serializers.ValidationError({'faculty': f"Fakultet '{faculty_value}' topilmadi"})
        
        # Company validation (optional)
        company_value = attrs.get('company')
        logger.debug(f"Company value received: {company_value} (type: {type(company_value)})")
        if company_value and company_value != '' and company_value != 'null' and company_value is not None:
            try:
                # Convert to integer if it's a string
                company_id = int(company_value) if isinstance(company_value, str) else company_value
                company = Company.objects.get(id=company_id)
                logger.debug(f"Found company: {company.name} (ID: {company.id})")
                attrs['company'] = company
            except Company.DoesNotExist:
                logger.warning(f"Company '{company_value}' not found")
                raise serializers.ValidationError({'company': f"Korxona '{company_value}' topilmadi"})
            except ValueError as e:
                logger.error(f"Company ID validation error: {e}")
                raise serializers.ValidationError({'company': f"Korxona ID noto'g'ri formatda"})
        elif company_value is None or company_value == '' or company_value == 'null':
            # Company ni null qilish
            attrs['company'] = None
        
        return attrs
    
    def create(self, validated_data):
        logger.info("SupervisorCreateSerializer create method called")
        logger.debug(f"Validated data: {validated_data}")
        
        # User yaratish
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        phone = validated_data.pop('phone', '')
        
        # Supervisor ID generatsiya qilish
        last_supervisor = Supervisor.objects.order_by('-supervisor_id').first()
        if last_supervisor:
            # Oxirgi supervisor ID dan raqamni olish (SUP0001 -> 1)
            last_number = int(last_supervisor.supervisor_id.replace('SUP', ''))
            supervisor_number = last_number + 1
        else:
            supervisor_number = 1
        supervisor_id = f"SUP{supervisor_number:04d}"
        
        # Unique bo'lishini tekshirish
        while User.objects.filter(username=supervisor_id).exists():
            supervisor_number += 1
            supervisor_id = f"SUP{supervisor_number:04d}"
        
        # Password avtomatik generatsiya
        import secrets
        import string
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        
        logger.debug(f"Creating user with username: {supervisor_id}")
        user = User.objects.create_user(
            username=supervisor_id,  # SUP0001 formatida
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='supervisor',
            phone=phone,
            is_active=True
        )
        logger.debug(f"User created: {user.id}")
        
        # Supervisor profilini yaratish
        logger.debug("Creating supervisor profile...")
        supervisor = Supervisor.objects.create(
            user=user,
            supervisor_id=supervisor_id,
            auto_generated_password=password,
            is_password_changed=False,
            **validated_data
        )
        logger.info(f"Supervisor created: {supervisor.id}")
        
        return supervisor


class AdminCreateSerializer(serializers.ModelSerializer):
    """Super Admin tomonidan yangi admin yaratish uchun serializer"""
    password = serializers.CharField(write_only=True, min_length=6)
    
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'phone', 'role', 'password']
    
    def validate_role(self, value):
        if value not in ['admin', 'super_admin']:
            raise serializers.ValidationError('Faqat admin yoki super_admin rollari mumkin.')
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class PasswordChangeSerializer(serializers.Serializer):
    """Parol o'zgartirish uchun serializer (faqat admin va super_admin)"""
    user_id = serializers.IntegerField()
    new_password = serializers.CharField(min_length=6)
    
    def validate_user_id(self, value):
        try:
            user = User.objects.get(id=value)
            if user.role not in ['student', 'supervisor']:
                raise serializers.ValidationError('Faqat talaba va rahbar parollarini o\'zgartirish mumkin.')
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError('Foydalanuvchi topilmadi.')
    
    def save(self):
        user_id = self.validated_data['user_id']
        new_password = self.validated_data['new_password']
        
        user = User.objects.get(id=user_id)
        user.set_password(new_password)
        user.save()
        
        # Student yoki Supervisor profilida is_password_changed ni True qilish
        if user.role == 'student' and hasattr(user, 'student_profile'):
            student = user.student_profile
            student.is_password_changed = True
            student.save()
        elif user.role == 'supervisor' and hasattr(user, 'supervisor_profile'):
            supervisor = user.supervisor_profile
            supervisor.is_password_changed = True
            supervisor.save()
        
        return user


class DailyStatusSerializer(serializers.ModelSerializer):
    """Kunlik status serializer"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = DailyStatus
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class InternshipSerializer(serializers.ModelSerializer):
    """Amaliyot serializer"""
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    supervisor_name = serializers.SerializerMethodField()
    company_name = serializers.CharField(source='company.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    duration_days = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    completed_days = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()
    attendance_stats = serializers.SerializerMethodField()
    work_days_count = serializers.SerializerMethodField()
    daily_statuses = DailyStatusSerializer(many=True, read_only=True)
    # Baholash fieldlari
    grade_comment = serializers.CharField(required=False, allow_blank=True)
    is_graded = serializers.BooleanField(read_only=True)
    graded_by_name = serializers.CharField(source='graded_by.get_full_name', read_only=True)
    graded_at = serializers.DateTimeField(read_only=True)
    
    def get_supervisor_name(self, obj):
        """Supervisor nomini xavfsiz tarzda olish"""
        try:
            if obj.supervisor:
                # Agar supervisor User modelida bo'lsa
                if hasattr(obj.supervisor, 'get_full_name'):
                    return obj.supervisor.get_full_name()
                # Agar supervisor Supervisor modelida bo'lsa
                elif hasattr(obj.supervisor, 'supervisor_profile'):
                    return obj.supervisor.supervisor_profile.name
                # Agar supervisor Supervisor modelida bo'lsa va name field bor bo'lsa
                elif hasattr(obj.supervisor, 'name'):
                    return obj.supervisor.name
            return None
        except Exception as e:
            logger.error(f"Error getting supervisor name: {str(e)}")
            return None
    
    def get_duration_days(self, obj):
        """Amaliyot kunlarini hisoblash"""
        if obj.duration_days:
            return obj.duration_days
        
        # Agar duration_days bo'sh bo'lsa, sanalar orasidagi farqni hisoblaymiz
        if obj.start_date and obj.end_date and obj.company:
            # Kompaniya ish kunlariga qarab hisoblash
            from datetime import timedelta
            
            current_date = obj.start_date
            work_days_count = 0
            
            # Ish kunlari mapping
            day_mapping = {
                'monday': 'monday',
                'tuesday': 'tuesday', 
                'wednesday': 'wednesday',
                'thursday': 'thursday',
                'friday': 'friday',
                'saturday': 'saturday',
                'sunday': 'sunday'
            }
            
            # End date gacha ish kunlarini hisoblash
            while current_date <= obj.end_date:
                weekday = current_date.strftime('%A').lower()
                
                if day_mapping.get(weekday) in obj.company.work_days:
                    work_days_count += 1
                
                current_date += timedelta(days=1)
            
            return work_days_count
        
        # Agar company yo'q bo'lsa, oddiy kunlar sonini qaytarish
        if obj.start_date and obj.end_date:
            return (obj.end_date - obj.start_date).days + 1
        
        return None
    
    def get_progress_percentage(self, obj):
        """Progress foizini olish"""
        return obj.get_progress_percentage()
    
    def get_completed_days(self, obj):
        """Tugagan kunlar sonini olish"""
        return obj.get_completed_days()
    
    def get_remaining_days(self, obj):
        """Qolgan kunlar sonini olish"""
        return obj.get_remaining_days()
    
    def get_attendance_stats(self, obj):
        """Kunlar sonini hisoblash"""
        return obj.get_attendance_stats()
    
    def get_work_days_count(self, obj):
        """Ish kunlarini hisoblash"""
        return obj.get_work_days_count()
    
    class Meta:
        model = Internship
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'is_graded', 'graded_by', 'graded_at']
    
    def validate(self, attrs):
        """Sig'im va status validatsiyasi"""
        student = attrs.get('student')
        supervisor = attrs.get('supervisor')
        company = attrs.get('company')
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        duration_days = attrs.get('duration_days')
        grade = attrs.get('grade')
        grade_comment = attrs.get('grade_comment')

        # Student faol amaliyoti borligini tekshirish
        if student and not student.can_start_internship():
            raise serializers.ValidationError(
                "Bu talaba allaqachon faol amaliyotda"
            )

        # Supervisor sig'imini tekshirish
        if supervisor and hasattr(supervisor, 'supervisor_profile'):
            if not supervisor.supervisor_profile.can_accept_student():
                raise serializers.ValidationError(
                    f"Rahbar sig'imi to'ldi ({supervisor.supervisor_profile.assigned_students}/{supervisor.supervisor_profile.capacity})"
                )

        # Company sig'imini tekshirish
        if company and not company.can_accept_student():
            raise serializers.ValidationError(
                f"Korxona sig'imi to'ldi ({company.assigned_students}/{company.capacity})"
            )

        # Sana validatsiyasi
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError("Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak")

        # Duration validatsiyasi
        if duration_days and duration_days <= 0:
            raise serializers.ValidationError("Amaliyot kunlari soni 0 dan katta bo'lishi kerak")

        # Baholash validatsiyasi
        if grade is not None:
            if not (0 <= grade <= 5):
                raise serializers.ValidationError("Baho 0 dan 5 gacha bo'lishi kerak")

            # Comment majburiy emas lekin agar baho qo'yilsa, comment ham bo'lishi yaxshi
            if grade_comment and len(grade_comment.strip()) < 10:
                raise serializers.ValidationError("Baholash izohi kamida 10 ta belgi bo'lishi kerak")

        return attrs
    
    def create(self, validated_data):
        """Amaliyot yaratish"""
        # Duration_days ni olish
        duration_days = validated_data.get('duration_days')
        company = validated_data.get('company')
        start_date = validated_data.get('start_date')
        
        # Agar duration_days berilgan bo'lsa va company mavjud bo'lsa, end_date ni hisoblash
        if duration_days and company and start_date:
            validated_data['end_date'] = company.calculate_work_days_end_date(start_date, duration_days)
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Amaliyot yangilash"""
        # Duration_days ni olish
        duration_days = validated_data.get('duration_days')
        company = validated_data.get('company', instance.company)
        start_date = validated_data.get('start_date', instance.start_date)

        # Agar duration_days o'zgargan bo'lsa va company mavjud bo'lsa, end_date ni qayta hisoblash
        if duration_days and company and start_date:
            validated_data['end_date'] = company.calculate_work_days_end_date(start_date, duration_days)

        # Baholash yangilanishi
        grade = validated_data.get('grade')
        grade_comment = validated_data.get('grade_comment')

        if grade is not None and not instance.is_graded:
            # Baholash faqat 1 marta
            from django.utils import timezone

            if not (0 <= grade <= 5):
                raise serializers.ValidationError("Baho 0 dan 5 gacha bo'lishi kerak")

            if instance.status != 'completed':
                raise serializers.ValidationError("Faqat yakunlangan amaliyotlar baholanadi")

            # Baholash
            validated_data['is_graded'] = True
            validated_data['graded_at'] = timezone.now()

            # Student umumiy bahosini hisoblash
            completed_internships = Internship.objects.filter(
                student=instance.student,
                status='completed',
                is_graded=True
            )

            if completed_internships.exists():
                avg_grade = completed_internships.aggregate(
                    avg_score=Avg('grade')
                )['avg_score']
                instance.student.grade = round(avg_grade, 2) if avg_grade else grade
                instance.student.save()

        return super().update(instance, validated_data)


class CompanySerializer(serializers.ModelSerializer):
    """Korxona serializer"""
    work_days_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_work_days_display(self, obj):
        """Ish kunlarini ko'rsatish"""
        if not obj.work_days:
            return []
        
        day_names = {
            'monday': 'Dushanba',
            'tuesday': 'Seshanba', 
            'wednesday': 'Chorshanba',
            'thursday': 'Payshanba',
            'friday': 'Juma',
            'saturday': 'Shanba',
            'sunday': 'Yakshanba'
        }
        
        return [day_names.get(day, day) for day in obj.work_days]


class DailyReportSerializer(serializers.ModelSerializer):
    """Kundalik hisobot serializer"""
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    internship_id = serializers.IntegerField(source='internship.id', read_only=True)
    
    class Meta:
        model = DailyReport
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'student', 'internship']
    
    def validate(self, attrs):
        """Hisobot validatsiyasi"""
        date = attrs.get('date')
        hours = attrs.get('hours')
        activities = attrs.get('activities')
        
        # Sana validatsiyasi
        if date and date > timezone.now().date():
            raise serializers.ValidationError("Hisobot kelajakki sana uchun yozilmasligi kerak")
        
        # Soat validatsiyasi
        if hours and (hours < 1 or hours > 12):
            raise serializers.ValidationError("Ish soatlari 1-12 orasida bo'lishi kerak")
        
        # Faoliyat validatsiyasi
        if activities and len(activities.strip()) < 50:
            raise serializers.ValidationError("Faoliyat tavsifi kamida 50 ta belgi bo'lishi kerak")
        
        # Bugungi kun uchun hisobot mavjudligini tekshirish
        request = self.context.get('request')
        if request and request.user and date:
            try:
                student = Student.objects.get(user=request.user)
                existing_report = DailyReport.objects.filter(
                    student=student,
                    date=date
                ).first()
                
                if existing_report:
                    raise serializers.ValidationError("Bu kun uchun hisobot allaqachon yuborilgan")
            except Student.DoesNotExist:
                pass
        
        return attrs
    
    def create(self, validated_data):
        """Kundalik hisobot yaratish"""
        try:
            # Student va internship ni context dan olish
            request = self.context.get('request')
            if request and request.user:
                try:
                    student = Student.objects.get(user=request.user)
                    # Student'ning faol internship'ini topish
                    internship = student.internships.filter(
                        status__in=['assigned', 'start_pending', 'started']
                    ).first()
                    
                    if internship:
                        validated_data['student'] = student
                        validated_data['internship'] = internship
                    else:
                        raise serializers.ValidationError("Student'ning faol amaliyoti topilmadi")
                except Student.DoesNotExist:
                    raise serializers.ValidationError("Student topilmadi")
            
            return super().create(validated_data)
        except Exception as e:
            logger.error(f"Error in DailyReportSerializer create: {str(e)}")
            raise serializers.ValidationError(f"Hisobot yaratishda xatolik: {str(e)}")


class DocumentSerializer(serializers.ModelSerializer):
    """Hujjat serializer"""
    student_name = serializers.SerializerMethodField()
    internship_id = serializers.IntegerField(source='internship.id', read_only=True)
    file_url = serializers.SerializerMethodField()
    student = serializers.CharField(write_only=True, required=False)  # User ID qabul qiladi
    
    class Meta:
        model = Document
        fields = '__all__'
        read_only_fields = ['id', 'uploaded_at']
    
    def validate_student(self, value):
        """Student fieldini validatsiya qilish"""
        try:
            if isinstance(value, str):
                # User ID dan Student modelini topish
                user_id = int(value)
                student = Student.objects.get(user_id=user_id)
                return student
            return value
        except (Student.DoesNotExist, ValueError) as e:
            logger.error(f"Error validating student: {str(e)}")
            raise serializers.ValidationError("Student topilmadi")
        except Exception as e:
            logger.error(f"Unexpected error in validate_student: {str(e)}")
            raise serializers.ValidationError("Student validatsiyasida xatolik")
    
    def get_student_name(self, obj):
        """Student nomini olish"""
        try:
            if obj.student and obj.student.user:
                return obj.student.user.get_full_name()
            return f"Student {obj.student.id if obj.student else 'Unknown'}"
        except Exception as e:
            logger.error(f"Error getting student name: {str(e)}")
            return "Unknown Student"
    
    def get_file_url(self, obj):
        """Fayl URL ni olish"""
        try:
            if obj.file:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.file.url)
                return obj.file.url
        except Exception as e:
            logger.error(f"Error getting file URL: {str(e)}")
        return None
    
    def validate_file(self, value):
        """Fayl validatsiyasi"""
        if value:
            # Fayl hajmini tekshirish (10MB)
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError("Fayl hajmi 10MB dan katta bo'lmasligi kerak")
            
            # Fayl formatini tekshirish
            allowed_extensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
            file_extension = os.path.splitext(value.name)[1].lower()
            if file_extension not in allowed_extensions:
                raise serializers.ValidationError("Fayl formati qo'llab-quvvatlanmaydi")
        
        return value
    
    def create(self, validated_data):
        """Hujjat yaratish"""
        try:
            # Student va internship ni to'g'ri belgilash
            student = validated_data.get('student')
            if student:
                # Student'ning faol internship'ini topish
                internship = student.internships.filter(
                    status__in=['assigned', 'start_pending', 'started']
                ).first()
                
                if internship:
                    validated_data['internship'] = internship
                else:
                    raise serializers.ValidationError("Student'ning faol amaliyoti topilmadi")
            else:
                # Agar student berilmagan bo'lsa, request.user dan olish
                request = self.context.get('request')
                if request and request.user and request.user.role == 'student':
                    try:
                        student = Student.objects.get(user=request.user)
                        internship = student.internships.filter(
                            status__in=['assigned', 'start_pending', 'started']
                        ).first()
                        
                        if internship:
                            validated_data['student'] = student
                            validated_data['internship'] = internship
                        else:
                            raise serializers.ValidationError("Student'ning faol amaliyoti topilmadi")
                    except Student.DoesNotExist:
                        raise serializers.ValidationError("Student topilmadi")
            
            return super().create(validated_data)
        except Exception as e:
            logger.error(f"Error in DocumentSerializer create: {str(e)}")
            raise serializers.ValidationError(f"Hujjat yaratishda xatolik: {str(e)}")
