from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class User(AbstractUser):
    """Custom User model with roles"""
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('admin', 'Admin'),
        ('supervisor', 'Rahbar'),
        ('student', 'Talaba'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Email fieldini optional qilish
    email = models.EmailField(blank=True, null=True)
    
    # Phone field
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Telefon raqam')
    
    # Email fieldini unique qilmaslik
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"
    
    def get_role_display(self):
        return dict(self.ROLE_CHOICES).get(self.role, self.role)


class Faculty(models.Model):
    """Fakultet modeli"""
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Fakultet"
        verbose_name_plural = "Fakultetlar"
        ordering = ['name']


class Department(models.Model):
    """Kafedra modeli"""
    name = models.CharField(max_length=200)
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='departments')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.faculty.name})"
    
    class Meta:
        verbose_name = "Kafedra"
        verbose_name_plural = "Kafedralar"
        unique_together = ['name', 'faculty']
        ordering = ['faculty', 'name']


class Student(models.Model):
    """Talaba modeli"""
    INTERNSHIP_TYPE_CHOICES = [
        ('belgilanmagan', 'Belgilanmagan'),
        ('malaka', 'Malaka amaliyoti'),
        ('pedagogik', 'Pedagogik amaliyot'),
        ('ilmiy', 'Ilmiy amaliyot'),
        ('ishlab_chiqarish', 'Ishlab chiqarish amaliyoti'),
    ]
    
    INTERNSHIP_STATUS_CHOICES = [
        ('waiting', 'Kutilmoqda'),
        ('assigned', 'Belgilangan'),
        ('start_pending', 'Boshlash kutilmoqda'),
        ('started', 'Boshlangan'),
        ('completed', 'Tugadi'),
        ('grading', 'Baholash'),
        ('graded', 'Baholandi'),
        ('confirmed', 'Tasdiqlandi'),
        ('cancelled', 'Bekor qilingan'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    internship_type = models.CharField(max_length=20, choices=INTERNSHIP_TYPE_CHOICES, default='belgilanmagan')
    internship_status = models.CharField(max_length=20, choices=INTERNSHIP_STATUS_CHOICES, default='waiting')
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                 related_name='supervised_students', limit_choices_to={'role': 'supervisor'})
    company = models.ForeignKey('Company', on_delete=models.SET_NULL, null=True, blank=True)
    grade = models.FloatField(blank=True, null=True, validators=[MinValueValidator(0), MaxValueValidator(5)], verbose_name='Umumiy baho')
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    is_password_changed = models.BooleanField(default=False)
    auto_generated_password = models.CharField(max_length=100, blank=True, null=True, verbose_name='Avtomatik parol')
    
    # HEMIS dan kelgan qo'shimcha ma'lumotlar
    student_id = models.CharField(max_length=20, unique=True)
    region = models.CharField(max_length=100, blank=True, null=True, verbose_name='Viloyat')
    district = models.CharField(max_length=100, blank=True, null=True, verbose_name='Tuman')
    gender = models.CharField(max_length=10, blank=True, null=True, verbose_name='Jins')
    birth_date = models.DateField(blank=True, null=True)
    passport = models.CharField(max_length=20, blank=True, null=True)
    jshshir = models.CharField(max_length=20, blank=True, null=True, verbose_name='JSHSHIR kod')
    course = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(6)])
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE)
    group = models.CharField(max_length=20)
    education_language = models.CharField(max_length=50, blank=True, null=True, verbose_name='Ta\'lim tili')
    academic_year = models.CharField(max_length=20, blank=True, null=True, verbose_name='O\'quv yili')
    semester = models.CharField(max_length=20, blank=True, null=True, verbose_name='Semestr')
    is_graduate = models.CharField(max_length=10, blank=True, null=True, verbose_name='Bitiruvchi')
    specialization = models.CharField(max_length=200, blank=True, null=True, verbose_name='Mutaxassislik')
    education_type = models.CharField(max_length=100, blank=True, null=True, verbose_name='Ta\'lim turi')
    education_form = models.CharField(max_length=100, blank=True, null=True, verbose_name='Ta\'lim shakli')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def can_start_internship(self):
        """Yangi amaliyot boshlay oladimi?"""
        active_internships = Internship.objects.filter(
            student=self, 
            status__in=['start_pending', 'started', 'completed', 'grading', 'graded']
        ).count()
        return active_internships == 0
    
    def get_active_internship(self):
        """Faol yoki tayinlangan amaliyotni olish"""
        try:
            return Internship.objects.get(student=self, status__in=['start_pending', 'started', 'completed', 'grading', 'graded'])
        except Internship.DoesNotExist:
            return None
    
    def has_active_internship(self):
        """Faol yoki tayinlangan amaliyoti bormi?"""
        return self.get_active_internship() is not None
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.student_id})"
    
    class Meta:
        verbose_name = "Talaba"
        verbose_name_plural = "Talabalar"
        ordering = ['-created_at']


