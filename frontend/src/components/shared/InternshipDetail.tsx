import { useState, useEffect } from 'react';
import { Calendar, Building2, User, Star, FileText, Upload, Clock, Award, MessageSquare, CheckCircle, XCircle, Eye, CalendarDays } from 'lucide-react';
import { apiService } from '../../services/api';
import { Internship, Student, Supervisor, Company, Document, DailyReport } from '../../types';
import { InternshipGrading } from '../supervisor/InternshipGrading';

interface InternshipDetailProps {
  internshipId: string;
  userRole: 'student' | 'admin' | 'supervisor' | 'super_admin';
  onClose?: () => void;
}

export function InternshipDetail({ internshipId, userRole, onClose }: InternshipDetailProps) {
  const [internship, setInternship] = useState<Internship | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'documents' | 'grades'>('overview');

  useEffect(() => {
    fetchInternshipDetails();
  }, [internshipId]);

  const fetchInternshipDetails = async () => {
    try {
      setLoading(true);
      
      // Amaliyot ma'lumotlarini olish
      const internshipData = await apiService.getInternship(internshipId) as Internship;
      setInternship(internshipData);
      
      // Talaba ma'lumotlari - internship.student ID bo'lsa
      if (internshipData.student) {
        try {
          // Agar student ID User ID bo'lsa, Student ID ga aylantirish
          let studentId = internshipData.student.toString();
          try {
            // Avval User ID dan Student ID ni olish
            const studentByUser = await apiService.getStudentByUserId(studentId) as any;
            studentId = studentByUser.id.toString();
          } catch (userError) {
            // Agar User ID bo'lmasa, to'g'ridan-to'g'ri Student ID deb ishlatish
            console.log('Using student ID directly:', studentId);
          }
          
          const studentData = await apiService.getStudent(studentId) as Student;
          setStudent(studentData);
        } catch (error) {
          console.error('Error fetching student:', error);
          // Student topilmasa, internship ma'lumotlaridan foydalanish
          if (internshipData.student_name) {
            setStudent({
              id: internshipData.student.toString(),
              name: internshipData.student_name,
              full_name: internshipData.student_name,
              studentId: internshipData.student_name.split(' ').pop() || '',
              faculty: 'Tabiiy fanlar',
              department: '60110900',
              course: 3,
              group: 'BIO-23/4',
              phone: '',
              internshipType: internshipData.type || 'belgilanmagan',
              internshipStatus: internshipData.status || 'waiting'
            } as Student);
          }
        }
      }
      
      // Supervisor ma'lumotlari - internship.supervisor User ID bo'lsa
      if (internshipData.supervisor) {
        try {
          // Avval Supervisor modelini olish (User ID orqali)
          const supervisorData = await apiService.getSupervisorByUserId(internshipData.supervisor.toString()) as Supervisor;
          
          if (supervisorData) {
            setSupervisor(supervisorData);
          } else {
            // Supervisor topilmasa, internship ma'lumotlaridan foydalanish
            if (internshipData.supervisor_name) {
              setSupervisor({
                id: internshipData.supervisor.toString(),
                name: internshipData.supervisor_name,
                full_name: internshipData.supervisor_name,
                position: 'Rahbar',
                department: '',
                faculty: '',
                phone: '',
                specialization: '',
                capacity: 0,
                assignedStudents: 0,
                rating: 0,
                status: 'active',
                experience: 0
              } as Supervisor);
            }
          }
        } catch (error) {
          console.error('Error fetching supervisor:', error);
          // Supervisor topilmasa, internship ma'lumotlaridan foydalanish
          if (internshipData.supervisor_name) {
            setSupervisor({
              id: internshipData.supervisor.toString(),
              name: internshipData.supervisor_name,
              full_name: internshipData.supervisor_name,
              position: 'Rahbar',
              department: '',
              faculty: '',
              phone: '',
              specialization: '',
              capacity: 0,
              assignedStudents: 0,
              rating: 0,
              status: 'active',
              experience: 0
            } as Supervisor);
          }
        }
      }
      
      // Kompaniya ma'lumotlari - internship.company ID bo'lsa
      if (internshipData.company) {
        try {
          const companyData = await apiService.getCompany(internshipData.company.toString()) as Company;
          setCompany(companyData);
        } catch (error) {
          console.error('Error fetching company:', error);
          // Company topilmasa, internship ma'lumotlaridan foydalanish
          if (internshipData.company_name) {
            setCompany({
              id: internshipData.company.toString(),
              name: internshipData.company_name,
              direction: 'IT',
              address: 'Mo\'minov ko\'chasi, 7/2',
              phone: '+998901002010',
              capacity: 10,
              assignedStudents: 1,
              status: 'active'
            } as Company);
          }
        }
      }
      
      // Hujjatlar ma'lumotlarini olish
      try {
        const documentsData = await apiService.getDocumentsByInternship(internshipId);
        if (Array.isArray(documentsData)) {
          setDocuments(documentsData);
        } else if (documentsData && typeof documentsData === 'object' && 'results' in documentsData && Array.isArray(documentsData.results)) {
          setDocuments(documentsData.results);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
        setDocuments([]);
      }
      
      // Kunlik hisobotlar ma'lumotlarini olish
      try {
        const reportsData = await apiService.getDailyReportsByInternship(internshipId);
        if (Array.isArray(reportsData)) {
          setDailyReports(reportsData);
        } else if (reportsData && typeof reportsData === 'object' && 'results' in reportsData && Array.isArray(reportsData.results)) {
          setDailyReports(reportsData.results);
        } else {
          setDailyReports([]);
        }
      } catch (error) {
        console.error('Error fetching daily reports:', error);
        setDailyReports([]);
      }
      
    } catch (error) {
      console.error('Error fetching internship details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-gray-100 text-gray-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'start_pending': return 'bg-orange-100 text-orange-800';
      case 'started': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'grading': return 'bg-purple-100 text-purple-800';
      case 'graded': return 'bg-indigo-100 text-indigo-800';
      case 'confirmed': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Kutilmoqda';
      case 'assigned': return 'Tayinlangan';
      case 'start_pending': return 'Boshlash kutilmoqda';
      case 'started': return 'Boshlangan';
      case 'completed': return 'Tugadi';
      case 'grading': return 'Baholash';
      case 'graded': return 'Baholandi';
      case 'confirmed': return 'Tasdiqlandi';
      case 'cancelled': return 'Bekor qilingan';
      default: return 'Noma\'lum';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Amaliyot topilmadi</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {internship.type_display} amaliyoti
              </h1>
              <p className="text-gray-600 mt-1">
                {student?.full_name || student?.name} - {company?.name}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(internship.status)}`}>
                {getStatusText(internship.status)}
              </span>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <div className="flex space-x-8 border-b border-gray-200">
            {[
              { id: 'overview', label: 'Umumiy ma\'lumot', icon: FileText },
              { id: 'reports', label: 'Hisobotlar', icon: Calendar },
              { id: 'documents', label: 'Hujjatlar', icon: Upload },
              { id: 'grades', label: 'Baholar', icon: Award }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Amaliyot ma'lumotlari */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Amaliyot ma'lumotlari</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Boshlanish sanasi</p>
                  <p className="font-medium">{new Date(internship.start_date).toLocaleDateString('uz-UZ')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Tugash sanasi</p>
                  <p className="font-medium">{new Date(internship.end_date).toLocaleDateString('uz-UZ')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Davomiyligi</p>
                  <p className="font-medium">{internship.duration_days || '—'} kun</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Building2 className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Korxona</p>
                  <p className="font-medium">{company?.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Talaba ma'lumotlari */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Talaba ma'lumotlari</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">To'liq ism</p>
                  <p className="font-medium">{student?.full_name || student?.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Student ID</p>
                  <p className="font-medium">{student?.student_id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Fakultet</p>
                  <p className="font-medium">{student?.faculty}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Kafedra</p>
                  <p className="font-medium">{student?.department}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Supervisor ma'lumotlari */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rahbar ma'lumotlari</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">To'liq ism</p>
                  <p className="font-medium">{supervisor?.full_name || supervisor?.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Lavozim</p>
                  <p className="font-medium">{supervisor?.position}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Telefon</p>
                  <p className="font-medium">{supervisor?.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Baho va fikr */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Baholash</h3>
            <div className="space-y-4">
              {internship.grade && (
                <div className="flex items-center space-x-3">
                  <Star className="text-yellow-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Bahosi</p>
                    <p className="font-medium text-lg">{internship.grade}</p>
                  </div>
                </div>
              )}
              {internship.feedback && (
                <div className="flex items-start space-x-3">
                  <MessageSquare className="text-gray-400 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Talaba fikri</p>
                    <p className="font-medium">{internship.feedback}</p>
                  </div>
                </div>
              )}
              {internship.supervisor_feedback && (
                <div className="flex items-start space-x-3">
                  <MessageSquare className="text-gray-400 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Rahbar fikri</p>
                    <p className="font-medium">{internship.supervisor_feedback}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Kundalik hisobotlar</h3>
            <div className="text-sm text-gray-500">
              Jami: {dailyReports.length} ta hisobot
            </div>
          </div>
          
          {dailyReports.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Hisobotlar yo'q</h3>
              <p className="mt-1 text-sm text-gray-500">
                Bu amaliyot uchun hali hech qanday kunlik hisobot yuborilmagan
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {dailyReports.map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <CalendarDays className="h-6 w-6 text-blue-600 mt-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {new Date(report.date).toLocaleDateString('uz-UZ', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'long'
                            })}
                          </h4>
                          <span className="text-xs text-gray-500">
                            ({report.hours} soat)
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                          {report.activities}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>
                            Yuborilgan: {new Date(report.created_at).toLocaleDateString('uz-UZ')}
                          </span>
                          {report.photos && report.photos.length > 0 && (
                            <span className="flex items-center">
                              <FileText className="w-3 h-3 mr-1" />
                              {report.photos.length} ta rasm
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        report.status === 'approved' ? 'bg-green-100 text-green-800' :
                        report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.status === 'approved' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Tasdiqlangan
                          </>
                        ) : report.status === 'rejected' ? (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Rad etilgan
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Kutilmoqda
                          </>
                        )}
                      </span>
                      
                      {/* Supervisor Actions */}
                      {userRole === 'supervisor' && report.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={async () => {
                              try {
                                await apiService.approveDailyReport(report.id.toString());
                                // Ma'lumotlarni yangilash
                                fetchInternshipDetails();
                              } catch (error) {
                                console.error('Error approving report:', error);
                                alert('Hisobotni tasdiqlashda xatolik yuz berdi');
                              }
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-green-300 shadow-sm text-xs font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Tasdiqlash
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Rad etish sababini kiriting:');
                              if (reason) {
                                apiService.rejectDailyReport(report.id.toString(), reason)
                                  .then(() => {
                                    fetchInternshipDetails();
                                  })
                                  .catch((error) => {
                                    console.error('Error rejecting report:', error);
                                    alert('Hisobotni rad etishda xatolik yuz berdi');
                                  });
                              }
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Rad etish
                          </button>
                        </div>
                      )}
                      
                      {/* View Photos Button */}
                      {report.photos && report.photos.length > 0 && (
                        <button
                          onClick={() => {
                            // Rasmlarni modal orqali ko'rsatish
                            const modal = document.createElement('div');
                            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
                            modal.innerHTML = `
                              <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                                <div class="flex items-center justify-between p-6 border-b border-gray-200">
                                  <h3 class="text-lg font-semibold text-gray-900">Hisobot rasmlari</h3>
                                  <button onclick="this.closest('.fixed').remove()" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">×</button>
                                </div>
                                <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  ${(report.photos || []).map((photo: string) => `
                                    <img src="${photo}" alt="Hisobot rasmi" class="w-full h-48 object-cover rounded-lg border border-gray-200" />
                                  `).join('')}
                                </div>
                              </div>
                            `;
                            document.body.appendChild(modal);
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Rasmlar
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Rejection Reason */}
                  {report.status === 'rejected' && report.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        <strong>Rad etish sababi:</strong> {report.rejection_reason}
                      </p>
                    </div>
                  )}
                  
                  {/* Supervisor Comment */}
                  {report.supervisor_comment && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Rahbar izohi:</strong> {report.supervisor_comment}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Hujjatlar</h3>
            <div className="text-sm text-gray-500">
              Jami: {documents.length} ta hujjat
            </div>
          </div>
          
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Hujjatlar yo'q</h3>
              <p className="mt-1 text-sm text-gray-500">
                Bu amaliyot uchun hali hech qanday hujjat yuklanmagan
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <FileText className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {doc.name}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500">
                            Turi: {doc.type === 'contract' ? 'Shartnoma' : 
                                   doc.type === 'program' ? 'Dastur' : 
                                   doc.type === 'report' ? 'Hisobot' : 
                                   doc.type === 'certificate' ? 'Sertifikat' : 'Boshqa'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Yuklangan: {new Date(doc.uploaded_at).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                        doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status === 'approved' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Tasdiqlangan
                          </>
                        ) : doc.status === 'rejected' ? (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Rad etilgan
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Kutilmoqda
                          </>
                        )}
                      </span>
                      
                      {/* View Button */}
                      <button
                        onClick={() => window.open(doc.file, '_blank')}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ko'rish
                      </button>
                    </div>
                  </div>
                  
                  {/* Rejection Reason */}
                  {doc.status === 'rejected' && doc.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        <strong>Rad etish sababi:</strong> {doc.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'grades' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Baholash</h3>
          
          {/* Current Grade Display */}
          {internship.grade ? (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Star className="text-yellow-500 mr-3" size={24} />
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Yakuniy baho</p>
                    <p className="text-sm text-gray-600">
                      Baholangan: {internship.graded_at ? new Date(internship.graded_at).toLocaleDateString('uz-UZ') : new Date(internship.updated_at || internship.created_at).toLocaleDateString('uz-UZ')}
                    </p>
                    {internship.graded_by_name && (
                      <p className="text-xs text-blue-600">
                        Baholagan: {internship.graded_by_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center">
                    <span className="text-4xl font-bold text-blue-600">{internship.grade}</span>
                    <span className="text-gray-500 ml-1 text-lg">/5</span>
                  </div>
                  <div className="text-lg font-medium text-blue-700">
                    {Math.round((internship.grade / 5) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-center">
                <Star className="text-gray-400 mx-auto mb-2" size={32} />
                <p className="text-gray-600">Hali baho qo'yilmagan</p>
              </div>
            </div>
          )}

          {/* Feedback Sections */}
          <div className="space-y-6">
            {/* Grade Comment */}
            {internship.grade_comment && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Baholash izohi</h4>
                <p className="text-blue-700">{internship.grade_comment}</p>
                {internship.graded_at && (
                  <p className="text-xs text-blue-600 mt-2">
                    Baholangan: {new Date(internship.graded_at).toLocaleDateString('uz-UZ')}
                    {internship.graded_by_name && ` • ${internship.graded_by_name}`}
                  </p>
                )}
              </div>
            )}

            {/* Student Feedback */}
            {internship.feedback && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Talaba fikri</h4>
                <p className="text-green-700">{internship.feedback}</p>
              </div>
            )}

            {/* Supervisor Feedback */}
            {internship.supervisor_feedback && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Rahbar fikri</h4>
                <p className="text-blue-700">{internship.supervisor_feedback}</p>
              </div>
            )}
          </div>

          {/* Grade Management (for supervisors) */}
          {userRole === 'supervisor' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Baholash</h4>
                {internship.is_graded && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Baholangan
                  </span>
                )}
              </div>

              {/* Baholash tugmasi yoki xabari */}
              {!internship.is_graded ? (
                <div className="text-center py-6">
                  <InternshipGrading
                    internship={internship}
                    onGradeSubmitted={fetchInternshipDetails}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-green-600">
                  <Star className="text-green-500 mx-auto mb-2" size={32} />
                  <p className="font-medium">Amaliyot muvaffaqiyatli baholangan!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Talaba o'z bahosini ko'rib turibdi
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Admin/SuperAdmin uchun yakunlash tugmasi */}
          {(userRole === 'admin' || userRole === 'super_admin') && internship.is_graded && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center py-4">
                <div className="mb-4 text-gray-600">
                  <p className="font-medium">Amaliyot baholangan</p>
                  {internship.graded_by_name && (
                    <p className="text-sm text-gray-500 mt-1">
                      Baholagan: {internship.graded_by_name}
                    </p>
                  )}
                </div>
                
                {/* Yakunlash tugmasi */}
                {internship.status === 'graded' && (
                  <button
                    onClick={async () => {
                      const confirmComplete = confirm('Amaliyotni yakunlashni xohlaysizmi? Bu amalni qaytarib bo\'lmaydi.');
                      if (!confirmComplete) return;
                      
                      try {
                        setLoading(true);
                        await apiService.confirmInternship(internshipId);
                        alert('Amaliyot muvaffaqiyatli yakunlandi!');
                        await fetchInternshipDetails();
                      } catch (error) {
                        console.error('Error confirming internship:', error);
                        alert('Amaliyotni yakunlashda xatolik yuz berdi');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Yakunlanmoqda...' : 'Amaliyotni yakunlash'}
                  </button>
                )}
                
                {/* Yakunlangan xabari */}
                {internship.status === 'confirmed' && (
                  <div className="text-green-600">
                    <CheckCircle className="mx-auto mb-2" size={32} />
                    <p className="font-medium">Amaliyot yakunlandi!</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Bu amaliyot tarixda saqlanib qoldi
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
