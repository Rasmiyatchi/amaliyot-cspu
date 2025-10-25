const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://logistika.pythonanywhere.com/api';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {};
    
    // FormData uchun Content-Type qo'shilmasin
    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }
      
    // Token-based authentication
    const token = this.getAuthToken();
    if (token) {
      defaultHeaders['Authorization'] = `Token ${token}`;
    }
      
    // CSRF token o'chirildi - faqat token authentication ishlatiladi
    // const csrfToken = this.getCSRFToken();
    // if (csrfToken) {
    //     defaultHeaders['X-CSRFToken'] = csrfToken;
    // }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include', // Session cookie'larni yuborish uchun
    };

    try {
      console.log('Making request to:', url);
      console.log('Request config:', config);
      
      const response = await fetch(url, config);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response data:', errorData);
        console.error('Full error details:', JSON.stringify(errorData, null, 2));
        throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
      }

      // Handle empty responses (like DELETE 204)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        console.log('Empty response (204 No Content)');
        return null as T;
      }

      const responseData = await response.json();
      console.log('Success response data:', responseData);
      return responseData;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  getCSRFToken(): string | null {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return value;
      }
    }
    return null;
  }

  getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  removeAuthToken(): void {
    localStorage.removeItem('auth_token');
  }

  private async getCSRFTokenFromServer() {
    try {
      console.log('Getting CSRF token from:', `${this.baseURL}/auth/csrf/`);
      const response = await fetch(`${this.baseURL}/auth/csrf/`, {
        method: 'GET',
        credentials: 'include',
      });
      console.log('CSRF response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('CSRF response data:', data);
        if (data.csrfToken) {
          document.cookie = `csrftoken=${data.csrfToken}; path=/`;
          console.log('CSRF token set in cookie');
        }
      } else {
        console.error('CSRF token request failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('CSRF token olishda xatolik:', error);
    }
  }

  // Auth methods
  async login(username: string, password: string) {
    // CSRF token olish o'chirildi - faqat token authentication
    // await this.getCSRFTokenFromServer();
    
    console.log('Login attempt:', { username, password });
    
    const response = await this.request('/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    // Token olish va saqlash
    if (response && (response as any).token) {
      this.setAuthToken((response as any).token);
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout/', {
        method: 'POST',
      });
    } finally {
      // Token'ni o'chirish
      this.removeAuthToken();
    }
  }

  // Dashboard
  async getDashboard() {
    return this.request('/dashboard/');
  }

  // Students
  async getStudents() {
    return this.request('/students/');
  }

  async getStudentByUserId(userId: string) {
    return this.request(`/students/by_user/?user_id=${userId}`);
  }

  async getStudent(id: string) {
    return this.request(`/students/${id}/`);
  }

  async createStudent(studentData: any) {
    return this.request('/students/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(id: string, studentData: any) {
    return this.request(`/students/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });
  }

  async deleteStudent(id: string) {
    return this.request(`/students/${id}/`, {
      method: 'DELETE',
    });
  }

  async getStudentStatistics() {
    return this.request('/students/statistics/');
  }

  // Supervisors
  async getSupervisors() {
    return this.request('/supervisors/');
  }

  async getSupervisor(id: string) {
    return this.request(`/supervisors/${id}/`);
  }

  async createSupervisor(supervisorData: any) {
    console.log('Creating supervisor with data:', supervisorData);
    return this.request('/supervisors/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(supervisorData),
    });
  }

  async updateSupervisor(id: string, supervisorData: any) {
    return this.request(`/supervisors/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(supervisorData),
    });
  }

  async deleteSupervisor(id: string) {
    return this.request(`/supervisors/${id}/`, {
      method: 'DELETE',
    });
  }

  // Companies
  async getCompanies() {
    return this.request('/companies/');
  }

  async getCompany(id: string) {
    return this.request(`/companies/${id}/`);
  }

  async createCompany(companyData: any) {
    return this.request('/companies/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(companyData),
    });
  }

  async updateCompany(id: string, companyData: any) {
    return this.request(`/companies/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(companyData),
    });
  }

  async deleteCompany(id: string) {
    return this.request(`/companies/${id}/`, {
      method: 'DELETE',
    });
  }

  async getSupervisorByUserId(userId: string) {
    return this.request(`/supervisors/by_user/?user_id=${userId}`);
  }


  // Daily Reports
  async getDailyReports() {
    return this.request('/daily-reports/');
  }

  async getDailyReport(id: string) {
    return this.request(`/daily-reports/${id}/`);
  }

  async getDailyReportsByInternship(internshipId: string) {
    return this.request(`/daily-reports/?internship=${internshipId}`);
  }

  async createDailyReport(reportData: FormData) {
    return this.request('/daily-reports/', {
      method: 'POST',
      headers: {}, // FormData uchun Content-Type o'chiriladi
      body: reportData,
    });
  }

  async updateDailyReport(id: string, reportData: any) {
    return this.request(`/daily-reports/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    });
  }

  async deleteDailyReport(id: string) {
    return this.request(`/daily-reports/${id}/`, {
      method: 'DELETE',
    });
  }

  // Documents
  async getDocuments() {
    return this.request('/documents/');
  }

  async getDocument(id: string) {
    return this.request(`/documents/${id}/`);
  }

  async getDocumentsByInternship(internshipId: string) {
    return this.request(`/documents/?internship=${internshipId}`);
  }

  async uploadDocument(formData: FormData) {
    // Backend o'zi User ID dan Student ID ni topadi, shuning uchun bu logika kerak emas
    return this.request('/documents/', {
      method: 'POST',
      headers: {}, // FormData uchun Content-Type o'chiriladi
      body: formData,
    });
  }

  async approveDocument(id: string) {
    return this.request(`/documents/${id}/approve/`, {
      method: 'POST',
    });
  }

  async rejectDocument(id: string, rejectionReason: string) {
    return this.request(`/documents/${id}/reject/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    });
  }

  async updateDocument(id: string, formData: FormData) {
    return this.request(`/documents/${id}/`, {
      method: 'PUT',
      headers: {}, // FormData uchun Content-Type o'chiriladi
      body: formData,
    });
  }

  async deleteDocument(id: string) {
    return this.request(`/documents/${id}/`, {
      method: 'DELETE',
    });
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications/');
  }

  async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/mark_read/`, {
      method: 'POST',
    });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/mark_all_read/', {
      method: 'POST',
    });
  }

  // Faculties
  async getFaculties() {
    return this.request('/faculties/');
  }

  async getFaculty(id: string) {
    return this.request(`/faculties/${id}/`);
  }

  async createFaculty(facultyData: any) {
    return this.request('/faculties/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(facultyData),
    });
  }

  async updateFaculty(id: string, facultyData: any) {
    return this.request(`/faculties/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(facultyData),
    });
  }

  async deleteFaculty(id: string) {
    return this.request(`/faculties/${id}/`, {
      method: 'DELETE',
    });
  }

  // Departments
  async getDepartments(facultyId?: string) {
    const url = facultyId ? `/departments/?faculty_id=${facultyId}` : '/departments/';
    return this.request(url);
  }

  async getDepartment(id: string) {
    return this.request(`/departments/${id}/`);
  }

  async createDepartment(departmentData: any) {
    return this.request('/departments/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(departmentData),
    });
  }

  async updateDepartment(id: string, departmentData: any) {
    return this.request(`/departments/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(departmentData),
    });
  }

  async deleteDepartment(id: string) {
    return this.request(`/departments/${id}/`, {
      method: 'DELETE',
    });
  }

  // HEMIS Import
  async importHemisData(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    // FormData uchun alohida request - Content-Type ni o'chirish kerak
    const url = `${this.baseURL}/hemis/import/`;
    const config: RequestInit = {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'X-CSRFToken': this.getCSRFToken() || '',
      },
    };

    const response = await fetch(url, config);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response data:', errorData);
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Success response data:', responseData);
    return responseData;
  }

  async getHemisTemplate() {
    return this.request('/hemis/template/');
  }

  // Users
  async getUsers() {
    return this.request('/users/');
  }
  async getUser(userId: string) {
    return this.request(`/users/${userId}/`);
  }

  async createUser(userData: any) {
    return this.request('/users/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any) {
    return this.request(`/users/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}/`, {
      method: 'DELETE',
    });
  }

  // Password management
  async changePassword(userId: string, newPassword: string) {
    return this.request('/users/change-password/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        new_password: newPassword
      }),
    });
  }

  // Internships
  async getInternships() {
    return this.request('/internships/');
  }

  async createInternship(internshipData: any) {
    return this.request('/internships/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(internshipData),
    });
  }

  async updateInternship(internshipId: string, data: any) {
    return this.request(`/internships/${internshipId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
  }

  async deleteInternship(id: string) {
    return this.request(`/internships/${id}/`, {
      method: 'DELETE',
    });
  }

  // Internship grading methods
  async gradeInternship(internshipId: string, score: number, comment?: string) {
    return this.request(`/internships/${internshipId}/grade_internship/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        score: score,
        comment: comment || ''
      }),
    });
  }

  async confirmInternship(internshipId: string) {
    return this.request(`/internships/${internshipId}/confirm_internship/`, {
      method: 'POST',
    });
  }

  // Internship capacity and validation methods
  async checkCapacity(supervisorId?: string, companyId?: string) {
    const params = new URLSearchParams();
    if (supervisorId) params.append('supervisor_id', supervisorId);
    if (companyId) params.append('company_id', companyId);
    
    return this.request(`/internships/check_capacity/?${params.toString()}`);
  }

  async calculateEndDate(startDate: string, durationDays: number, companyId: string) {
    const params = new URLSearchParams({
      start_date: startDate,
      duration_days: durationDays.toString(),
      company_id: companyId
    });
    
    return this.request(`/internships/calculate_end_date/?${params.toString()}`);
  }

  async checkStudentCanStart(userId: string) {
    const params = new URLSearchParams({ user_id: userId });
    return this.request(`/internships/student_can_start/?${params.toString()}`);
  }

  // Supervisor methods
  async getSupervisorStudents(supervisorUserId: string) {
    const params = new URLSearchParams({ supervisor_user_id: supervisorUserId });
    return this.request(`/internships/supervisor_students/?${params.toString()}`);
  }

  async getSupervisorInternships(supervisorUserId: string) {
    const params = new URLSearchParams({ supervisor_user_id: supervisorUserId });
    return this.request(`/internships/supervisor_internships/?${params.toString()}`);
  }

  // Internship detail methods
  async getInternship(internshipId: string) {
    return this.request(`/internships/${internshipId}/`);
  }

  async startDay(internshipId: string) {
    return this.request(`/internships/${internshipId}/start_day/`, {
      method: 'POST',
    });
  }

  async endDay(internshipId: string) {
    return this.request(`/internships/${internshipId}/end_day/`, {
      method: 'POST',
    });
  }

  async getDailyStatus(internshipId: string, date?: string) {
    const url = date 
      ? `/internships/${internshipId}/daily_status/?date=${date}`
      : `/internships/${internshipId}/daily_status/`;
    return this.request(url);
  }

  async getStudentDailyStatus() {
    return this.request('/internships/get_daily_status/');
  }

  async approveDailyReport(reportId: string) {
    return this.request(`/daily-reports/${reportId}/approve_report/`, {
      method: 'POST',
    });
  }

  async rejectDailyReport(reportId: string, rejectionReason: string) {
    return this.request(`/daily-reports/${reportId}/reject_report/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    });
  }

  async updateInternshipDailyStatus(internshipId: string, dailyStatusId: string, status: string, rejectionReason?: string) {
    return this.request(`/internships/${internshipId}/update_daily_status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        daily_status_id: dailyStatusId,
        status: status,
        rejection_reason: rejectionReason || ''
      }),
    });
  }

  // Student specific methods
  async createStudentDailyReport(data: FormData) {
    return this.request('/students/create_daily_report/', {
      method: 'POST',
      body: data,
      headers: {},
    });
  }

  // Student specific methods
  async getStudentDailyReports() {
    return this.request('/students/get_daily_reports/');
  }

  async uploadStudentDocument(data: FormData) {
    return this.request('/students/upload_document/', {
      method: 'POST',
      body: data,
      headers: {},
    });
  }

  async getStudentDocuments() {
    return this.request('/students/get_documents/');
  }

  async submitFinalReport(data: FormData) {
    return this.request('/students/submit_final_report/', {
      method: 'POST',
      body: data,
      headers: {},
    });
  }

  // Daily Status API methods
  async getDailyStatuses() {
    return this.request('/daily-statuses/');
  }

  async updateDailyStatusById(dailyStatusId: string, status: string, rejectionReason?: string) {
    return this.request(`/daily-statuses/${dailyStatusId}/update_status/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        rejection_reason: rejectionReason || ''
      }),
    });
  }

  async approveDayStart(internshipId: string, dailyStatusId: string) {
    return this.request(`/internships/${internshipId}/approve_day_start/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ daily_status_id: dailyStatusId }),
    });
  }

  async rejectDayStart(internshipId: string, dailyStatusId: string, rejectionReason: string) {
    return this.request(`/internships/${internshipId}/reject_day_start/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        daily_status_id: dailyStatusId,
        rejection_reason: rejectionReason 
      }),
    });
  }
}

export const apiService = new ApiService();
export default apiService;