class Supervisor(models.Model):
    """Rahbar modeli"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='supervisor_profile')
    supervisor_id = models.CharField(max_length=20, unique=True, verbose_name='Rahbar ID')
    position = models.CharField(max_length=200)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE)
    specialization = models.CharField(max_length=200)
    capacity = models.IntegerField(default=10, validators=[MinValueValidator(1)])
    assigned_students = models.IntegerField(default=0)
    rating = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(5)])
    status = models.CharField(max_length=20, choices=[('active', 'Faol'), ('inactive', 'Nofaol')], default='active')
    experience = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    auto_generated_password = models.CharField(max_length=100, blank=True, null=True, verbose_name='Avtomatik parol')
    is_password_changed = models.BooleanField(default=False)
    company = models.ForeignKey('Company', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Korxona')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def can_accept_student(self):
        """Yangi talaba qabul qila oladimi?"""
        return self.assigned_students < self.capacity
    
    def assign_student(self):
        """Talaba tayinlash"""
        if self.can_accept_student():
            self.assigned_students += 1
            self.save()
            return True
        return False
    
    def unassign_student(self):
        """Talaba tayinlashni bekor qilish"""
        if self.assigned_students > 0:
            self.assigned_students -= 1
            self.save()
    
    def get_available_capacity(self):
        """Mavjud sig'imni olish"""
        return self.capacity - self.assigned_students
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.position})"
    
    class Meta:
        verbose_name = "Rahbar"
        verbose_name_plural = "Rahbarlar"
        ordering = ['-created_at']


class Company(models.Model):
    """Korxona modeli"""
    WORK_DAYS_CHOICES = [
        ('monday', 'Dushanba'),
        ('tuesday', 'Seshanba'),
        ('wednesday', 'Chorshanba'),
        ('thursday', 'Payshanba'),
        ('friday', 'Juma'),
        ('saturday', 'Shanba'),
        ('sunday', 'Yakshanba'),
    ]
    
    name = models.CharField(max_length=200)
    direction = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    capacity = models.IntegerField(default=5, validators=[MinValueValidator(1)])
    assigned_students = models.IntegerField(default=0)
    rating = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(5)])
    status = models.CharField(max_length=20, choices=[('active', 'Faol'), ('inactive', 'Nofaol')], default='active')
    
    # Ish kunlari va soatlari
    work_days = models.JSONField(default=list, help_text="Ish kunlari ro'yxati")
    work_hours_start = models.TimeField(default='09:00', help_text="Ish boshlanish vaqti")
    work_hours_end = models.TimeField(default='18:00', help_text="Ish tugash vaqti")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def can_accept_student(self):
        """Yangi talaba qabul qila oladimi?"""
        return self.assigned_students < self.capacity
    
    def assign_student(self):
        """Talaba tayinlash"""
        if self.can_accept_student():
            self.assigned_students += 1
            self.save()
            return True
        return False
    
    def unassign_student(self):
        """Talaba tayinlashni bekor qilish"""
        if self.assigned_students > 0:
            self.assigned_students -= 1
            self.save()
    
    def get_available_capacity(self):
        """Mavjud sig'imni olish"""
        return self.capacity - self.assigned_students
    
    def calculate_work_days_end_date(self, start_date, duration_days):
        """Ish kunlariga qarab tugash sanasini hisoblash"""
        from datetime import timedelta
        
        current_date = start_date
        days_added = 0
        
        while days_added < duration_days:
            current_date += timedelta(days=1)
            # Agar kun ish kuni bo'lsa
            weekday = current_date.strftime('%A').lower()
            day_mapping = {
                'monday': 'monday',
                'tuesday': 'tuesday', 
                'wednesday': 'wednesday',
                'thursday': 'thursday',
                'friday': 'friday',
                'saturday': 'saturday',
                'sunday': 'sunday'
            }
            
            if day_mapping.get(weekday) in self.work_days:
                days_added += 1
        
        return current_date
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Korxona"
        verbose_name_plural = "Korxonalar"
        ordering = ['-created_at']


