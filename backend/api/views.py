from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.utils import timezone
from .models import (
    User, Student, Supervisor, Company, Internship, 
    DailyReport, Document, Notification, Faculty, Department, DailyStatus
)
from .serializers import (
    UserSerializer, StudentSerializer, SupervisorSerializer, CompanySerializer,
    InternshipSerializer, DailyReportSerializer, DocumentSerializer, 
    NotificationSerializer, FacultySerializer, DepartmentSerializer,
    LoginSerializer, StudentCreateSerializer, SupervisorCreateSerializer,
    AdminCreateSerializer, DailyStatusSerializer
)
import traceback
import logging
logger = logging.getLogger(__name__)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CSRFView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        return Response({'csrfToken': get_token(request)})


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            login(request, user)
            return Response({
                'user': UserSerializer(user).data,
                'message': 'Muvaffaqiyatli kirildi'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({'message': 'Muvaffaqiyatli chiqildi'})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return User.objects.select_related('student_profile', 'supervisor_profile').all()
        elif user.role == 'admin':
            return User.objects.select_related('student_profile', 'supervisor_profile').exclude(role='super_admin')
        else:
            return User.objects.select_related('student_profile', 'supervisor_profile').filter(id=user.id)
    
    def create(self, request, *args, **kwargs):
        # Faqat super_admin yangi admin yaratishi mumkin
        if request.user.role != 'super_admin':
            return Response(
                {'error': 'Faqat Super Admin yangi admin yaratishi mumkin'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Admin yaratish uchun maxsus serializer
        serializer = AdminCreateSerializer(data=request.data)
        if serializer.is_valid():
            admin = serializer.save()
            return Response(UserSerializer(admin).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        # Faqat super_admin adminlarni o'chirishi mumkin
        if request.user.role != 'super_admin':
            return Response(
                {'error': 'Faqat Super Admin adminlarni o\'chirishi mumkin'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Super admin o'zini o'chirishga ruxsat bermaslik
        if request.user.id == int(kwargs['pk']):
            return Response(
                {'error': 'Super Admin o\'zini o\'chirishi mumkin emas'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            user = User.objects.get(id=kwargs['pk'])
            # User bilan bog'liq profillarni o'chirish
            if hasattr(user, 'student_profile'):
                user.student_profile.delete()
            if hasattr(user, 'supervisor_profile'):
                user.supervisor_profile.delete()
            
            # User ni o'chirish
            user.delete()
            return Response({'message': 'Foydalanuvchi muvaffaqiyatli o\'chirildi'}, status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response({'error': 'Foydalanuvchi topilmadi'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'O\'chirishda xatolik: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FacultyViewSet(viewsets.ModelViewSet):
    queryset = Faculty.objects.all()
    serializer_class = FacultySerializer
    permission_classes = [permissions.IsAuthenticated]


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        faculty_id = self.request.query_params.get('faculty_id')
        if faculty_id:
            return Department.objects.filter(faculty_id=faculty_id)
        return Department.objects.all()


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return StudentCreateSerializer
        return StudentSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role in ['super_admin', 'admin']:
            return Student.objects.select_related('user', 'department', 'faculty', 'supervisor', 'company').all()
        elif user.role == 'supervisor':
            return Student.objects.select_related('user', 'department', 'faculty', 'supervisor', 'company').filter(supervisor=user)
        else:
            return Student.objects.select_related('user', 'department', 'faculty', 'supervisor', 'company').filter(user=user)
    
    @action(detail=False, methods=['get'])
    def by_user(self, request):
        """User ID bo'yicha student topish"""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'User ID kerak'}, status=400)
        
        try:
            student = Student.objects.get(user__id=user_id)
            serializer = StudentSerializer(student)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({'error': 'Student topilmadi'}, status=404)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        total_students = Student.objects.count()
        assigned_students = Student.objects.filter(internship_status='start_pending').count()
        active_students = Student.objects.filter(internship_status__in=['start_pending', 'started']).count()
        completed_students = Student.objects.filter(internship_status='completed').count()
        
        return Response({
            'total_students': total_students,
            'assigned_students': assigned_students,
            'active_students': active_students,
            'completed_students': completed_students,
        })


class SupervisorViewSet(viewsets.ModelViewSet):
    queryset = Supervisor.objects.all()
    serializer_class = SupervisorSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SupervisorCreateSerializer
        return SupervisorSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role in ['super_admin', 'admin']:
            return Supervisor.objects.select_related('user', 'company', 'department', 'faculty').all()
        else:
            return Supervisor.objects.select_related('user', 'company', 'department', 'faculty').filter(user=user)
    
    def create(self, request, *args, **kwargs):
        logger.debug("Supervisor create request data:", request.data)
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        logger.debug("Supervisor update request data:", request.data)
        logger.debug("Supervisor update kwargs:", kwargs)
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Supervisor update error: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    @action(detail=False, methods=['get'])
    def by_user(self, request):
        """User ID bo'yicha supervisor topish"""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'User ID kerak'}, status=400)
        
        try:
            supervisor = Supervisor.objects.get(user__id=user_id)
            serializer = SupervisorSerializer(supervisor)
            return Response(serializer.data)
        except Supervisor.DoesNotExist:
            return Response({'error': 'Supervisor topilmadi'}, status=404)


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]


class DailyReportViewSet(viewsets.ModelViewSet):
    queryset = DailyReport.objects.all()
    serializer_class = DailyReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role in ['super_admin', 'admin']:
            return DailyReport.objects.all()
        elif user.role == 'supervisor':
            return DailyReport.objects.filter(internship__supervisor=user)
        else:
            return DailyReport.objects.filter(student__user=user)

    @action(detail=True, methods=['post'])
    def approve_report(self, request, pk=None):
        """Kundalik hisobotni tasdiqlash (supervisor uchun)"""
        try:
            report = self.get_object()
            
            # Faqat supervisor tasdiqlay oladi
            if request.user.role != 'supervisor':
                return Response({'error': 'Faqat supervisor tasdiqlay oladi'}, status=403)
            
            # Supervisor'ning talabasi ekanligini tekshirish
            internship = report.student.internships.filter(supervisor=request.user).first()
            if not internship:
                return Response({'error': 'Bu talaba sizning nazoratingizda emas'}, status=403)
            
            report.status = 'approved'
            report.save()
            
            # DailyStatus ni yangilash
            try:
                daily_status = DailyStatus.objects.get(
                    internship=internship,
                    date=report.date
                )
                daily_status.status = 'report_confirmed'
                daily_status.save()
            except DailyStatus.DoesNotExist:
                pass
            
            serializer = self.get_serializer(report)
            return Response(serializer.data, status=200)
            
        except DailyReport.DoesNotExist:
            return Response({'error': 'Hisobot topilmadi'}, status=404)
        except Exception as e:
            return Response({'error': f'Tasdiqlashda xatolik: {str(e)}'}, status=500)

    @action(detail=True, methods=['post'])
    def reject_report(self, request, pk=None):
        """Kundalik hisobotni rad etish (supervisor uchun)"""
        try:
            report = self.get_object()
            rejection_reason = request.data.get('rejection_reason', '')
            
            # Faqat supervisor rad etay oladi
            if request.user.role != 'supervisor':
                return Response({'error': 'Faqat supervisor rad etay oladi'}, status=403)
            
            # Supervisor'ning talabasi ekanligini tekshirish
            internship = report.student.internships.filter(supervisor=request.user).first()
            if not internship:
                return Response({'error': 'Bu talaba sizning nazoratingizda emas'}, status=403)
            
            report.status = 'rejected'
            report.rejection_reason = rejection_reason
            report.save()
            
            # DailyStatus ni yangilash
            try:
                daily_status = DailyStatus.objects.get(
                    internship=internship,
                    date=report.date
                )
                daily_status.status = 'report_rejected'
                daily_status.rejection_reason = rejection_reason
                daily_status.save()
            except DailyStatus.DoesNotExist:
                pass
            
            serializer = self.get_serializer(report)
            return Response(serializer.data, status=200)
            
        except DailyReport.DoesNotExist:
            return Response({'error': 'Hisobot topilmadi'}, status=404)
        except Exception as e:
            return Response({'error': f'Rad etishda xatolik: {str(e)}'}, status=500)


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role in ['super_admin', 'admin']:
            return Document.objects.all()
        elif user.role == 'supervisor':
            return Document.objects.filter(internship__supervisor=user)
        else:
            return Document.objects.filter(student__user=user)
    
    def perform_create(self, serializer):
        """Hujjat yaratishda student va internship ni to'g'ri belgilash"""
        try:
            # Serializer o'zi student fieldini validatsiya qiladi va internship ni topadi
            serializer.save()
        except Exception as e:
            logger.error(f"Error in DocumentViewSet perform_create: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Hujjatni tasdiqlash"""
        try:
            document = self.get_object()
            
            # Hujjat holatini tekshirish
            if document.status == 'approved':
                return Response({'error': 'Hujjat allaqachon tasdiqlangan'}, status=400)
            
            document.status = 'approved'
            document.rejection_reason = None
            document.save()
            
            serializer = self.get_serializer(document)
            return Response(serializer.data, status=200)
        except Exception as e:
            
            logger.error(f"Error approving document: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({'error': f'Hujjat tasdiqlanmadi: {str(e)}'}, status=400)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Hujjatni rad etish"""
        try:
            document = self.get_object()
            rejection_reason = request.data.get('rejection_reason', '')
            
            if not rejection_reason:
                return Response({'error': 'Rad etish sababi kerak'}, status=400)
            
            # Hujjat holatini tekshirish
            if document.status == 'rejected':
                return Response({'error': 'Hujjat allaqachon rad etilgan'}, status=400)
            
            document.status = 'rejected'
            document.rejection_reason = rejection_reason
            document.save()
            
            serializer = self.get_serializer(document)
            return Response(serializer.data, status=200)
        except Exception as e:
            logger.error(f"Error rejecting document: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({'error': f'Hujjat rad etilmadi: {str(e)}'}, status=400)


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({'message': 'Barcha bildirishnomalar o\'qildi deb belgilandi'})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.save()
        return Response({'message': 'Bildirishnoma o\'qildi deb belgilandi'})


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        if user.role == 'super_admin':
            return self.get_super_admin_dashboard()
        elif user.role == 'admin':
            return self.get_admin_dashboard()
        elif user.role == 'supervisor':
            return self.get_supervisor_dashboard()
        elif user.role == 'student':
            return self.get_student_dashboard()
        
        return Response({'error': 'Noto\'g\'ri rol'}, status=status.HTTP_400_BAD_REQUEST)
    
    def get_super_admin_dashboard(self):
        from django.db.models import Avg, Count
        
        total_users = User.objects.count()
        total_students = Student.objects.count()
        total_supervisors = Supervisor.objects.count()
        total_companies = Company.objects.count()
        
        # Amaliyot statistikasi
        active_internships = Internship.objects.filter(status__in=['start_pending', 'started']).count()
        completed_internships = Internship.objects.filter(status='completed').count()
        graded_internships = Internship.objects.filter(status='graded').count()
        confirmed_internships = Internship.objects.filter(status='confirmed').count()
        
        # Baho statistikasi
        graded_internships_with_grade = Internship.objects.filter(is_graded=True, grade__isnull=False)
        average_grade = graded_internships_with_grade.aggregate(avg_grade=Avg('grade'))['avg_grade'] or 0
        
        # Ishga joylashuv foizi (yakunlangan amaliyotlar / umumiy amaliyotlar)
        total_finished_internships = Internship.objects.filter(status__in=['completed', 'graded', 'confirmed']).count()
        employment_rate = (confirmed_internships / total_finished_internships * 100) if total_finished_internships > 0 else 0
        
        return Response({
            'total_users': total_users,
            'total_students': total_students,
            'total_supervisors': total_supervisors,
            'total_companies': total_companies,
            'active_internships': active_internships,
            'completed_internships': completed_internships,
            'graded_internships': graded_internships,
            'confirmed_internships': confirmed_internships,
            'average_grade': round(average_grade, 2),
            'employment_rate': round(employment_rate, 1),
        })
    
    def get_admin_dashboard(self):
        from django.db.models import Avg
        
        total_students = Student.objects.count()
        assigned_students = Student.objects.filter(internship_status='start_pending').count()
        active_students = Student.objects.filter(internship_status__in=['start_pending', 'started']).count()
        active_companies = Company.objects.filter(status='active').count()
        
        # Amaliyot statistikasi
        completed_internships = Internship.objects.filter(status='completed').count()
        graded_internships = Internship.objects.filter(status='graded').count()
        confirmed_internships = Internship.objects.filter(status='confirmed').count()
        
        # Baho statistikasi
        graded_internships_with_grade = Internship.objects.filter(is_graded=True, grade__isnull=False)
        average_grade = graded_internships_with_grade.aggregate(avg_grade=Avg('grade'))['avg_grade'] or 0
        
        # Ishga joylashuv foizi
        total_finished_internships = Internship.objects.filter(status__in=['completed', 'graded', 'confirmed']).count()
        employment_rate = (confirmed_internships / total_finished_internships * 100) if total_finished_internships > 0 else 0
        
        return Response({
            'total_students': total_students,
            'assigned_students': assigned_students,
            'active_students': active_students,
            'active_companies': active_companies,
            'completed_internships': completed_internships,
            'graded_internships': graded_internships,
            'confirmed_internships': confirmed_internships,
            'average_grade': round(average_grade, 2),
            'employment_rate': round(employment_rate, 1),
        })
    
    def get_supervisor_dashboard(self):
        supervisor = Supervisor.objects.get(user=self.request.user)
        assigned_students = Student.objects.filter(supervisor=self.request.user).count()
        active_internships = Internship.objects.filter(supervisor=self.request.user, status__in=['assigned', 'start_pending', 'started']).count()
        pending_reports = DailyReport.objects.filter(
            internship__supervisor=self.request.user, 
            status='pending'
        ).count()
        
        return Response({
            'assigned_students': assigned_students,
            'active_internships': active_internships,
            'pending_reports': pending_reports,
            'capacity': supervisor.capacity,
            'rating': supervisor.rating,
        })
    
    def get_student_dashboard(self):
        student = Student.objects.get(user=self.request.user)
        reports_count = DailyReport.objects.filter(student=student).count()
        approved_reports = DailyReport.objects.filter(student=student, status='approved').count()
        pending_reports = DailyReport.objects.filter(student=student, status='pending').count()
        
        return Response({
            'internship_status': student.internship_status,
            'reports_count': reports_count,
            'approved_reports': approved_reports,
            'pending_reports': pending_reports,
            'grade': student.grade,
        })


class InternshipViewSet(viewsets.ModelViewSet):
    """Amaliyot ViewSet"""
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """User role ga qarab queryset ni filter qilish"""
        user = self.request.user
        
        if user.role == 'student':
            # Student o'z amaliyotlarini ko'radi
            return Internship.objects.filter(student__user=user)
        elif user.role == 'supervisor':
            # Supervisor o'z rahbarlik qilgan amaliyotlarni ko'radi
            return Internship.objects.filter(supervisor=user)
        elif user.role in ['admin', 'super_admin']:
            # Admin va Super Admin barcha amaliyotlarni ko'radi
            return Internship.objects.all()
        
        return Internship.objects.none()
    
    def perform_create(self, serializer):
        """Amaliyot yaratishda sig'im nazorati"""
        from rest_framework.exceptions import ValidationError
        
        student = serializer.validated_data['student']
        supervisor = serializer.validated_data['supervisor']
        company = serializer.validated_data.get('company')
        
        # Validatsiya
        self._validate_internship_capacity(student, supervisor, company)
        
        # Amaliyot yaratish
        internship = serializer.save(created_by=self.request.user)
        
        # Sig'imlarni yangilash
        self._update_capacities_after_creation(supervisor, company, student)
        
        return internship
    
    def _validate_internship_capacity(self, student, supervisor, company):
        """Amaliyot yaratishdan oldin sig'imlarni tekshirish"""
        from rest_framework.exceptions import ValidationError
        
        # Student faol amaliyoti borligini tekshirish
        if not student.can_start_internship():
            raise ValidationError(
                "Bu talaba allaqachon faol amaliyotda. Yangi amaliyot boshlay olmaydi."
            )
        
        # Supervisor sig'imini tekshirish
        if not supervisor.supervisor_profile.can_accept_student():
            raise ValidationError(
                f"Rahbar sig'imi to'ldi. Maksimal: {supervisor.supervisor_profile.capacity}"
            )
        
        # Company sig'imini tekshirish
        if company and not company.can_accept_student():
            raise ValidationError(
                f"Korxona sig'imi to'ldi. Maksimal: {company.capacity}"
            )
    
    def _update_capacities_after_creation(self, supervisor, company, student):
        """Amaliyot yaratilgandan keyin sig'imlarni yangilash"""
        # Sig'imlarni yangilash
        supervisor.supervisor_profile.assign_student()
        if company:
            company.assign_student()
        
        # Student statusini yangilash
        student.internship_status = 'start_pending'
        student.save()
    
    def perform_update(self, serializer):
        """Amaliyot yangilash"""
        old_instance = self.get_object()
        new_data = serializer.validated_data
        
        # Status o'zgargan bo'lsa
        if 'status' in new_data and new_data['status'] != old_instance.status:
            if new_data['status'] == 'completed':
                old_instance.complete_internship()
            elif new_data['status'] == 'cancelled':
                old_instance.cancel_internship()
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """Amaliyot o'chirish"""
        # Amaliyotni bekor qilish va sig'imlarni qaytarish
        instance.cancel_internship()
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def check_capacity(self, request):
        """Sig'im holatini tekshirish"""
        supervisor_id = request.query_params.get('supervisor_id')
        company_id = request.query_params.get('company_id')
        
        result = {}
        
        if supervisor_id:
            try:
                # Agar supervisor_id raqam bo'lmasa, xatolik qaytarish
                try:
                    supervisor_id_int = int(supervisor_id)
                except ValueError:
                    return Response({'supervisor': {'error': 'Noto\'g\'ri rahbar ID'}}, status=400)
                
                supervisor = Supervisor.objects.get(id=supervisor_id_int)
                result['supervisor'] = {
                    'can_accept': supervisor.can_accept_student(),
                    'assigned': supervisor.assigned_students,
                    'capacity': supervisor.capacity,
                    'available': supervisor.get_available_capacity()
                }
            except Supervisor.DoesNotExist:
                result['supervisor'] = {'error': 'Rahbar topilmadi'}
        
        if company_id:
            try:
                company_id_int = int(company_id)
                company = Company.objects.get(id=company_id_int)
                result['company'] = {
                    'can_accept': company.can_accept_student(),
                    'assigned': company.assigned_students,
                    'capacity': company.capacity,
                    'available': company.get_available_capacity()
                }
            except Company.DoesNotExist:
                result['company'] = {'error': 'Korxona topilmadi'}
        
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def calculate_end_date(self, request):
        """Tugash sanasini hisoblash"""
        from datetime import datetime
        
        start_date_str = request.query_params.get('start_date')
        duration_days = request.query_params.get('duration_days')
        company_id = request.query_params.get('company_id')
        
        if not all([start_date_str, duration_days, company_id]):
            return Response({'error': 'Barcha parametrlar kerak'}, status=400)
        
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            duration_days = int(duration_days)
            company = Company.objects.get(id=company_id)
            
            end_date = company.calculate_work_days_end_date(start_date, duration_days)
            return Response({'end_date': end_date.strftime('%Y-%m-%d')})
        except Company.DoesNotExist:
            return Response({'error': 'Korxona topilmadi'}, status=404)
        except ValueError as e:
            return Response({'error': f'Noto\'g\'ri sana format: {str(e)}'}, status=400)
    
    @action(detail=False, methods=['get'])
    def student_can_start(self, request):
        """Student yangi amaliyot boshlay oladimi?"""
        student_id = request.query_params.get('student_id')
        user_id = request.query_params.get('user_id')
        
        if not student_id and not user_id:
            return Response({'error': 'Student ID yoki User ID kerak'}, status=400)
        
        try:
            if user_id:
                # User ID orqali Student ni topish
                student = Student.objects.get(user__id=user_id)
            elif student_id:
                # Student ID orqali Student ni topish
                student = Student.objects.get(id=student_id)
            else:
                return Response({'error': 'Student ID yoki User ID kerak'}, status=400)
                
            can_start = student.can_start_internship()
            active_internship = student.get_active_internship()
            
            return Response({
                'can_start': can_start,
                'has_active_internship': student.has_active_internship(),
                'active_internship': InternshipSerializer(active_internship).data if active_internship else None
            })
        except Student.DoesNotExist:
            return Response({'error': 'Talaba topilmadi'}, status=404)
    
    @action(detail=False, methods=['get'])
    def supervisor_students(self, request):
        """Supervisor ga biriktirilgan talabalar"""
        supervisor_user_id = request.query_params.get('supervisor_user_id')
        
        if not supervisor_user_id:
            return Response({'error': 'Supervisor User ID kerak'}, status=400)
        
        try:
            # User modelini topamiz
            supervisor_user = User.objects.get(id=supervisor_user_id, role='supervisor')
            # Supervisor profilini topamiz
            supervisor = Supervisor.objects.get(user=supervisor_user)
            # Internship orqali talabalarni topamiz
            internships = Internship.objects.filter(supervisor=supervisor_user)
            student_ids = internships.values_list('student', flat=True)
            students = Student.objects.filter(id__in=student_ids)
            
            return Response({
                'supervisor': SupervisorSerializer(supervisor).data,
                'students': StudentSerializer(students, many=True).data,
                'total_students': students.count(),
                'active_internships': internships.filter(status__in=['assigned', 'start_pending', 'started']).count()
            })
        except (User.DoesNotExist, Supervisor.DoesNotExist):
            return Response({'error': 'Supervisor topilmadi'}, status=404)
    
    @action(detail=False, methods=['get'])
    def supervisor_internships(self, request):
        """Supervisor ga biriktirilgan amaliyotlar"""
        supervisor_user_id = request.query_params.get('supervisor_user_id')
        
        if not supervisor_user_id:
            return Response({'error': 'Supervisor User ID kerak'}, status=400)
        
        try:
            # User modelini topamiz
            supervisor_user = User.objects.get(id=supervisor_user_id, role='supervisor')
            # Supervisor profilini topamiz
            supervisor = Supervisor.objects.get(user=supervisor_user)
            # Amaliyotlarni topamiz - supervisor fieldi User modeliga ishora qiladi
            internships = Internship.objects.filter(supervisor=supervisor_user)
            
            return Response({
                'internships': InternshipSerializer(internships, many=True).data,
                'total_internships': internships.count(),
                'active_internships': internships.filter(status__in=['assigned', 'start_pending', 'started']).count(),
                'completed_internships': internships.filter(status='completed').count()
            })
        except (User.DoesNotExist, Supervisor.DoesNotExist):
            return Response({'error': 'Supervisor topilmadi'}, status=404)
    
    @action(detail=False, methods=['post'])
    def create_daily_report(self, request):
        """Kundalik hisobot yaratish"""
        try:
            student = Student.objects.get(user=request.user)
            internship = student.internships.filter(status__in=['assigned', 'start_pending', 'started']).first()
            
            if not internship:
                return Response({'error': 'Faol amaliyot topilmadi'}, status=400)
            
            # FormData dan ma'lumotlarni olish
            date_str = request.data.get('date')
            activities = request.data.get('activities')
            hours = request.data.get('hours')
            photos = request.FILES.getlist('photos')
            
            if not all([date_str, activities, hours]):
                return Response({'error': 'Barcha maydonlar to\'ldirilishi kerak'}, status=400)
            
            try:
                date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Noto\'g\'ri sana formati'}, status=400)
            
            # Hisobot yaratish
            report_data = {
                'date': date,
                'activities': activities,
                'hours': int(hours),
                'status': 'pending'
            }
            
            serializer = DailyReportSerializer(data=report_data, context={'request': request})
            if serializer.is_valid():
                report = serializer.save()
                
                # Rasmlarni saqlash
                photo_urls = []
                for photo in photos:
                    # Rasmni media papkasiga saqlash
                    photo_path = f"daily_reports/{report.id}/{photo.name}"
                    with open(f"media/{photo_path}", "wb") as f:
                        for chunk in photo.chunks():
                            f.write(chunk)
                    photo_urls.append(photo_path)
                
                if photo_urls:
                    report.photos = photo_urls
                    report.save()
                
                # DailyStatus ni yangilash - hisobot topshirilgan deb belgilash
                try:
                    daily_status = DailyStatus.objects.get(
                        internship=internship,
                        date=date
                    )
                    daily_status.status = 'report_submitted'
                    daily_status.notes += f" | Hisobot topshirildi - {timezone.now().strftime('%H:%M')}"
                    daily_status.save()
                except DailyStatus.DoesNotExist:
                    # Agar DailyStatus yo'q bo'lsa, yaratish
                    DailyStatus.objects.create(
                        internship=internship,
                        date=date,
                        status='report_submitted',
                        notes=f"Hisobot topshirildi - {timezone.now().strftime('%H:%M')}"
                    )
                
                return Response({
                    'message': 'Kundalik hisobot yuborildi',
                    'report_id': report.id,
                    'date': date
                }, status=201)
            return Response(serializer.errors, status=400)
        except Student.DoesNotExist:
            return Response({'error': 'Talaba topilmadi'}, status=404)
    
    @action(detail=False, methods=['get'])
    def get_daily_reports(self, request):
        """Talabaning kundalik hisobotlarini olish"""
        try:
            student = Student.objects.get(user=request.user)
            reports = DailyReport.objects.filter(student=student)
            serializer = DailyReportSerializer(reports, many=True)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({'error': 'Talaba topilmadi'}, status=404)
    
    @action(detail=False, methods=['get'])
    def get_daily_status(self, request):
        """Bugungi kunlik statusni olish"""
        try:
            student = Student.objects.get(user=request.user)
            internship = student.internships.filter(status__in=['assigned', 'start_pending', 'started', 'completed', 'grading', 'graded']).first()
            
            if not internship:
                return Response({'error': 'Faol amaliyot topilmadi'}, status=400)
            
            today = timezone.now().date()
            
            # Bugungi kun uchun status mavjudligini tekshirish
            try:
                daily_status = DailyStatus.objects.get(
                    internship=internship,
                    date=today
                )
                
                return Response({
                    'status': daily_status.status,
                    'start_time': daily_status.start_time.isoformat() if daily_status.start_time else None,
                    'end_time': daily_status.end_time.isoformat() if daily_status.end_time else None,
                    'notes': daily_status.notes,
                    'rejection_reason': daily_status.rejection_reason,
                    'created_at': daily_status.created_at.isoformat()
                })
                
            except DailyStatus.DoesNotExist:
                return Response({
                    'status': None,
                    'start_time': None,
                    'end_time': None,
                    'notes': None,
                    'rejection_reason': None,
                    'created_at': None
                })
            
        except Student.DoesNotExist:
            return Response({'error': 'Talaba topilmadi'}, status=404)
        except Exception as e:
            logger.error(f"Error getting daily status: {str(e)}")
            return Response({'error': 'Kunlik statusni olishda xatolik'}, status=500)
    
    @action(detail=False, methods=['post'])
    def upload_document(self, request):
        """Hujjat yuklash"""
        try:
            student = Student.objects.get(user=request.user)
            internship = student.internships.filter(status__in=['assigned', 'start_pending', 'started']).first()
            
            if not internship:
                return Response({'error': 'Faol amaliyot topilmadi'}, status=400)
            
            serializer = DocumentSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(student=student, internship=internship)
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)
        except Student.DoesNotExist:
            return Response({'error': 'Talaba topilmadi'}, status=404)
    
    @action(detail=False, methods=['get'])
    def get_documents(self, request):
        """Talabaning hujjatlarini olish"""
        try:
            student = Student.objects.get(user=request.user)
            documents = Document.objects.filter(student=student)
            serializer = DocumentSerializer(documents, many=True)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({'error': 'Talaba topilmadi'}, status=404)
    
    @action(detail=False, methods=['post'])
    def submit_final_report(self, request):
        """Yakuniy hisobot yuborish"""
        try:
            student = Student.objects.get(user=request.user)
            internship = student.internships.filter(status__in=['assigned', 'start_pending', 'started']).first()
            
            if not internship:
                return Response({'error': 'Faol amaliyot topilmadi'}, status=400)
            
            # Yakuniy hisobot hujjati sifatida yuklash
            document_data = {
                'type': 'report',
                'name': request.data.get('name', 'Yakuniy hisobot'),
                'file': request.data.get('file')
            }
            
            serializer = DocumentSerializer(data=document_data)
            if serializer.is_valid():
                serializer.save(student=student, internship=internship)
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)
        except Student.DoesNotExist:
            return Response({'error': 'Talaba topilmadi'}, status=404)

    @action(detail=True, methods=['post'])
    def grade_internship(self, request, pk=None):
        """Amaliyotni baholash (faqat supervisor)"""
        try:
            internship = self.get_object()

            # Faqat supervisor baholaydi
            if request.user.role != 'supervisor':
                return Response({'error': 'Faqat rahbarlar baholaydi'}, status=403)

            # Supervisor o'z amaliyotlarini baholaydi
            if internship.supervisor != request.user:
                return Response({'error': 'Bu amaliyotni baholash huquqi yo\'q'}, status=403)

            # Faqat yakunlangan amaliyotlar baholanadi
            if internship.status != 'completed':
                return Response({'error': 'Faqat yakunlangan amaliyotlar baholanadi'}, status=400)

            # Faqat 1 marta baholash
            if internship.is_graded:
                return Response({'error': 'Bu amaliyot allaqachon baholangan'}, status=400)

            # Baho va comment olish
            score = request.data.get('score')
            comment = request.data.get('comment', '')

            if score is None:
                return Response({'error': 'Baho kiritilishi majburiy'}, status=400)

            try:
                score = float(score)
            except (ValueError, TypeError):
                return Response({'error': 'Baho raqam bo\'lishi kerak'}, status=400)

            # Baholash
            success, message = internship.grade_internship(score, comment, request.user)

            if success:
                # Yangilangan ma'lumotlarni qaytarish
                serializer = InternshipSerializer(internship)
                return Response({
                    'message': message,
                    'internship': serializer.data
                })
            else:
                return Response({'error': message}, status=400)

        except Internship.DoesNotExist:
            return Response({'error': 'Amaliyot topilmadi'}, status=404)
        except Exception as e:
            return Response({'error': f'Baholashda xatolik: {str(e)}'}, status=500)

    @action(detail=True, methods=['post'])
    def confirm_internship(self, request, pk=None):
        """Amaliyotni yakunlash (faqat admin/super_admin)"""
        try:
            internship = self.get_object()

            # Faqat admin va super_admin yakunlaydi
            if request.user.role not in ['admin', 'super_admin']:
                return Response({'error': 'Faqat adminlar amaliyotni yakunlaydi'}, status=403)

            # Faqat baholangan amaliyotlar yakunlanadi
            if internship.status != 'graded':
                return Response({'error': 'Faqat baholangan amaliyotlar yakunlanadi'}, status=400)

            # Statusni 'confirmed' ga o'tkazish
            internship.status = 'confirmed'
            internship.save()

            # Student statusini ham yangilash
            internship.student.internship_status = 'confirmed'
            internship.student.save()

            # Yangilangan ma'lumotlarni qaytarish
            serializer = InternshipSerializer(internship)
            return Response({
                'message': 'Amaliyot muvaffaqiyatli yakunlandi',
                'internship': serializer.data
            })

        except Internship.DoesNotExist:
            return Response({'error': 'Amaliyot topilmadi'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def start_day(self, request, pk=None):
        """Kunni boshlash"""
        try:
            internship = self.get_object()
            today = timezone.now().date()
            
            # Student ekanligini tekshirish
            if request.user.role != 'student':
                return Response({'error': 'Faqat talaba kunni boshlay oladi'}, status=403)
            
            # Talabaning amaliyoti ekanligini tekshirish
            student = Student.objects.get(user=request.user)
            if internship.student != student:
                return Response({'error': 'Bu sizning amaliyotingiz emas'}, status=403)
            
            # Bugungi kun uchun status mavjudligini tekshirish
            existing_status = DailyStatus.objects.filter(
                internship=internship,
                date=today
            ).first()
            
            if existing_status:
                if existing_status.status == 'day_start':
                    return Response({
                        'error': 'Bugungi kun allaqachon boshlangan',
                        'start_time': existing_status.start_time.isoformat() if existing_status.start_time else None
                    }, status=400)
                else:
                    # Mavjud statusni yangilash
                    existing_status.status = 'day_start'
                    existing_status.start_time = timezone.now().time()
                    existing_status.notes = f"Kunni boshlash - {timezone.now().strftime('%H:%M')}"
                    existing_status.save()
                    daily_status = existing_status
            else:
                # Yangi kunni boshlash statusi yaratish
                daily_status = DailyStatus.objects.create(
                    internship=internship,
                    date=today,
                    status='day_start',
                    start_time=timezone.now().time(),
                    notes=f"Kunni boshlash - {timezone.now().strftime('%H:%M')}"
                )
            
            return Response({
                'message': 'Kun muvaffaqiyatli boshlandi',
                'daily_status': {
                    'id': daily_status.id,
                    'status': daily_status.status,
                    'start_time': daily_status.start_time.isoformat(),
                    'date': daily_status.date.isoformat(),
                    'notes': daily_status.notes
                }
            }, status=201)
            
        except Student.DoesNotExist:
            return Response({'error': 'Talaba topilmadi'}, status=404)
        except Exception as e:
            return Response({'error': f'Kunni boshlashda xatolik: {str(e)}'}, status=500)

    @action(detail=True, methods=['post'])
    def end_day(self, request, pk=None):
        """Kunni yakunlash"""
        try:
            internship = self.get_object()
            today = timezone.now().date()
            
            # Student ekanligini tekshirish
            if request.user.role != 'student':
                return Response({'error': 'Faqat talaba kunni yakunlay oladi'}, status=403)
            
            # Talabaning amaliyoti ekanligini tekshirish
            student = Student.objects.get(user=request.user)
            if internship.student != student:
                return Response({'error': 'Bu sizning amaliyotingiz emas'}, status=403)
            
            # Bugungi kun uchun status ni topish
            daily_status = DailyStatus.objects.filter(
                internship=internship,
                date=today
            ).first()
            
            if not daily_status:
                return Response({
                    'error': 'Bugungi kun boshlanmagan'
                }, status=400)
            
            # Agar kunni yakunlangan bo'lsa
            if daily_status.status == 'day_completed':
                return Response({
                    'error': 'Bugungi kun allaqachon yakunlangan',
                    'end_time': daily_status.end_time.isoformat() if daily_status.end_time else None
                }, status=400)
            
            # Kunni yakunlash
            daily_status.status = 'day_completed'
            daily_status.end_time = timezone.now().time()
            daily_status.notes += f" | Kunni yakunlash - {timezone.now().strftime('%H:%M')}"
            daily_status.save()
            
            return Response({
                'message': 'Kun muvaffaqiyatli yakunlandi',
                'daily_status': {
                    'id': daily_status.id,
                    'status': daily_status.status,
                    'start_time': daily_status.start_time.isoformat(),
                    'end_time': daily_status.end_time.isoformat(),
                    'date': daily_status.date.isoformat(),
                    'notes': daily_status.notes
                }
            }, status=200)
            
        except Student.DoesNotExist:
            return Response({'error': 'Talaba topilmadi'}, status=404)
        except Exception as e:
            return Response({'error': f'Kunni yakunlashda xatolik: {str(e)}'}, status=500)
    
    @action(detail=True, methods=['post'])
    def approve_day_start(self, request, pk=None):
        """Supervisor tomonidan kun boshlashni tasdiqlash"""
        try:
            internship = self.get_object()
            daily_status_id = request.data.get('daily_status_id')
            
            if not daily_status_id:
                return Response({'error': 'daily_status_id kerak'}, status=400)
            
            # Supervisor ekanligini tekshirish
            if request.user.role not in ['supervisor', 'admin', 'super_admin']:
                return Response({'error': 'Faqat rahbar, admin yoki super admin tasdiqlay oladi'}, status=403)
            
            # Supervisor ekanligini tekshirish (faqat supervisor uchun)
            if request.user.role == 'supervisor':
                if internship.supervisor != request.user:
                    return Response({'error': 'Bu sizning amaliyotingiz emas'}, status=403)
            
            # DailyStatus ni topish
            daily_status = DailyStatus.objects.get(id=daily_status_id)
            
            if daily_status.status != 'day_start':
                return Response({'error': 'Bu status tasdiqlash uchun mos emas'}, status=400)
            
            # Statusni tasdiqlash
            daily_status.status = 'start_confirmed'
            daily_status.notes += f" | Supervisor tasdiqladi - {timezone.now().strftime('%H:%M')}"
            daily_status.save()
            
            # WebSocket orqali student ga bildirish
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"student_{internship.student.user.id}",
                    {
                        'type': 'daily_status_update',
                        'message': {
                            'internship_id': internship.id,
                            'date': daily_status.date.isoformat(),
                            'status': 'start_confirmed',
                            'action': 'approved',
                            'daily_status_id': daily_status.id
                        }
                    }
                )
            
            return Response({
                'message': 'Kun boshlash tasdiqlandi',
                'daily_status': {
                    'id': daily_status.id,
                    'status': daily_status.status,
                    'start_time': daily_status.start_time.isoformat(),
                    'notes': daily_status.notes
                }
            }, status=200)
            
        except DailyStatus.DoesNotExist:
            return Response({'error': 'Kunlik status topilmadi'}, status=404)
        except Exception as e:
            logger.error(f"Error approving day start: {str(e)}")
            return Response({'error': 'Kun boshlashni tasdiqlashda xatolik'}, status=500)
    
    @action(detail=True, methods=['post'])
    def reject_day_start(self, request, pk=None):
        """Supervisor tomonidan kun boshlashni rad etish"""
        try:
            internship = self.get_object()
            daily_status_id = request.data.get('daily_status_id')
            rejection_reason = request.data.get('rejection_reason', '')
            
            if not daily_status_id:
                return Response({'error': 'daily_status_id kerak'}, status=400)
            
            if not rejection_reason:
                return Response({'error': 'Rad etish sababi kerak'}, status=400)
            
            # Supervisor ekanligini tekshirish
            if request.user.role not in ['supervisor', 'admin', 'super_admin']:
                return Response({'error': 'Faqat rahbar, admin yoki super admin rad eta oladi'}, status=403)
            
            # Supervisor ekanligini tekshirish (faqat supervisor uchun)
            if request.user.role == 'supervisor':
                if internship.supervisor != request.user:
                    return Response({'error': 'Bu sizning amaliyotingiz emas'}, status=403)
            
            # DailyStatus ni topish
            daily_status = DailyStatus.objects.get(id=daily_status_id)
            
            if daily_status.status != 'day_start':
                return Response({'error': 'Bu status rad etish uchun mos emas'}, status=400)
            
            # Statusni rad etish
            daily_status.status = 'start_rejected'
            daily_status.rejection_reason = rejection_reason
            daily_status.notes += f" | Supervisor rad etdi - {timezone.now().strftime('%H:%M')}"
            daily_status.save()
            
            # WebSocket orqali student ga bildirish
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"student_{internship.student.user.id}",
                    {
                        'type': 'daily_status_update',
                        'message': {
                            'internship_id': internship.id,
                            'date': daily_status.date.isoformat(),
                            'status': 'start_rejected',
                            'action': 'rejected',
                            'rejection_reason': rejection_reason,
                            'daily_status_id': daily_status.id
                        }
                    }
                )
            
            return Response({
                'message': 'Kun boshlash rad etildi',
                'daily_status': {
                    'id': daily_status.id,
                    'status': daily_status.status,
                    'rejection_reason': daily_status.rejection_reason,
                    'notes': daily_status.notes
                }
            }, status=200)
            
        except DailyStatus.DoesNotExist:
            return Response({'error': 'Kunlik status topilmadi'}, status=404)
        except Exception as e:
            logger.error(f"Error rejecting day start: {str(e)}")
            return Response({'error': 'Kun boshlashni rad etishda xatolik'}, status=500)


class DailyStatusViewSet(viewsets.ModelViewSet):
    """Kunlik status ViewSet"""
    queryset = DailyStatus.objects.all()
    serializer_class = DailyStatusSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """User role ga qarab queryset ni filter qilish"""
        user = self.request.user
        
        if user.role == 'student':
            # Student o'z kunlik statuslarini ko'radi
            return DailyStatus.objects.filter(internship__student__user=user)
        elif user.role == 'supervisor':
            # Supervisor o'z rahbarlik qilgan amaliyotlarning kunlik statuslarini ko'radi
            return DailyStatus.objects.filter(internship__supervisor=user)
        elif user.role in ['admin', 'super_admin']:
            # Admin va Super Admin barcha kunlik statuslarni ko'radi
            return DailyStatus.objects.all()
        
        return DailyStatus.objects.none()
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Kunlik statusni yangilash"""
        try:
            daily_status = self.get_object()
            new_status = request.data.get('status')
            rejection_reason = request.data.get('rejection_reason', '')
            
            # Status validatsiyasi
            valid_statuses = [choice[0] for choice in DailyStatus.DAILY_STATUS_CHOICES]
            if new_status not in valid_statuses:
                return Response({'error': 'Noto\'g\'ri status'}, status=400)
            
            # Ruxsat tekshirish
            user = request.user
            if user.role not in ['supervisor', 'admin', 'super_admin']:
                return Response({'error': 'Ruxsat yo\'q'}, status=403)
            
            # Status yangilash
            daily_status.status = new_status
            if rejection_reason:
                daily_status.rejection_reason = rejection_reason
            daily_status.save()
            
            serializer = DailyStatusSerializer(daily_status)
            return Response(serializer.data)
            
        except DailyStatus.DoesNotExist:
            return Response({'error': 'Kunlik status topilmadi'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    
    @action(detail=True, methods=['post'])
    def start_day(self, request, pk=None):
        """Kunni boshlash - supervisor tasdiqlashini kutish"""
        internship = self.get_object()
        today = timezone.now().date()
        
        # Bugungi kun uchun status mavjudligini tekshirish
        existing_status = DailyStatus.objects.filter(
            internship=internship,
            date=today
        ).first()
        
        if existing_status:
            return Response({
                'error': 'Bugungi kun uchun status allaqachon mavjud',
                'status': existing_status.status,
                'daily_status': {
                    'id': existing_status.id,
                    'status': existing_status.status,
                    'start_time': existing_status.start_time,
                    'notes': existing_status.notes
                }
            }, status=400)
        
        # Yangi kunni boshlash statusi yaratish - supervisor tasdiqlashini kutish
        daily_status = DailyStatus.objects.create(
            internship=internship,
            date=today,
            status='day_start',  # Avval day_start, keyin supervisor tasdiqlaydi
            start_time=timezone.now().time(),
            notes=f"Kunni boshlash so'rovi - {timezone.now().strftime('%H:%M')}. Supervisor tasdiqlashini kutmoqda."
        )
        
        # WebSocket orqali supervisor ga bildirish
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"supervisor_{internship.supervisor.user.id}",
                {
                    'type': 'daily_status_update',
                    'message': {
                        'internship_id': internship.id,
                        'student_name': internship.student.user.get_full_name(),
                        'date': today.isoformat(),
                        'status': 'day_start',
                        'action': 'approval_needed',
                        'daily_status_id': daily_status.id
                    }
                }
            )
        
        return Response({
            'message': 'Kunni boshlash so\'rovi yuborildi. Supervisor tasdiqlashini kuting.',
            'daily_status': {
                'id': daily_status.id,
                'status': daily_status.status,
                'start_time': daily_status.start_time,
                'notes': daily_status.notes,
                'needs_approval': True
            }
        }, status=200)
    
    @action(detail=True, methods=['post'])
    def end_day(self, request, pk=None):
        """Kunni yakunlash"""
        internship = self.get_object()
        today = timezone.now().date()
        
        # Bugungi kun uchun boshlash statusini topish
        daily_status = DailyStatus.objects.filter(
            internship=internship,
            date=today,
            status='day_start'
        ).first()
        
        if not daily_status:
            return Response({
                'error': 'Bugungi kun boshlanmagan'
            }, status=400)
        
        # Kunni yakunlash
        daily_status.status = 'day_completed'
        daily_status.end_time = timezone.now().time()
        daily_status.notes += f" | Kunni yakunlash - {timezone.now().strftime('%H:%M')}"
        daily_status.save()
        
        return Response({
            'message': 'Kunni yakunlash muvaffaqiyatli',
            'end_time': daily_status.end_time,
            'date': today
        })
    
    @action(detail=True, methods=['post'])
    def update_daily_status(self, request, pk=None):
        """Kunlik statusni yangilash (supervisor uchun)"""
        internship = self.get_object()
        daily_status_id = request.data.get('daily_status_id')
        new_status = request.data.get('status')
        rejection_reason = request.data.get('rejection_reason', '')
        
        try:
            daily_status = DailyStatus.objects.get(
                id=daily_status_id,
                internship=internship
            )
            
            # Status yangilash
            daily_status.status = new_status
            if rejection_reason:
                daily_status.rejection_reason = rejection_reason
            
            # Qo'shimcha ma'lumotlar
            if new_status == 'start_confirmed':
                daily_status.notes += f" | Tasdiqlandi - {timezone.now().strftime('%H:%M')}"
            elif new_status == 'start_rejected':
                daily_status.notes += f" | Rad etildi - {timezone.now().strftime('%H:%M')}"
            elif new_status == 'report_confirmed':
                daily_status.notes += f" | Hisobot tasdiqlandi - {timezone.now().strftime('%H:%M')}"
                # Hisobot statusini ham yangilash
                try:
                    report = DailyReport.objects.get(
                        internship=internship,
                        date=daily_status.date
                    )
                    report.status = 'approved'
                    report.save()
                except DailyReport.DoesNotExist:
                    pass
            elif new_status == 'report_rejected':
                daily_status.notes += f" | Hisobot rad etildi - {timezone.now().strftime('%H:%M')}"
                # Hisobot statusini ham yangilash
                try:
                    report = DailyReport.objects.get(
                        internship=internship,
                        date=daily_status.date
                    )
                    report.status = 'rejected'
                    report.rejection_reason = rejection_reason
                    report.save()
                except DailyReport.DoesNotExist:
                    pass
            elif new_status == 'resubmitted':
                daily_status.notes += f" | Qayta topshirildi - {timezone.now().strftime('%H:%M')}"
            elif new_status == 'day_completed':
                daily_status.notes += f" | Kunni yakunlash - {timezone.now().strftime('%H:%M')}"
                daily_status.end_time = timezone.now().time()
            
            daily_status.save()
            
            # WebSocket orqali real-time yangilanish yuborish
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f'internship_{internship.id}',
                    {
                        'type': 'daily_status_update',
                        'data': {
                            'daily_status_id': daily_status.id,
                            'status': daily_status.status,
                            'date': daily_status.date.isoformat(),
                            'notes': daily_status.notes,
                            'rejection_reason': daily_status.rejection_reason,
                            'start_time': daily_status.start_time.isoformat() if daily_status.start_time else None,
                            'end_time': daily_status.end_time.isoformat() if daily_status.end_time else None,
                        }
                    }
                )
            
            return Response({
                'message': 'Status muvaffaqiyatli yangilandi',
                'daily_status': {
                    'id': daily_status.id,
                    'status': daily_status.status,
                    'date': daily_status.date,
                    'notes': daily_status.notes,
                    'rejection_reason': daily_status.rejection_reason
                }
            })
            
        except DailyStatus.DoesNotExist:
            return Response({'error': 'Kunlik status topilmadi'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)