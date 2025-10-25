# Amaliyot Platformasi API Dokumentatsiyasi

## Umumiy ma'lumot

**Base URL:** `http://localhost:8000/api/`

**Autentifikatsiya:** Session-based authentication (CSRF token bilan)

**Content-Type:** `application/json`

---

## Autentifikatsiya

### 1. CSRF Token olish
```http
GET /api/auth/csrf/
```

**Response:**
```json
{
  "csrfToken": "csrf_token_value"
}
```

### 2. Login
```http
POST /api/auth/login/
```

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Muvaffaqiyatli kirildi",
  "user": {
    "id": 1,
    "username": "admin",
    "first_name": "Admin",
    "last_name": "User",
    "role": "admin",
    "role_display": "Admin"
  }
}
```

### 3. Logout
```http
POST /api/auth/logout/
```

**Response:**
```json
{
  "message": "Muvaffaqiyatli chiqildi"
}
```

---

## Dashboard API

### Dashboard ma'lumotlari
```http
GET /api/dashboard/
```

**Response (Super Admin):**
```json
{
  "total_users": 150,
  "total_students": 120,
  "total_supervisors": 25,
  "total_companies": 10,
  "active_internships": 45,
  "completed_internships": 30,
  "graded_internships": 25,
  "confirmed_internships": 20,
  "average_grade": 4.2,
  "employment_rate": 66.7
}
```

**Response (Admin):**
```json
{
  "total_students": 120,
  "assigned_students": 45,
  "active_companies": 10,
  "active_internships": 45,
  "completed_internships": 30,
  "graded_internships": 25,
  "confirmed_internships": 20,
  "average_grade": 4.2,
  "employment_rate": 66.7
}
```

**Response (Supervisor):**
```json
{
  "total_students": 8,
  "active_internships": 5,
  "completed_internships": 3,
  "total_internships": 8
}
```

**Response (Student):**
```json
{
  "active_internship": {
    "id": 1,
    "status": "started",
    "progress_percentage": 60,
    "completed_days": 12,
    "remaining_days": 8
  }
}
```

---

## Users API

### Barcha foydalanuvchilarni olish
```http
GET /api/users/
```

**Query Parameters:**
- `role` - Foydalanuvchi roli (super_admin, admin, supervisor, student)
- `search` - Qidiruv matni

**Response:**
```json
{
  "count": 150,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "username": "admin",
      "first_name": "Admin",
      "last_name": "User",
      "role": "admin",
      "role_display": "Admin",
      "email": "admin@example.com",
      "phone": "+998901234567",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Foydalanuvchi yaratish (Super Admin)
```http
POST /api/users/
```

**Request Body:**
```json
{
  "username": "new_admin",
  "first_name": "New",
  "last_name": "Admin",
  "password": "password123",
  "role": "admin",
  "email": "newadmin@example.com",
  "phone": "+998901234567"
}
```

### Foydalanuvchi ma'lumotlarini olish
```http
GET /api/users/{id}/
```

### Foydalanuvchi ma'lumotlarini yangilash
```http
PUT /api/users/{id}/
PATCH /api/users/{id}/
```

### Foydalanuvchini o'chirish (Super Admin)
```http
DELETE /api/users/{id}/
```

---

## Students API

### Barcha talabalarni olish
```http
GET /api/students/
```

**Query Parameters:**
- `faculty` - Fakultet ID
- `department` - Kafedra ID
- `course` - Kurs
- `group` - Guruh
- `internship_status` - Amaliyot holati
- `search` - Qidiruv matni

**Response:**
```json
{
  "count": 120,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Ahmad Karimov",
      "student_id": "2021001",
      "hemisId": "HEMIS001",
      "faculty": "IT",
      "department": "Computer Science",
      "course": 3,
      "group": "CS-21-1",
      "phone": "+998901234567",
      "internshipType": "malaka",
      "internshipStatus": "assigned",
      "supervisorId": 1,
      "companyId": 1,
      "supervisorName": "Dr. John Doe",
      "companyName": "Tech Company",
      "grade": null,
      "startDate": "2024-01-15",
      "endDate": "2024-02-15"
    }
  ]
}
```

### Talaba yaratish
```http
POST /api/students/
```

**Request Body:**
```json
{
  "name": "Ahmad Karimov",
  "student_id": "2021001",
  "hemisId": "HEMIS001",
  "faculty": "IT",
  "department": "Computer Science",
  "course": 3,
  "group": "CS-21-1",
  "phone": "+998901234567",
  "internshipType": "malaka",
  "birthDate": "2000-01-01",
  "passport": "AA1234567",
  "address": "Toshkent shahar",
  "parentPhone": "+998901234568"
}
```

### Talaba ma'lumotlarini olish
```http
GET /api/students/{id}/
```

### Talaba ma'lumotlarini yangilash
```http
PUT /api/students/{id}/
PATCH /api/students/{id}/
```

### Talabani o'chirish
```http
DELETE /api/students/{id}/
```

### Talaba amaliyotini boshlash
```http
POST /api/students/{id}/start_internship/
```

**Request Body:**
```json
{
  "supervisor_id": 1,
  "company_id": 1,
  "start_date": "2024-01-15",
  "end_date": "2024-02-15"
}
```

---

## Supervisors API

### Barcha rahbarlarni olish
```http
GET /api/supervisors/
```

**Query Parameters:**
- `faculty` - Fakultet
- `department` - Kafedra
- `status` - Holat (active, inactive)
- `search` - Qidiruv matni

**Response:**
```json
{
  "count": 25,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Dr. John Doe",
      "position": "Professor",
      "department": "Computer Science",
      "faculty": "IT",
      "phone": "+998901234567",
      "specialization": "Software Engineering",
      "capacity": 10,
      "assignedStudents": 8,
      "rating": 4.5,
      "status": "active",
      "experience": 15,
      "company": "Tech Company",
      "company_name": "Tech Company"
    }
  ]
}
```

### Rahbar yaratish
```http
POST /api/supervisors/
```

**Request Body:**
```json
{
  "name": "Dr. John Doe",
  "position": "Professor",
  "department": "Computer Science",
  "faculty": "IT",
  "phone": "+998901234567",
  "specialization": "Software Engineering",
  "capacity": 10,
  "experience": 15,
  "company": 1
}
```

### Rahbar ma'lumotlarini olish
```http
GET /api/supervisors/{id}/
```

### Rahbar ma'lumotlarini yangilash
```http
PUT /api/supervisors/{id}/
PATCH /api/supervisors/{id}/
```

### Rahbarni o'chirish
```http
DELETE /api/supervisors/{id}/
```

### Rahbar talabalarini olish
```http
GET /api/supervisors/{id}/students/
```

### Rahbar amaliyotlarini olish
```http
GET /api/supervisors/{id}/internships/
```

---

## Companies API

### Barcha korxonalarni olish
```http
GET /api/companies/
```

**Query Parameters:**
- `status` - Holat (active, inactive)
- `search` - Qidiruv matni

**Response:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Tech Company",
      "direction": "Software Development",
      "address": "Toshkent shahar, Chilonzor tumani",
      "phone": "+998901234567",
      "capacity": 20,
      "assignedStudents": 15,
      "rating": 4.8,
      "status": "active",
      "work_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "work_days_display": ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma"],
      "work_hours_start": "09:00",
      "work_hours_end": "18:00"
    }
  ]
}
```

### Korxona yaratish
```http
POST /api/companies/
```

**Request Body:**
```json
{
  "name": "Tech Company",
  "direction": "Software Development",
  "address": "Toshkent shahar, Chilonzor tumani",
  "phone": "+998901234567",
  "capacity": 20,
  "work_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "work_hours_start": "09:00",
  "work_hours_end": "18:00"
}
```

### Korxona ma'lumotlarini olish
```http
GET /api/companies/{id}/
```

### Korxona ma'lumotlarini yangilash
```http
PUT /api/companies/{id}/
PATCH /api/companies/{id}/
```

### Korxonani o'chirish
```http
DELETE /api/companies/{id}/
```

---

## Internships API

### Barcha amaliyotlarni olish
```http
GET /api/internships/
```

**Query Parameters:**
- `status` - Amaliyot holati
- `supervisor` - Rahbar ID
- `company` - Korxona ID
- `student` - Talaba ID
- `search` - Qidiruv matni

**Response:**
```json
{
  "count": 50,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "student": "1",
      "student_name": "Ahmad Karimov",
      "supervisor": "1",
      "supervisor_name": "Dr. John Doe",
      "company": "1",
      "company_name": "Tech Company",
      "type": "malaka",
      "type_display": "Malaka amaliyoti",
      "start_date": "2024-01-15",
      "end_date": "2024-02-15",
      "duration_days": 30,
      "status": "started",
      "status_display": "Boshlangan",
      "grade": null,
      "grade_comment": null,
      "is_graded": false,
      "graded_by": null,
      "graded_by_name": null,
      "graded_at": null,
      "feedback": null,
      "supervisor_feedback": null,
      "is_active": true,
      "progress_percentage": 60,
      "completed_days": 18,
      "remaining_days": 12,
      "attendance_stats": {
        "total_days": 30,
        "attended_days": 18,
        "absent_days": 0,
        "attendance_percentage": 100,
        "completed_days": 18,
        "pending_days": 12
      },
      "work_days_count": 30,
      "daily_statuses": [],
      "created_at": "2024-01-10T00:00:00Z",
      "updated_at": "2024-01-25T00:00:00Z"
    }
  ]
}
```

### Amaliyot yaratish
```http
POST /api/internships/
```

**Request Body:**
```json
{
  "student": 1,
  "supervisor": 1,
  "company": 1,
  "type": "malaka",
  "start_date": "2024-01-15",
  "end_date": "2024-02-15"
}
```

### Amaliyot ma'lumotlarini olish
```http
GET /api/internships/{id}/
```

### Amaliyot ma'lumotlarini yangilash
```http
PUT /api/internships/{id}/
PATCH /api/internships/{id}/
```

### Amaliyotni o'chirish
```http
DELETE /api/internships/{id}/
```

### Kun boshlashni tasdiqlash
```http
POST /api/internships/{id}/approve_day_start/
```

**Request Body:**
```json
{
  "daily_status_id": 1,
  "comment": "Kun boshlash tasdiqlandi"
}
```

### Kun boshlashni rad etish
```http
POST /api/internships/{id}/reject_day_start/
```

**Request Body:**
```json
{
  "daily_status_id": 1,
  "rejection_reason": "Sabab ko'rsatilmagan"
}
```

### Kunni boshlash
```http
POST /api/internships/{id}/start_day/
```

**Request Body:**
```json
{
  "comment": "Bugun ishni boshladim"
}
```

### Kunni yakunlash
```http
POST /api/internships/{id}/end_day/
```

**Request Body:**
```json
{
  "comment": "Bugun ishni yakunladim"
}
```

### Kunlik holatni olish
```http
GET /api/internships/{id}/get_daily_status/
```

**Response:**
```json
{
  "daily_statuses": [
    {
      "id": 1,
      "internship": 1,
      "day_number": 1,
      "date": "2024-01-15",
      "status": "day_start",
      "comment": "Bugun ishni boshladim",
      "rejection_reason": null,
      "created_at": "2024-01-15T09:00:00Z",
      "updated_at": "2024-01-15T09:00:00Z"
    }
  ],
  "total_days": 30,
  "completed_days": 18,
  "remaining_days": 12
}
```

### Amaliyotni baholash
```http
POST /api/internships/{id}/grade_internship/
```

**Request Body:**
```json
{
  "grade": 5,
  "comment": "Ajoyib ishladi!"
}
```

### Amaliyotni tasdiqlash (Admin/SuperAdmin)
```http
POST /api/internships/{id}/confirm_internship/
```

**Request Body:**
```json
{
  "comment": "Amaliyot muvaffaqiyatli yakunlandi"
}
```

---

## Daily Reports API

### Barcha kunlik hisobotlarni olish
```http
GET /api/daily-reports/
```

**Query Parameters:**
- `internship` - Amaliyot ID
- `student` - Talaba ID
- `status` - Hisobot holati
- `date_from` - Boshlanish sanasi
- `date_to` - Tugash sanasi

**Response:**
```json
{
  "count": 100,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "student": "1",
      "student_name": "Ahmad Karimov",
      "internship": 1,
      "date": "2024-01-15",
      "work_description": "Bugun ma'lumotlar bazasi bilan ishladim",
      "hours_worked": 8,
      "status": "submitted",
      "status_display": "Yuborilgan",
      "supervisor_comment": null,
      "created_at": "2024-01-15T18:00:00Z",
      "updated_at": "2024-01-15T18:00:00Z"
    }
  ]
}
```

### Kunlik hisobot yaratish
```http
POST /api/daily-reports/
```

**Request Body:**
```json
{
  "internship": 1,
  "date": "2024-01-15",
  "work_description": "Bugun ma'lumotlar bazasi bilan ishladim",
  "hours_worked": 8
}
```

### Kunlik hisobot ma'lumotlarini olish
```http
GET /api/daily-reports/{id}/
```

### Kunlik hisobot ma'lumotlarini yangilash
```http
PUT /api/daily-reports/{id}/
PATCH /api/daily-reports/{id}/
```

### Kunlik hisobotni o'chirish
```http
DELETE /api/daily-reports/{id}/
```

### Kunlik hisobotni tasdiqlash
```http
POST /api/daily-reports/{id}/approve/
```

**Request Body:**
```json
{
  "comment": "Hisobot tasdiqlandi"
}
```

### Kunlik hisobotni rad etish
```http
POST /api/daily-reports/{id}/reject/
```

**Request Body:**
```json
{
  "rejection_reason": "Hisobot to'liq emas"
}
```

---

## Documents API

### Barcha hujjatlarni olish
```http
GET /api/documents/
```

**Query Parameters:**
- `internship` - Amaliyot ID
- `student` - Talaba ID
- `status` - Hujjat holati
- `document_type` - Hujjat turi

**Response:**
```json
{
  "count": 50,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "student": "1",
      "student_name": "Ahmad Karimov",
      "internship": 1,
      "internship_id": 1,
      "document_type": "report",
      "title": "Amaliyot hisoboti",
      "file": "/media/documents/report_1.pdf",
      "file_url": "http://localhost:8000/media/documents/report_1.pdf",
      "status": "pending",
      "status_display": "Kutilmoqda",
      "rejection_reason": null,
      "uploaded_at": "2024-01-20T10:00:00Z"
    }
  ]
}
```

### Hujjat yuklash
```http
POST /api/documents/
```

**Request Body (multipart/form-data):**
```json
{
  "student": "1",
  "document_type": "report",
  "title": "Amaliyot hisoboti",
  "file": "file_object"
}
```

### Hujjat ma'lumotlarini olish
```http
GET /api/documents/{id}/
```

### Hujjat ma'lumotlarini yangilash
```http
PUT /api/documents/{id}/
PATCH /api/documents/{id}/
```

### Hujjatni o'chirish
```http
DELETE /api/documents/{id}/
```

### Hujjatni tasdiqlash
```http
POST /api/documents/{id}/approve/
```

### Hujjatni rad etish
```http
POST /api/documents/{id}/reject/
```

**Request Body:**
```json
{
  "rejection_reason": "Hujjat to'liq emas"
}
```

---

## Daily Statuses API

### Barcha kunlik statuslarni olish
```http
GET /api/daily-statuses/
```

**Query Parameters:**
- `internship` - Amaliyot ID
- `status` - Status
- `date_from` - Boshlanish sanasi
- `date_to` - Tugash sanasi

**Response:**
```json
{
  "count": 200,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "internship": 1,
      "day_number": 1,
      "date": "2024-01-15",
      "status": "day_completed",
      "status_display": "Yakunlangan",
      "comment": "Bugun ishni yakunladim",
      "rejection_reason": null,
      "created_at": "2024-01-15T09:00:00Z",
      "updated_at": "2024-01-15T18:00:00Z"
    }
  ]
}
```

### Kunlik status yaratish
```http
POST /api/daily-statuses/
```

**Request Body:**
```json
{
  "internship": 1,
  "day_number": 1,
  "date": "2024-01-15",
  "status": "day_start",
  "comment": "Bugun ishni boshladim"
}
```

### Kunlik status ma'lumotlarini olish
```http
GET /api/daily-statuses/{id}/
```

### Kunlik status ma'lumotlarini yangilash
```http
PUT /api/daily-statuses/{id}/
PATCH /api/daily-statuses/{id}/
```

### Kunlik statusni o'chirish
```http
DELETE /api/daily-statuses/{id}/
```

### Kunlik statusni yangilash
```http
PATCH /api/daily-statuses/{id}/update_status/
```

**Request Body:**
```json
{
  "status": "day_completed",
  "comment": "Ish yakunlandi"
}
```

---

## Notifications API

### Barcha bildirishnomalarni olish
```http
GET /api/notifications/
```

**Query Parameters:**
- `is_read` - O'qilgan/o'qilmagan
- `notification_type` - Bildirishnoma turi

**Response:**
```json
{
  "count": 25,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "userId": "1",
      "title": "Yangi amaliyot tayinlandi",
      "message": "Sizga yangi amaliyot tayinlandi",
      "notification_type": "internship_assigned",
      "is_read": false,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Bildirishnoma yaratish
```http
POST /api/notifications/
```

**Request Body:**
```json
{
  "userId": "1",
  "title": "Yangi bildirishnoma",
  "message": "Bildirishnoma matni",
  "notification_type": "general"
}
```

### Bildirishnoma ma'lumotlarini olish
```http
GET /api/notifications/{id}/
```

### Bildirishnoma ma'lumotlarini yangilash
```http
PUT /api/notifications/{id}/
PATCH /api/notifications/{id}/
```

### Bildirishnomani o'chirish
```http
DELETE /api/notifications/{id}/
```

### Bildirishnomani o'qildi deb belgilash
```http
POST /api/notifications/{id}/mark_read/
```

---

## Faculties API

### Barcha fakultetlarni olish
```http
GET /api/faculties/
```

**Response:**
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "IT",
      "description": "Axborot texnologiyalari fakulteti",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Fakultet yaratish
```http
POST /api/faculties/
```

**Request Body:**
```json
{
  "name": "IT",
  "description": "Axborot texnologiyalari fakulteti"
}
```

### Fakultet ma'lumotlarini olish
```http
GET /api/faculties/{id}/
```

### Fakultet ma'lumotlarini yangilash
```http
PUT /api/faculties/{id}/
PATCH /api/faculties/{id}/
```

### Fakultetni o'chirish
```http
DELETE /api/faculties/{id}/
```

---

## Departments API

### Barcha kafedralarni olish
```http
GET /api/departments/
```

**Query Parameters:**
- `faculty` - Fakultet ID

**Response:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Computer Science",
      "faculty": 1,
      "faculty_name": "IT",
      "description": "Kompyuter fanlari kafedrasi",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Kafedra yaratish
```http
POST /api/departments/
```

**Request Body:**
```json
{
  "name": "Computer Science",
  "faculty": 1,
  "description": "Kompyuter fanlari kafedrasi"
}
```

### Kafedra ma'lumotlarini olish
```http
GET /api/departments/{id}/
```

### Kafedra ma'lumotlarini yangilash
```http
PUT /api/departments/{id}/
PATCH /api/departments/{id}/
```

### Kafedrani o'chirish
```http
DELETE /api/departments/{id}/
```

---

## HEMIS Import API

### HEMIS ma'lumotlarini import qilish
```http
POST /api/hemis/import/
```

**Request Body (multipart/form-data):**
```json
{
  "file": "excel_file.xlsx"
}
```

### HEMIS template yuklab olish
```http
GET /api/hemis/template/
```

---

## Xatolik kodlari

| Kod | Tavsif |
|-----|--------|
| 200 | Muvaffaqiyatli |
| 201 | Yaratildi |
| 400 | Noto'g'ri so'rov |
| 401 | Autentifikatsiya talab qilinadi |
| 403 | Ruxsat yo'q |
| 404 | Topilmadi |
| 500 | Server xatoligi |

## Xatolik response formati

```json
{
  "error": "Xatolik matni",
  "details": "Qo'shimcha ma'lumotlar"
}
```

---

## Autentifikatsiya va ruxsatlar

### Rollar:
- **super_admin**: Barcha ma'lumotlarga to'liq ruxsat
- **admin**: Admin funksiyalari (super_admin dan tashqari)
- **supervisor**: O'z talabalari va amaliyotlari
- **student**: O'z ma'lumotlari va amaliyoti

### Ruxsatlar:
- **GET**: Ma'lumotlarni o'qish
- **POST**: Yangi ma'lumot yaratish
- **PUT/PATCH**: Ma'lumotlarni yangilash
- **DELETE**: Ma'lumotlarni o'chirish

---

## Misollar

### Talaba amaliyotini boshlash
```bash
curl -X POST http://localhost:8000/api/internships/1/start_day/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: csrf_token" \
  -d '{"comment": "Bugun ishni boshladim"}'
```

### Supervisor kun boshlashni tasdiqlash
```bash
curl -X POST http://localhost:8000/api/internships/1/approve_day_start/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: csrf_token" \
  -d '{"daily_status_id": 1, "comment": "Tasdiqlandi"}'
```

### Admin amaliyotni baholash
```bash
curl -X POST http://localhost:8000/api/internships/1/grade_internship/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: csrf_token" \
  -d '{"grade": 5, "comment": "Ajoyib ishladi!"}'
```

---

## WebSocket (Real-time updates)

### Internship Consumer
```javascript
const socket = new WebSocket('ws://localhost:8000/ws/internship/');

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

**Message Types:**
- `internship_updated`: Amaliyot yangilandi
- `daily_status_updated`: Kunlik status yangilandi
- `report_submitted`: Hisobot yuborildi
- `notification`: Yangi bildirishnoma

---

*Bu dokumentatsiya platformaning joriy holatiga asoslanib yaratilgan va doimiy ravishda yangilanadi.*
*25.10.2025*