class Internship(models.Model):
    """Amaliyot modeli"""
    INTERNSHIP_TYPE_CHOICES = [
        ('malaka', 'Malaka amaliyoti'),
        ('pedagogik', 'Pedagogik amaliyot'),
        ('ilmiy', 'Ilmiy amaliyot'),
        ('ishlab_chiqarish', 'Ishlab chiqarish amaliyoti'),
    ]
    
    STATUS_CHOICES = [
        ('waiting', 'Kutilmoqda'),
        ('assigned', 'Belgilangan'),
        ('start_pending', 'Boshlash kutilmoqda'),
        ('started', 'Boshlangan'),
        ('completed', 'Tugadi'),
        ('grading', 'Baholash'),
        ('graded', 'Baholandi'),
        ('confirmed', 'Tasdiqlandi'),
        ('cancelled', 'Bekor qilingan'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='internships')
    supervisor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervised_internships',
                                 limit_choices_to={'role': 'supervisor'})
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True)
    type = models.CharField(max_length=20, choices=INTERNSHIP_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    duration_days = models.IntegerField(help_text="Amaliyot kunlari soni", validators=[MinValueValidator(1)], null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='start_pending')
    grade = models.FloatField(blank=True, null=True, validators=[MinValueValidator(0), MaxValueValidator(5)], verbose_name='Yakuniy baho')
    grade_comment = models.TextField(blank=True, null=True, verbose_name='Baholash izohi')
    is_graded = models.BooleanField(default=False, help_text="Baholanganmi?")
    graded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='graded_internships', limit_choices_to={'role': 'supervisor'})
    graded_at = models.DateTimeField(null=True, blank=True, verbose_name='Baholangan vaqt')
    feedback = models.TextField(blank=True, null=True)
    supervisor_feedback = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True, help_text="Amaliyot faolmi")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_internships', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        """Amaliyot davomiyligini avtomatik hisoblash"""
        # Agar duration_days bo'sh bo'lsa, start_date va end_date orasidagi kunlarni hisoblash
        if self.start_date and self.end_date and not self.duration_days:
            delta = self.end_date - self.start_date
            self.duration_days = delta.days + 1  # +1 chunki oxirgi kun ham hisobga olinadi
        
        # Agar duration_days va start_date mavjud bo'lsa, end_date ni hisoblash
        if self.start_date and self.duration_days and self.company:
            self.end_date = self.company.calculate_work_days_end_date(self.start_date, self.duration_days)
        elif self.start_date and self.duration_days and not self.end_date:
            # Company bo'lmasa, oddiy kunlarni qo'shish
            from datetime import timedelta
            self.end_date = self.start_date + timedelta(days=self.duration_days - 1)
        
        super().save(*args, **kwargs)
    
    def get_progress_percentage(self):
        """Amaliyot progress foizini hisoblash"""
        if not self.duration_days:
            return 0
        
        completed_days = self.daily_statuses.filter(
            status='day_completed'
        ).count()
        
        return min(100, (completed_days / self.duration_days) * 100)
    
    def get_completed_days(self):
        """Tugagan kunlar soni"""
        return self.daily_statuses.filter(status='day_completed').count()
    
    def get_remaining_days(self):
        """Qolgan kunlar soni"""
        if not self.duration_days:
            return 0
        return max(0, self.duration_days - self.get_completed_days())
    
    def is_day_completed(self, date):
        """Muayyan kun tugaganmi?"""
        try:
            daily_status = self.daily_statuses.get(date=date)
            return daily_status.status == 'day_completed'
        except DailyStatus.DoesNotExist:
            return False
    
    def get_daily_status_for_date(self, date):
        """Muayyan kun uchun status"""
        try:
            return self.daily_statuses.get(date=date)
        except DailyStatus.DoesNotExist:
            return None

    def complete_internship(self):
        """Amaliyotni yakunlash va sig'imlarni qaytarish"""
        if self.status == 'active':
            self.status = 'completed'
            self.is_active = False

            # Student statusini yangilash
            self.student.internship_status = 'completed'
            self.student.save()

            # Supervisor sig'imini qaytarish
            if hasattr(self.supervisor, 'supervisor_profile'):
                self.supervisor.supervisor_profile.unassign_student()

            # Company sig'imini qaytarish
            if self.company:
                self.company.unassign_student()

            self.save()
            return True
        return False

    def grade_internship(self, score, comment=None, supervisor=None):
        """Amaliyotni baholash (faqat 1 marta)"""
        from django.utils import timezone

        if self.is_graded:
            return False, "Bu amaliyot allaqachon baholangan"

        if not (0 <= score <= 5):
            return False, "Baho 0 dan 5 gacha bo'lishi kerak"

        if self.status != 'completed':
            return False, "Faqat yakunlangan amaliyotlar baholanadi"

        # Baholash
        self.grade = score
        self.grade_comment = comment
        self.is_graded = True
        self.graded_by = supervisor
        self.graded_at = timezone.now()
        
        # Statusni 'graded' ga o'tkazish
        self.status = 'graded'
        
        # Student statusini ham yangilash
        self.student.internship_status = 'graded'
        self.student.save()

        # Student umumiy bahosini hisoblash
        completed_internships = Internship.objects.filter(
            student=self.student,
            status__in=['graded', 'confirmed'],
            is_graded=True
        )

        if completed_internships.exists():
            avg_grade = completed_internships.aggregate(
                avg_score=models.Avg('grade')
            )['avg_score']
            self.student.grade = round(avg_grade, 2) if avg_grade else score
            self.student.save()

        self.save()
        return True, "Amaliyot muvaffaqiyatli baholandi"
    
    def get_attendance_stats(self):
        """Kunlar sonini hisoblash"""
        from django.utils import timezone
        
        if not self.daily_statuses.exists():
            return {
                'total_days': self.duration_days or 0,
                'attended_days': 0,
                'absent_days': 0,
                'attendance_percentage': 0,
                'completed_days': 0,
                'pending_days': 0
            }
        
        # Kunlik statuslar asosida hisoblash
        total_days = self.duration_days or 0
        attended_days = self.daily_statuses.filter(
            status__in=['start_confirmed', 'day_completed', 'report_submitted', 'report_confirmed']
        ).count()
        
        completed_days = self.daily_statuses.filter(
            status='day_completed'
        ).count()
        
        pending_days = self.daily_statuses.filter(
            status__in=['day_start', 'start_confirmed', 'report_submitted']
        ).count()
        
        absent_days = total_days - attended_days
        attendance_percentage = (attended_days / total_days * 100) if total_days > 0 else 0
        
        return {
            'total_days': total_days,
            'attended_days': attended_days,
            'absent_days': absent_days,
            'attendance_percentage': round(attendance_percentage, 1),
            'completed_days': completed_days,
            'pending_days': pending_days
        }
    
    def get_work_days_count(self):
        """Ish kunlarini hisoblash (dam olish kunlarini hisobga olmasdan)"""
        from django.utils import timezone
        import datetime
        
        if not self.start_date or not self.end_date:
            return 0
        
        start_date = self.start_date
        end_date = self.end_date
        
        # Ish kunlarini hisoblash (shanba-yakshanba dam olish)
        work_days = 0
        current_date = start_date
        
        while current_date <= end_date:
            # Shanba (5) va Yakshanba (6) dam olish kunlari
            if current_date.weekday() < 5:  # Dushanba-Juma
                work_days += 1
            current_date += datetime.timedelta(days=1)
        
        return work_days
    
    def cancel_internship(self):
        """Amaliyotni bekor qilish va sig'imlarni qaytarish"""
        if self.status == 'active':
            self.status = 'cancelled'
            self.is_active = False
            
            # Student statusini yangilash
            self.student.internship_status = 'waiting'
            self.student.save()
            
            # Supervisor sig'imini qaytarish
            if hasattr(self.supervisor, 'supervisor_profile'):
                self.supervisor.supervisor_profile.unassign_student()
            
            # Company sig'imini qaytarish
            if self.company:
                self.company.unassign_student()
            
            self.save()
            return True
        return False
    
    def calculate_duration(self):
        """Amaliyot davomiyligini hisoblash"""
        if self.start_date and self.end_date and self.company:
            from datetime import timedelta
            
            current_date = self.start_date
            work_days_count = 0
            
            while current_date <= self.end_date:
                weekday = current_date.strftime('%A').lower()
                day_mapping = {
                    'monday': 'monday',
                    'tuesday': 'tuesday', 
                    'wednesday': 'wednesday',
                    'thursday': 'thursday',
                    'friday': 'friday',
                    'saturday': 'saturday',
                    'sunday': 'sunday'
                }
                
                if day_mapping.get(weekday) in self.company.work_days:
                    work_days_count += 1
                
                current_date += timedelta(days=1)
            
            return work_days_count
        return 0
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.get_type_display()}"
    
    class Meta:
        verbose_name = "Amaliyot"
        verbose_name_plural = "Amaliyotlar"
        ordering = ['-created_at']


