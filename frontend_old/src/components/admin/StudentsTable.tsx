import { useState } from 'react';
import { Search, Plus, Edit, Users, Trash2, UserCheck, Phone, X, Building2, Award, GraduationCap, Play } from 'lucide-react';
import { useStudents, useSupervisors, useCompanies, useInternshipCreation, useInternships } from '../../hooks/useData';
import { Student } from '../../types';
import { StudentForm } from './StudentForm';

export function StudentsTable() {
  const { students, loading, addStudent, updateStudent, deleteStudent, refresh: refreshStudents } = useStudents();
  const { supervisors } = useSupervisors();
  const { companies } = useCompanies();
  const { createInternship } = useInternshipCreation();
  const { getStudentInternship } = useInternships();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();
  const [showInternshipModal, setShowInternshipModal] = useState(false);
  const [internshipStudent, setInternshipStudent] = useState<Student | null>(null);
  const [internshipForm, setInternshipForm] = useState({
    type: 'malaka' as 'belgilanmagan' | 'malaka' | 'pedagogik' | 'ilmiy' | 'ishlab_chiqarish',
    startDate: new Date().toISOString().split('T')[0],
    duration: 30, // kun
    workDays: [] as string[],
    description: '',
    supervisorId: '',
    companyId: ''
  });

  const filteredStudents = students.filter(student => {
    const matchesSearch = (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (student.student_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (student.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || student.internshipStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: Student['internshipStatus']) => {
    const statusConfig = {
      waiting: { label: 'Kutish', color: 'bg-yellow-100 text-yellow-800' },
      assigned: { label: 'Tayinlangan', color: 'bg-blue-100 text-blue-800' },
      start_pending: { label: 'Boshlash kutilmoqda', color: 'bg-green-100 text-green-800' },
      started: { label: 'Boshlangan', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Tugadi', color: 'bg-gray-100 text-gray-800' },
      grading: { label: 'Baholash', color: 'bg-yellow-100 text-yellow-800' },
      graded: { label: 'Baholandi', color: 'bg-green-100 text-green-800' },
      confirmed: { label: 'Tasdiqlandi', color: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Bekor qilingan', color: 'bg-red-100 text-red-800' }
    };
    
    return statusConfig[status as keyof typeof statusConfig] || { label: 'Noma\'lum', color: 'bg-gray-100 text-gray-800' };
  };

  const getInternshipType = (type: Student['internshipType']) => {
    const typeLabels = {
      belgilanmagan: 'Belgilanmagan',
      malaka: 'Malaka',
      pedagogik: 'Pedagogik', 
      ilmiy: 'Ilmiy',
      ishlab_chiqarish: 'Ishlab chiqarish'
    };
    return typeLabels[type] || 'Noma\'lum';
  };

  const calculateEndDate = (startDate: string, duration: number, workDays: string[]) => {
    const start = new Date(startDate);
    let currentDate = new Date(start);
    let workingDaysCount = 0;
    
    // Ish kunlari mapping
    const dayMapping = {
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
      'sunday': 0
    };
    
    const workDayNumbers = workDays.map(day => dayMapping[day as keyof typeof dayMapping]);
    
    // Kerakli ish kunlarini hisoblash
    while (workingDaysCount < duration) {
      const dayOfWeek = currentDate.getDay();
      if (workDayNumbers.includes(dayOfWeek)) {
        workingDaysCount++;
      }
      if (workingDaysCount < duration) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    return currentDate;
  };

  const handleStartInternship = (student: Student) => {
    setInternshipStudent(student);
    
    // Mavjud supervisor va company ma'lumotlarini form ga yuklash
    setInternshipForm({
      type: 'malaka',
      startDate: new Date().toISOString().split('T')[0],
      duration: 30,
      workDays: [],
      description: '',
      supervisorId: student.supervisorId || '',
      companyId: student.companyId || ''
    });
  
    
    setShowInternshipModal(true);
  };

  const handleCreateInternship = async () => {
    if (!internshipStudent) {
      alert('Talaba ma\'lumotlari topilmadi');
      return;
    }

    // Form dan supervisor va company ma'lumotlarini olish
    const selectedSupervisorId = internshipForm.supervisorId;
    const selectedCompanyId = internshipForm.companyId || internshipStudent.companyId;

    if (!selectedSupervisorId) {
      alert('Iltimos, amaliyot rahbarini tanlang');
      return;
    }

    if (!selectedCompanyId) {
      alert('Iltimos, kompaniyani tanlang');
      return;
    }

    // Company ma'lumotlarini olish
    const selectedCompany = companies.find(c => c.id.toString() === selectedCompanyId);
    if (!selectedCompany) {
      alert('Kompaniya ma\'lumotlari topilmadi');
      return;
    }

    try {
      // End date ni kompaniya ish kunlariga qarab hisoblash
      const endDate = calculateEndDate(
        internshipForm.startDate, 
        internshipForm.duration, 
        selectedCompany.work_days || []
      );

      // Supervisor User ID ni olish
      const selectedSupervisor = supervisors.find(s => s.id.toString() === selectedSupervisorId);
      const supervisorUserId = (selectedSupervisor as any)?.user_id || selectedSupervisorId;

      const internshipData = {
        student: parseInt(internshipStudent.id),
        supervisor: parseInt(supervisorUserId), // User ID yuborish kerak
        company: parseInt(selectedCompanyId),
        type: internshipForm.type,
        start_date: internshipForm.startDate,
        end_date: endDate.toISOString().split('T')[0],
        duration: internshipForm.duration,
        work_days: selectedCompany.work_days || [],
        work_hours_start: selectedCompany.work_hours_start,
        work_hours_end: selectedCompany.work_hours_end,
        description: internshipForm.description,
        status: 'assigned'
      };

      console.log('Selected supervisor ID:', selectedSupervisorId);
      // Backend API ga yuborish (sig'im nazorati backend da qilinadi)
      await createInternship(internshipData);
      
      // Student status ni 'assigned' ga o'zgartirish
      const updatedStudentData = {
        ...internshipStudent,
        internshipStatus: 'assigned' as const,
        internshipType: internshipForm.type,
        startDate: internshipForm.startDate,
        endDate: endDate.toISOString().split('T')[0],
        supervisorId: selectedSupervisorId,
        companyId: selectedCompanyId,
        // Phone field ni to'g'ri handle qilish
        phone: internshipStudent.phone || '+998900000000'
      };
      
      await updateStudent(internshipStudent.id, updatedStudentData);

      alert('Amaliyot muvaffaqiyatli boshlandi!');
      setShowInternshipModal(false);
      
      // Students listini yangilash
      await refreshStudents();
      
      // Form ni reset qilish
      setInternshipForm({
        type: 'malaka',
        startDate: new Date().toISOString().split('T')[0],
        duration: 30,
        workDays: [],
        description: '',
        supervisorId: '',
        companyId: ''
      });
    } catch (error) {
      console.error('Amaliyot boshlashda xatolik:', error);
      alert('Amaliyot boshlashda xatolik yuz berdi');
    }
  };

  const handleSaveStudent = (studentData: Omit<Student, 'id'>) => {
    if (editingStudent) {
      updateStudent(editingStudent.id, studentData);
    } else {
      addStudent(studentData);
    }
    setShowForm(false);
    setEditingStudent(undefined);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Bu talabani o\'chirishni xohlaysizmi?')) {
      deleteStudent(id);
    }
  };

  const getSupervisorName = (supervisorId?: string) => {
    if (!supervisorId) return '—';
    const supervisor = supervisors.find(s => s.id == supervisorId);
    return supervisor ? (supervisor.full_name || supervisor.name) : '—';
  };

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return '—';
    const company = companies.find(c => c.id == companyId);
    return company ? company.name : '—';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talabalar</h1>
          <p className="text-gray-600 mt-1">Barcha talabalar ro'yxati va ma'lumotlari</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Yangi talaba
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Ism, ID yoki telefon bo'yicha qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Barcha holatlar</option>
                <option value="waiting">Kutish</option>
                <option value="assigned">Tayinlangan</option>
                <option value="start_pending">Boshlash kutilmoqda</option>
                <option value="started">Boshlangan</option>
                <option value="completed">Tugadi</option>
                <option value="grading">Baholash</option>
                <option value="graded">Baholandi</option>
                <option value="confirmed">Tasdiqlandi</option>
                <option value="cancelled">Bekor qilingan</option>
                <option value="completed">Yakunlangan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Students Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student) => {
                const internship = getStudentInternship(student.id);
                return (
              <div key={student.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                {/* Avatar - tepada o'rtada */}
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {student.name?.charAt(0) || '?'}
                    </span>
                  </div>
                </div>
                          
                {/* Ism va ID */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{student.name || 'Ism belgilanmagan'}</h3>
                  <p className="text-sm text-gray-600">{student.student_id}</p>
                  <div className="flex items-center justify-center mt-1">
                    <Phone size={14} className="text-gray-400 mr-1" />
                    <span className="text-sm text-gray-600">{student.phone}</span>
                  </div>
                </div>

                {/* Badge lar - tooltip bilan */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="relative group">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(student.internshipStatus).color}`}>
                      {getStatusBadge(student.internshipStatus).label}
                    </span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {student.internshipStatus === 'waiting' ? 'Amaliyot uchun kutishda' : 
                       student.internshipStatus === 'assigned' ? 'Rahbar va kompaniya tayinlangan' :
                       student.internshipStatus === 'start_pending' ? 'Amaliyot boshlash kutilmoqda' :
                       student.internshipStatus === 'started' ? 'Amaliyot boshlangan' :
                       student.internshipStatus === 'completed' ? 'Amaliyot tugadi' :
                       student.internshipStatus === 'grading' ? 'Amaliyot baholashda' :
                       student.internshipStatus === 'graded' ? 'Amaliyot baholandi' :
                       student.internshipStatus === 'confirmed' ? 'Amaliyot tasdiqlandi' :
                       student.internshipStatus === 'cancelled' ? 'Amaliyot bekor qilingan' : 'Noma\'lum'}
                    </div>
                  </div>
                  <div className="relative group">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getInternshipType(internship?.type || student.internshipType)}
                    </span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {(internship?.type || student.internshipType) === 'belgilanmagan' ? 'Amaliyot turi belgilanmagan' :
                       (internship?.type || student.internshipType) === 'malaka' ? 'Malaka amaliyoti' :
                       (internship?.type || student.internshipType) === 'pedagogik' ? 'Pedagogik amaliyot' :
                       (internship?.type || student.internshipType) === 'ilmiy' ? 'Ilmiy amaliyot' : 'Ishlab chiqarish amaliyoti'}
                    </div>
                  </div>
                </div>

                {/* Asosiy ma'lumotlar */}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <GraduationCap size={16} className="mr-2 text-gray-400" />
                    <span className="truncate">{student.faculty}</span>
                  </div>
                  <div className="flex items-center">
                    <Award size={16} className="mr-2 text-gray-400" />
                    <span className="truncate">{student.department}</span>
                  </div>
                  <div className="flex items-center">
                    <UserCheck size={16} className="mr-2 text-gray-400" />
                    <span className="truncate">
                      {internship?.supervisor_name 
                        ? `Amaliyot rahbari: ${internship.supervisor_name}`
                        : student.supervisorName 
                        ? `Amaliyot rahbari: ${student.supervisorName}`
                        : getSupervisorName(student.supervisorId)
                      }
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Building2 size={16} className="mr-2 text-gray-400" />
                    <span className="truncate">
                      {internship?.company_name 
                        ? `Amaliyot joyi: ${internship.company_name}`
                        : student.companyName 
                        ? `Amaliyot joyi: ${student.companyName}`
                        : getCompanyName(student.companyId)
                      }
                    </span>
                  </div>
                </div>

                {/* Qo'shimcha ma'lumotlar */}
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Kurs/Guruh:</span>
                    <span className="font-medium text-gray-900">{student.course}-kurs, {student.group}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Baho:</span>
                    <span className="font-medium text-gray-900">
                      {internship?.grade ? `${internship.grade} ball` : student.grade ? `${student.grade} ball` : '—'}
                    </span>
                  </div>

                  {/* Amaliyot sanalari */}
                  {(internship?.start_date || student.startDate) && (internship?.end_date || student.endDate) && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Amaliyot boshlanishi:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(internship?.start_date || student.startDate).toLocaleDateString('uz-UZ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Amaliyot tugashi:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(internship?.end_date || student.endDate).toLocaleDateString('uz-UZ')}
                        </span>
                      </div>
                    </>
                  )}

                  {/* HEMIS ma'lumotlari */}
                  {student.hemisId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">HEMIS ID:</span>
                      <span className="font-medium text-gray-900">{student.hemisId}</span>
                    </div>
                  )}

                  {student.jshshir && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">JSHSHIR:</span>
                      <span className="font-medium text-gray-900">{student.jshshir}</span>
                    </div>
                  )}

                  {student.region && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Viloyat:</span>
                      <span className="font-medium text-gray-900">{student.region}</span>
                    </div>
                  )}

                  {student.district && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Tuman:</span>
                      <span className="font-medium text-gray-900">{student.district}</span>
                    </div>
                  )}

                  {student.educationLanguage && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Ta'lim tili:</span>
                      <span className="font-medium text-gray-900">{student.educationLanguage}</span>
                    </div>
                  )}

                  {student.specialization && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Mutaxassislik:</span>
                      <span className="font-medium text-gray-900">{student.specialization}</span>
                    </div>
                  )}
                </div>

                {/* Amaliyot ma'lumotlari */}
                {internship && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Users size={14} className="mr-1" />
                      Amaliyot ma'lumotlari
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Amaliyot turi:</span>
                        <span className="font-medium text-gray-900">{internship.type_display || internship.type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Holati:</span>
                        <span className={`font-medium ${
                          internship.status === 'started' ? 'text-green-600' :
                          internship.status === 'completed' ? 'text-blue-600' :
                          internship.status === 'assigned' ? 'text-yellow-600' :
                          internship.status === 'waiting' ? 'text-gray-600' : 'text-purple-600'
                        }`}>
                          {internship.status_display || internship.status}
                        </span>
                      </div>
                      {internship.start_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Boshlanish:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(internship.start_date).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                      )}
                      {internship.end_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Tugashi:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(internship.end_date).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                      )}
                      {internship.duration_days && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Davomiyligi:</span>
                          <span className="font-medium text-gray-900">{internship.duration_days} kun</span>
                        </div>
                      )}
                      {internship.grade && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Baho:</span>
                          <span className="font-medium text-gray-900">{internship.grade} ball</span>
                        </div>
                      )}
                      {internship.supervisor_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Rahbar:</span>
                          <span className="font-medium text-gray-900 truncate ml-2">{internship.supervisor_name}</span>
                        </div>
                      )}
                      {internship.company_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Kompaniya:</span>
                          <span className="font-medium text-gray-900 truncate ml-2">{internship.company_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Login va Parol ma'lumotlari */}
                {student.login_info && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">Login:</span>
                      <span className="font-mono text-xs text-gray-900">{student.login_info.login || student.hemisId}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Parol:</span>
                      <span className="font-mono text-xs text-gray-900">
                        {student.login_info.is_password_changed ? 'O\'zgartirilgan' : student.login_info.password}
                      </span>
                    </div>
                    {student.login_info.is_password_changed && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ Parol o'zgartirilgan
                      </div>
                    )}
                  </div>
                )}
                
                {/* Debug: login_info mavjudligini tekshirish */}
                {!student.login_info && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-red-500">
                      ⚠️ Login ma'lumotlari topilmadi
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Student ID: {student.hemisId || 'Yo\'q'}<br/>
                      Username: {student.name}<br/>
                      Full Name: {student.full_name || 'Yo\'q'}<br/>
                      HEMIS ID: {student.hemisId || 'Yo\'q'}
                    </div>
                  </div>
                )}

                {/* Amallar tugmalari */}
                <div className="flex justify-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEditStudent(student)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Tahrirlash"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleStartInternship(student)}
                    disabled={student.internshipStatus === 'started'}
                    className={`p-2 rounded ${
                      student.internshipStatus === 'started'
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                    }`}
                    title={student.internshipStatus === 'started' ? 'Amaliyot allaqachon faol' : 'Amaliyot boshlash'}
                  >
                    <Play size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteStudent(student.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="O'chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
                );
              })}
          </div>

          {filteredStudents.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Talabalar topilmadi</h3>
              <p className="mt-1 text-sm text-gray-500">
                Qidiruv shartlaringizni o'zgartiring yoki yangi talaba qo'shing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Student Form Modal */}
      {showForm && (
        <StudentForm
          student={editingStudent}
          onSave={handleSaveStudent}
          onClose={() => {
            setShowForm(false);
            setEditingStudent(undefined);
          }}
        />
      )}

      {/* Amaliyot boshlash Modal */}
      {showInternshipModal && internshipStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Amaliyot boshlash - {internshipStudent.name || 'Ism belgilanmagan'}
              </h2>
              <button
                onClick={() => setShowInternshipModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Student ma'lumotlari */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Talaba ma'lumotlari</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">To'liq ism:</span>
                    <span className="ml-2 font-medium">{internshipStudent.name || 'Ism belgilanmagan'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Student ID:</span>
                    <span className="ml-2 font-medium">{internshipStudent.student_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Fakultet:</span>
                    <span className="ml-2 font-medium">{internshipStudent.faculty}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Kafedra:</span>
                    <span className="ml-2 font-medium">{internshipStudent.department}</span>
                  </div>
                </div>
              </div>

              {/* Supervisor tanlash */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Amaliyot rahbari</h3>
                {internshipStudent.supervisorId ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Ism:</span>
                      <span className="ml-2 font-medium">{internshipStudent.supervisorName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Lavozim:</span>
                      <span className="ml-2 font-medium">{internshipStudent.supervisorPosition}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rahbar tanlash</label>
                    <select
                      value={internshipForm.supervisorId || ''}
                      onChange={(e) => setInternshipForm(prev => ({ ...prev, supervisorId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Rahbar tanlang</option>
                {supervisors.filter(s => s.status === 'active' && s.assignedStudents < s.capacity).map((supervisor) => (
                        <option key={supervisor.id} value={supervisor.id}>
                          {supervisor.name} - {supervisor.position} ({supervisor.department})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Company tanlash */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Kompaniya</h3>
                {internshipStudent.companyId ? (
                  <div>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Nomi:</span>
                        <span className="ml-2 font-medium">{internshipStudent.companyName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Manzil:</span>
                        <span className="ml-2 font-medium">{internshipStudent.companyAddress}</span>
                      </div>
                    </div>
                    
                    {/* Company ish jadvali */}
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <h4 className="font-medium text-gray-800 mb-2">Ish jadvali</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Ish kunlari:</span>
                          <div className="mt-1">
                            {companies.find(c => c.id.toString() === internshipStudent.companyId)?.work_days_display?.map((day, index) => (
                              <span key={index} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                                {day}
                              </span>
                            )) || <span className="text-gray-400">Belgilanmagan</span>}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Ish soatlari:</span>
                          <div className="mt-1">
                            {companies.find(c => c.id.toString() === internshipStudent.companyId)?.work_hours_start && 
                             companies.find(c => c.id.toString() === internshipStudent.companyId)?.work_hours_end ? (
                              <span className="font-medium text-green-700">
                                {companies.find(c => c.id.toString() === internshipStudent.companyId)?.work_hours_start} - {companies.find(c => c.id.toString() === internshipStudent.companyId)?.work_hours_end}
                              </span>
                            ) : (
                              <span className="text-gray-400">Belgilanmagan</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kompaniya tanlash</label>
                    <select
                      value={internshipForm.companyId || ''}
                      onChange={(e) => setInternshipForm(prev => ({ ...prev, companyId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Kompaniya tanlang</option>
                      {companies.filter(c => c.status === 'active').map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name} - {company.address}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {/* Amaliyot ma'lumotlari */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Amaliyot ma'lumotlari</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Turi:</span>
                    <span className="ml-2 font-medium">{getInternshipType(getStudentInternship(internshipStudent.id)?.type || internshipStudent.internshipType)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Holati:</span>
                    <span className="ml-2 font-medium">{getStatusBadge(internshipStudent.internshipStatus).label}</span>
                  </div>
                </div>
              </div>

              {/* Amaliyot sozlamalari */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Amaliyot sozlamalari</h3>
                <div className="space-y-4">
                  {/* Amaliyot turi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amaliyot turi</label>
                    <select
                      value={internshipForm.type}
                      onChange={(e) => setInternshipForm(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="belgilanmagan">Belgilanmagan</option>
                      <option value="malaka">Malaka amaliyoti</option>
                      <option value="pedagogik">Pedagogik amaliyot</option>
                      <option value="ilmiy">Ilmiy amaliyot</option>
                      <option value="ishlab_chiqarish">Ishlab chiqarish amaliyoti</option>
                    </select>
                  </div>

                  {/* Boshlanish sanasi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Boshlanish sanasi</label>
                    <input
                      type="date"
                      value={internshipForm.startDate}
                      onChange={(e) => setInternshipForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Davomiyligi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Davomiyligi (ish kuni)</label>
                    <input
                      type="number"
                      value={internshipForm.duration}
                      onChange={(e) => setInternshipForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                      min="1"
                      max="365"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Kompaniya ish kunlariga qarab hisoblanadi
                    </p>
                  </div>

                  {/* Tugash sanasi (avtomatik hisoblanadi) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tugash sanasi (avtomatik)</label>
                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                      {(internshipForm.companyId || internshipStudent.companyId) ? (
                        (() => {
                          const companyId = internshipForm.companyId || internshipStudent.companyId;
                          const selectedCompany = companies.find(c => c.id.toString() === companyId);
                          if (selectedCompany && internshipForm.startDate && internshipForm.duration) {
                            const endDate = calculateEndDate(
                              internshipForm.startDate,
                              internshipForm.duration,
                              selectedCompany.work_days || []
                            );
                            return endDate.toLocaleDateString('uz-UZ');
                          }
                          return 'Kompaniya va sana tanlang';
                        })()
                      ) : (
                        'Kompaniya tanlang'
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Kompaniya ish kunlariga qarab avtomatik hisoblanadi
                    </p>
                  </div>

                  {/* Ish kunlari (Company dan olinadi) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ish kunlari</label>
                    <div className="bg-gray-50 p-3 rounded-md">
                      {(internshipForm.companyId || internshipStudent.companyId) ? (
                        <div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(() => {
                              const companyId = internshipForm.companyId || internshipStudent.companyId;
                              const selectedCompany = companies.find(c => c.id.toString() === companyId);
                            
                              return selectedCompany?.work_days_display?.map((day, index) => (
                                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                  {day}
                                </span>
                              )) || <span className="text-gray-400">Belgilanmagan</span>;
                            })()}
                          </div>
                          <p className="text-xs text-gray-500">
                            Kompaniya ish kunlari avtomatik tanlanadi
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Kompaniya tanlanmagan</span>
                      )}
                    </div>
                  </div>

                  {/* Ish soatlari (Company dan olinadi) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ish soatlari</label>
                    <div className="bg-gray-50 p-3 rounded-md">
                      {(internshipForm.companyId || internshipStudent.companyId) ? (
                        <div>
                          <div className="font-medium text-gray-800 mb-1">
                            {(() => {
                              const companyId = internshipForm.companyId || internshipStudent.companyId;
                              const selectedCompany = companies.find(c => c.id.toString() === companyId);
                              
                              return selectedCompany?.work_hours_start && selectedCompany?.work_hours_end ? (
                                `${selectedCompany.work_hours_start} - ${selectedCompany.work_hours_end}`
                              ) : (
                                'Belgilanmagan'
                              );
                            })()}
                          </div>
                          <p className="text-xs text-gray-500">
                            Kompaniya ish soatlari avtomatik tanlanadi
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Kompaniya tanlanmagan</span>
                      )}
                    </div>
                  </div>

                  {/* Tavsif */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amaliyot tavsifi</label>
                    <textarea
                      value={internshipForm.description}
                      onChange={(e) => setInternshipForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Amaliyot haqida qisqacha ma'lumot..."
                    />
                  </div>
                </div>
              </div>

              {/* Amaliyot boshlash tugmasi */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowInternshipModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleCreateInternship}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md"
                >
                  Amaliyotni boshlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}