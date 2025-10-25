import pandas as pd
import os
from django.conf import settings
from django.contrib.auth import get_user_model
from .models import Student, Faculty, Department
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class HemisImportView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Faqat super_admin va admin import qila oladi
        if request.user.role not in ['super_admin', 'admin']:
            return Response(
                {'error': 'Import qilish uchun ruxsatingiz yo\'q'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'Fayl yuklanmagan'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Fayl turini tekshirish
        if not file.name.endswith(('.xlsx', '.xls', '.csv')):
            return Response(
                {'error': 'Faqat Excel (.xlsx, .xls) yoki CSV fayllar qabul qilinadi'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Faylni vaqtincha saqlash
            temp_path = os.path.join(settings.MEDIA_ROOT, 'temp', file.name)
            os.makedirs(os.path.dirname(temp_path), exist_ok=True)
            
            with open(temp_path, 'wb') as temp_file:
                for chunk in file.chunks():
                    temp_file.write(chunk)
            
            # Faylni o'qish
            if file.name.endswith('.csv'):
                # Turli encodinglarni sinab ko'rish
                encodings = ['utf-8', 'utf-8-sig', 'cp1251', 'latin1', 'iso-8859-1']
                df = None
                for encoding in encodings:
                    try:
                        df = pd.read_csv(temp_path, encoding=encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                
                if df is None:
                    return Response(
                        {'error': 'Fayl encoding xatoligi - faylni UTF-8 formatida saqlang'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                df = pd.read_excel(temp_path)
            
            # Faylni o'chirish
            os.remove(temp_path)
            
            # Ma'lumotlarni import qilish
            result = self.import_students(df)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Import xatoligi: {str(e)}")
            return Response(
                {'error': f'Import jarayonida xatolik: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def import_students(self, df):
        success_count = 0
        failed_count = 0
        duplicate_count = 0
        errors = []
        
        # DataFrame ustunlarini tekshirish va tozalash
        df.columns = df.columns.str.strip()
        
        # Kerakli ustunlarni tekshirish
        required_columns = ['Talaba ID', 'Fakultet', 'Kurs', 'Guruh', 'Pasport raqami']
        
        # To'liq ismi ustuni uchun turli variantlarni tekshirish
        name_column = None
        name_variants = ["To'liq ismi", "To'liq ismi", "Toliq ismi", "Ism", "FIO", "To‘liq ismi"]
        for variant in name_variants:
            if variant in df.columns:
                name_column = variant
                break
        
        if name_column is None:
            return {
                'success': 0,
                'failed': 0,
                'duplicates': 0,
                'errors': [f'To\'liq ismi ustuni topilmadi. Mavjud ustunlar: {", ".join(df.columns.tolist())}']
            }
        
        required_columns.append(name_column)
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return {
                'success': 0,
                'failed': 0,
                'duplicates': 0,
                'errors': [f'Kerakli ustunlar topilmadi: {", ".join(missing_columns)}']
            }
        
        for index, row in df.iterrows():
            try:
                # Ma'lumotlarni olish
                student_id = str(row['Talaba ID']).strip()
                full_name = str(row[name_column]).strip()
                faculty_name = str(row['Fakultet']).strip()
                
                # Kurs ma'lumotini to'g'ri parse qilish
                course_raw = str(row['Kurs']).strip()
                course = 1
                if course_raw and course_raw != 'nan':
                    # "3-kurs" formatini "3" ga o'tkazish
                    course_str = course_raw.replace('-kurs', '').replace('kurs', '').strip()
                    try:
                        course = int(course_str)
                    except:
                        course = 1
                
                group = str(row['Guruh']).strip()
                passport = str(row['Pasport raqami']).strip()
                
                # Qo'shimcha ma'lumotlar (agar mavjud bo'lsa)
                phone = str(row.get('Telefon', '')).strip() if pd.notna(row.get('Telefon', '')) else ''
                birth_date_raw = row.get('Tug‘ilgan sana', '')
                birth_date = None
                if pd.notna(birth_date_raw) and str(birth_date_raw).strip():
                    try:
                        # Turli formatlarni sinab ko'rish
                        from datetime import datetime
                        birth_date = pd.to_datetime(birth_date_raw).date()
                    except:
                        birth_date = None
                address = str(row.get('Manzil', '')).strip() if pd.notna(row.get('Manzil', '')) else ''
                parent_phone = str(row.get('Ota-ona telefoni', '')).strip() if pd.notna(row.get('Ota-ona telefoni', '')) else ''
                
                # Viloyat va Tuman ma'lumotlari
                region = str(row.get('Viloyat', '')).strip() if pd.notna(row.get('Viloyat', '')) else ''
                district = str(row.get('Tuman', '')).strip() if pd.notna(row.get('Tuman', '')) else ''
                
                # Jins ma'lumoti
                gender = str(row.get('Jins', '')).strip() if pd.notna(row.get('Jins', '')) else ''
                
                # JSHSHIR kod
                jshshir = str(row.get('JSHSHIR-kod', '')).strip() if pd.notna(row.get('JSHSHIR-kod', '')) else ''
                
                # Ta'lim ma'lumotlari
                education_language = str(row.get("Ta'lim tili", '')).strip() if pd.notna(row.get("Ta'lim tili", '')) else ''
                academic_year = str(row.get('O‘quv yili', '')).strip() if pd.notna(row.get('O‘quv yili', '')) else ''
                semester = str(row.get('Semestr', '')).strip() if pd.notna(row.get('Semestr', '')) else ''
                is_graduate = str(row.get('Bitiruvchi', '')).strip() if pd.notna(row.get('Bitiruvchi', '')) else ''
                specialization = str(row.get('Mutaxassislik', '')).strip() if pd.notna(row.get('Mutaxassislik', '')) else ''
                education_type = str(row.get('Ta’lim turi', '')).strip() if pd.notna(row.get('Ta’lim turi', '')) else ''
                education_form = str(row.get('Ta’lim shakli', '')).strip() if pd.notna(row.get('Ta’lim shakli', '')) else ''
                
                # Talaba allaqachon mavjudligini tekshirish
                if Student.objects.filter(student_id=student_id).exists():
                    duplicate_count += 1
                    continue
                
                # Fakultet yaratish yoki olish
                faculty, created = Faculty.objects.get_or_create(
                    name=faculty_name,
                    defaults={'description': f'{faculty_name} fakulteti'}
                )
                
                # Mutaxassislik asosida kafedra nomini aniqlash
                department_name = specialization if specialization else f'{faculty_name} kafedrasi'
                
                # Kafedra yaratish yoki olish
                department, created = Department.objects.get_or_create(
                    name=department_name,
                    faculty=faculty,
                    defaults={'description': f'{department_name} kafedrasi'}
                )
                
                # Foydalanuvchi yaratish
                username = student_id  # Login = Talaba ID
                password = passport    # Parol = Pasport raqami
                
                # Foydalanuvchi yaratish
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    first_name=full_name.split()[0] if full_name.split() else '',
                    last_name=' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else '',
                    role='student',
                    phone=phone
                )
                
                # Amaliyot turini aniqlash
                internship_type_raw = str(row.get('Amaliyot turi', '')).strip() if pd.notna(row.get('Amaliyot turi', '')) else ''
                internship_type = 'belgilanmagan'
                if internship_type_raw:
                    # Amaliyot turini mapping qilish
                    type_mapping = {
                        'malaka': 'malaka',
                        'pedagogik': 'pedagogik', 
                        'ilmiy': 'ilmiy',
                        'ishlab_chiqarish': 'ishlab_chiqarish'
                    }
                    internship_type = type_mapping.get(internship_type_raw.lower(), 'belgilanmagan')
                
                # Talaba profilini yaratish
                student = Student.objects.create(
                    user=user,
                    student_id=student_id,
                    faculty=faculty,
                    department=department,
                    course=course,
                    group=group,
                    passport=passport,
                    birth_date=birth_date,
                    internship_type=internship_type,
                    internship_status='waiting',
                    auto_generated_password=password,
                    is_password_changed=False,
                    # HEMIS qo'shimcha ma'lumotlari
                    region=region,
                    district=district,
                    gender=gender,
                    jshshir=jshshir,
                    education_language=education_language,
                    academic_year=academic_year,
                    semester=semester,
                    is_graduate=is_graduate,
                    specialization=specialization,
                    education_type=education_type,
                    education_form=education_form
                )
                
                success_count += 1
                logger.info(f"Talaba yaratildi: {full_name} ({student_id})")
                
            except Exception as e:
                failed_count += 1
                error_msg = f"Qator {index + 2}: {str(e)}"
                errors.append(error_msg)
                logger.error(f"Talaba yaratishda xatolik: {error_msg}")
        
        return {
            'success': success_count,
            'failed': failed_count,
            'duplicates': duplicate_count,
            'errors': errors,
            'message': f'Muvaffaqiyatli: {success_count}, Xatolik: {failed_count}, Takroriy: {duplicate_count}'
        }


class HemisTemplateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Faqat super_admin va admin template ko'ra oladi
        if request.user.role not in ['super_admin', 'admin']:
            return Response(
                {'error': 'Template ko\'rish uchun ruxsatingiz yo\'q'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        template_info = {
            'required_columns': [
                'Talaba ID',
                'To\'liq ismi', 
                'Fakultet',
                'Kurs',
                'Guruh',
                'Pasport raqami'
            ],
            'optional_columns': [
                'Viloyat',
                'Tuman',
                'Jins',
                'Tug\'ilgan sana',
                'JSHSHIR-kod',
                'Ta\'lim tili',
                'O\'quv yili',
                'Semestr',
                'Bitiruvchi',
                'Mutaxassislik',
                'Ta\'lim turi',
                'Ta\'lim shakli',
                'Telefon',
                'Manzil',
                'Ota-ona telefoni'
            ],
            'example_data': {
                'Talaba ID': 'ST2024001',
                'To\'liq ismi': 'Ahmadov Ahmad Ahmad o\'g\'li',
                'Viloyat': 'Toshkent',
                'Tuman': 'Yunusobod',
                'Jins': 'Erkak',
                'Tug\'ilgan sana': '2002-05-15',
                'Pasport raqami': 'AA1234567',
                'JSHSHIR-kod': '12345678901234',
                'Kurs': 4,
                'Fakultet': 'Informatika',
                'Guruh': 'IT-401',
                'Ta\'lim tili': 'O\'zbek',
                'O\'quv yili': '2024-2025',
                'Semestr': '8',
                'Bitiruvchi': 'Ha',
                'Mutaxassislik': 'Dasturiy injiniring',
                'Ta\'lim turi': 'Bakalavr',
                'Ta\'lim shakli': 'Kunduzgi',
                'Telefon': '+998901234567',
                'Manzil': 'Toshkent sh., Yunusobod t.',
                'Ota-ona telefoni': '+998901234568'
            },
            'login_info': {
                'login': 'Talaba ID (masalan: ST2024001)',
                'password': 'Pasport raqami (masalan: AA1234567)'
            }
        }
        
        return Response(template_info)