class DailyStatus(models.Model):
    """Kunlik status modeli"""
    DAILY_STATUS_CHOICES = [
        ('day_start', 'Kunni boshlash'),
        ('start_confirmed', 'Boshlash tasdiqlandi'),
        ('start_rejected', 'Boshlash rad etildi'),
        ('report_submitted', 'Hisobot topshirish'),
        ('report_confirmed', 'Hisobot tasdiqlandi'),
        ('report_rejected', 'Hisobot rad etildi'),
        ('resubmitted', 'Qayta topshirish'),
        ('day_completed', 'Yakunlash'),
    ]
    
    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='daily_statuses')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=DAILY_STATUS_CHOICES, default='day_start')
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True, verbose_name="Rad etish sababi")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['internship', 'date']
        verbose_name = "Kunlik status"
        verbose_name_plural = "Kunlik statuslar"
    
    def __str__(self):
        return f"{self.internship.student.user.get_full_name()} - {self.date} - {self.get_status_display()}"


class DailyReport(models.Model):
    """Kundalik hisobot modeli"""
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('approved', 'Tasdiqlangan'),
        ('rejected', 'Rad etilgan'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='daily_reports')
    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='daily_reports')
    date = models.DateField()
    activities = models.TextField()
    hours = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    photos = models.JSONField(default=list, blank=True, help_text="Hisobot rasmlari")
    rejection_reason = models.TextField(blank=True, null=True, help_text="Rad etish sababi")
    supervisor_comment = models.TextField(blank=True, null=True, help_text="Rahbar izohi")
    feedback = models.TextField(blank=True, null=True)
    supervisor_feedback = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.date}"
    
    class Meta:
        verbose_name = "Kundalik hisobot"
        verbose_name_plural = "Kundalik hisobotlar"
        unique_together = ['student', 'date']
        ordering = ['-created_at']


class Document(models.Model):
    """Hujjat modeli"""
    DOCUMENT_TYPE_CHOICES = [
        ('contract', 'Shartnoma'),
        ('program', 'Dastur'),
        ('report', 'Hisobot'),
        ('certificate', 'Sertifikat'),
        ('other', 'Boshqa'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('approved', 'Tasdiqlangan'),
        ('rejected', 'Rad etilgan'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='documents')
    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='documents')
    type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True, help_text="Hujjat tavsifi")
    file = models.FileField(upload_to='documents/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True, null=True, help_text="Rad etish sababi")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        """Hujjat nomini avtomatik yaratish"""
        if not self.name or self.name.strip() == '':
            type_names = {
                'contract': 'Amaliyot shartnomasi',
                'report': 'Hisobot',
                'certificate': 'Sertifikat',
                'other': 'Boshqa hujjat',
                'program': 'Amaliyot dasturi'  # Frontend dan keladigan yangi type
            }
            self.name = type_names.get(self.type, f'{self.type.title()} hujjat')
        super().save(*args, **kwargs)
    
    def __str__(self):
        try:
            if self.student and self.student.user:
                return f"{self.student.user.get_full_name()} - {self.name}"
            return f"Student {self.student.id if self.student else 'Unknown'} - {self.name}"
        except Exception as e:
            print(f"Error in Document __str__: {e}")
            return f"Document {self.id} - {getattr(self, 'name', 'Unknown')}"
    
    class Meta:
        verbose_name = "Hujjat"
        verbose_name_plural = "Hujjatlar"


class Notification(models.Model):
    """Bildirishnoma modeli"""
    NOTIFICATION_TYPE_CHOICES = [
        ('info', 'Ma\'lumot'),
        ('success', 'Muvaffaqiyat'),
        ('warning', 'Ogohlantirish'),
        ('error', 'Xatolik'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES, default='info')
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.title}"

    class Meta:
        verbose_name = "Bildirishnoma"
        verbose_name_plural = "Bildirishnomalar"
        ordering = ['-created_at']