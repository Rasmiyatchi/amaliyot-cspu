import { useState, useEffect } from 'react';
import { Search, Plus, Calendar, User, Building2, Clock, Star, Edit, Trash2, Eye } from 'lucide-react';
import { Internship, Student, Supervisor, Company } from '../../types';
import { apiService } from '../../services/api';
import { InternshipDetail } from '../shared/InternshipDetail';
import { useAuth } from '../../contexts/AuthContext';

export function InternshipsManagement() {
  const { user } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [internshipsData, studentsData, supervisorsData, companiesData] = await Promise.all([
        apiService.getInternships(),
        apiService.getStudents(),
        apiService.getSupervisors(),
        apiService.getCompanies()
      ]);

      setInternships(Array.isArray(internshipsData) ? internshipsData : (internshipsData as any).results || []);
      setStudents(Array.isArray(studentsData) ? studentsData : (studentsData as any).results || []);
      setSupervisors(Array.isArray(supervisorsData) ? supervisorsData : (supervisorsData as any).results || []);
      setCompanies(Array.isArray(companiesData) ? companiesData : (companiesData as any).results || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInternships = internships.filter(internship => {
    const matchesSearch = 
      internship.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      internship.supervisor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (internship.company_name && internship.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || internship.status === statusFilter;
    const matchesType = typeFilter === 'all' || internship.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'malaka': return 'bg-purple-100 text-purple-800';
      case 'pedagogik': return 'bg-indigo-100 text-indigo-800';
      case 'ilmiy': return 'bg-orange-100 text-orange-800';
      case 'ishlab_chiqarish': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  const handleCreateInternship = () => {
    setSelectedInternship(null);
    setShowCreateModal(true);
  };

  const canCreateInternship = () => {
    return true; // Sig'im nazorati backend da amalga oshiriladi
  };

  const handleEditInternship = (internship: Internship) => {
    setSelectedInternship(internship);
    setShowEditModal(true);
  };

  const handleDeleteInternship = async (id: string) => {
    if (window.confirm('Bu amaliyotni o\'chirishni xohlaysizmi?')) {
      try {
        await apiService.deleteInternship(id);
        await fetchData();
      } catch (error) {
        console.error('Error deleting internship:', error);
        alert('Amaliyotni o\'chirishda xatolik yuz berdi');
      }
    }
  };


  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Amaliyotlar boshqaruvi</h1>
          <p className="text-gray-600 mt-1">Barcha amaliyotlarni ko'rish va boshqarish</p>
        </div>
        <button 
          onClick={handleCreateInternship}
          disabled={!canCreateInternship()}
          className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
            canCreateInternship() 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Plus size={20} className="mr-2" />
          Yangi amaliyot
        </button>
      </div>


      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Talaba, rahbar yoki korxona bo'yicha qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="lg:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Barcha holatlar</option>
                <option value="active">Faol</option>
                <option value="completed">Yakunlangan</option>
                <option value="cancelled">Bekor qilingan</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="lg:w-48">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Barcha turlar</option>
                <option value="malaka">Malaka amaliyoti</option>
                <option value="pedagogik">Pedagogik amaliyot</option>
                <option value="ilmiy">Ilmiy amaliyot</option>
                <option value="ishlab_chiqarish">Ishlab chiqarish amaliyoti</option>
              </select>
            </div>
          </div>
        </div>

        {/* Internships Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInternships.map((internship) => (
              <div key={internship.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 bg-white flex flex-col">
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="h-14 w-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="text-white" size={28} />
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <p className="text-lg font-bold text-gray-900 truncate">{internship.student_name}</p>
                        <p className="text-sm text-gray-600 font-medium">{internship.type_display}</p>
                      </div>
                    </div>
                    <div className="flex space-x-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => {
                          setSelectedInternship(internship);
                          setShowDetailModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Batafsil ko'rish"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEditInternship(internship)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteInternship(internship.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content - flex-grow to push footer down */}
                <div className="flex-grow">

                {/* Status Badges */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(internship.status)}`}>
                    {internship.status_display}
                  </span>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getTypeColor(internship.type)}`}>
                    {internship.type_display}
                  </span>
                </div>

                {/* Main Info */}
                <div className="space-y-3 text-sm mb-4">
                  <div className="flex items-center bg-gray-50 rounded-lg p-3">
                    <User size={18} className="mr-3 text-blue-500" />
                    <div>
                      <span className="text-gray-500 text-xs">Amaliyot rahbari</span>
                      <p className="font-medium text-gray-900">{internship.supervisor_name}</p>
                    </div>
                  </div>
                  
                  {internship.company_name && (
                    <div className="flex items-center bg-gray-50 rounded-lg p-3">
                      <Building2 size={18} className="mr-3 text-green-500" />
                      <div>
                        <span className="text-gray-500 text-xs">Amaliyot joyi</span>
                        <p className="font-medium text-gray-900">{internship.company_name}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center bg-gray-50 rounded-lg p-3">
                    <Clock size={18} className="mr-3 text-purple-500" />
                    <div>
                      <span className="text-gray-500 text-xs">Amaliyot davri</span>
                      <p className="font-medium text-gray-900">
                        {formatDate(internship.start_date)} - {formatDate(internship.end_date)}
                      </p>
                      {internship.duration_days && (
                        <p className="text-xs text-gray-500">{internship.duration_days} kun</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grade */}
                {internship.grade && (
                  <div className="bg-yellow-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm font-medium">Bahosi:</span>
                      <div className="flex items-center">
                        <Star className="text-yellow-500 fill-current mr-1" size={18} />
                        <span className="font-bold text-gray-900 text-lg">{internship.grade}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {internship.feedback && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <span className="text-gray-600 text-sm font-medium">Izoh:</span>
                    <p className="text-gray-800 text-sm mt-1">{internship.feedback}</p>
                  </div>
                )}

                {/* Supervisor Feedback */}
                {internship.supervisor_feedback && (
                  <div className="bg-green-50 rounded-lg p-3 mb-4">
                    <span className="text-gray-600 text-sm font-medium">Rahbar izohi:</span>
                    <p className="text-gray-800 text-sm mt-1">{internship.supervisor_feedback}</p>
                  </div>
                )}

                </div> {/* End of flex-grow content */}

                {/* Footer */}
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Yaratilgan:</span>
                    <span className="font-medium">{formatDate(internship.created_at)}</span>
                  </div>
                  {internship.created_by_name && (
                    <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                      <span>Yaratgan:</span>
                      <span className="font-medium">{internship.created_by_name}</span>
                    </div>
                  )}
                  {internship.updated_at !== internship.created_at && (
                    <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                      <span>Yangilangan:</span>
                      <span className="font-medium">{formatDate(internship.updated_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredInternships.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Amaliyotlar topilmadi</h3>
              <p className="mt-1 text-sm text-gray-500">
                Qidiruv shartlaringizni o'zgartiring yoki yangi amaliyot qo'shing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <InternshipModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedInternship(null);
          }}
          internship={selectedInternship}
          students={students}
          supervisors={supervisors}
          companies={companies}
          onSave={async (internshipData) => {
            try {
              if (selectedInternship) {
                await apiService.updateInternship(selectedInternship.id, internshipData);
              } else {
                await apiService.createInternship(internshipData);
              }
              await fetchData();
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedInternship(null);
            } catch (error) {
              console.error('Error saving internship:', error);
              alert('Amaliyotni saqlashda xatolik yuz berdi');
            }
          }}
        />
      )}

      {/* Internship Detail Modal */}
      <InternshipDetailModal 
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInternship(null);
        }}
        internship={selectedInternship}
        userRole={user?.role || 'admin'}
      />
    </div>
  );
}

// Internship Modal Component
interface InternshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  internship?: Internship | null;
  students: Student[];
  supervisors: Supervisor[];
  companies: Company[];
  onSave: (data: any) => void;
}

function InternshipModal({ isOpen, onClose, internship, students, supervisors, companies, onSave }: InternshipModalProps) {
  const [formData, setFormData] = useState({
    student: internship?.student || '',
    supervisor: internship?.supervisor || '',
    company: internship?.company || '',
    type: internship?.type || 'malaka',
    start_date: internship?.start_date || '',
    end_date: internship?.end_date || '',
    duration_days: internship?.duration_days || 30,
    status: internship?.status || 'started',
    grade: internship?.grade || '',
    feedback: internship?.feedback || '',
    supervisor_feedback: internship?.supervisor_feedback || ''
  });

  const [calculatedEndDate, setCalculatedEndDate] = useState('');
  const [studentCanStart, setStudentCanStart] = useState<any>(null);

  useEffect(() => {
    if (formData.start_date && formData.duration_days && formData.company) {
      calculateEndDate();
    }
  }, [formData.start_date, formData.duration_days, formData.company]);

  useEffect(() => {
    if (calculatedEndDate) {
      setFormData(prev => ({ ...prev, end_date: calculatedEndDate }));
    }
  }, [calculatedEndDate]);

  useEffect(() => {
    if (formData.student) {
      checkStudentCanStart();
    }
  }, [formData.student]);

  const calculateEndDate = async () => {
    try {
      const result = await apiService.calculateEndDate(
        formData.start_date,
        formData.duration_days,
        formData.company
      );
      setCalculatedEndDate((result as any).end_date);
    } catch (error) {
      console.error('Error calculating end date:', error);
    }
  };

  const checkStudentCanStart = async () => {
    try {
      const result = await apiService.checkStudentCanStart(formData.student);
      setStudentCanStart(result);
    } catch (error) {
      console.error('Error checking student status:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.supervisor) {
      alert('Iltimos, amaliyot rahbarini tanlang');
      return;
    }

    if (!formData.company) {
      alert('Iltimos, kompaniyani tanlang');
      return;
    }

    if (!formData.end_date) {
      alert('Iltimos, tugash sanasini hisoblang');
      return;
    }

    // Prepare data for API
    const selectedSupervisor = supervisors.find(s => s.id.toString() === formData.supervisor);
    const supervisorUserId = selectedSupervisor?.user?.id;
    
    console.log('Debug supervisor data:', {
      formDataSupervisor: formData.supervisor,
      selectedSupervisor,
      supervisorUserId,
      supervisors: supervisors.map(s => ({ id: s.id, user_id: s.user?.id }))
    });
    
    if (!supervisorUserId) {
      alert('Rahbar ma\'lumotlari topilmadi. Iltimos, qaytadan tanlang.');
      return;
    }
    
    const apiData = {
      ...formData,
      student: parseInt(formData.student),
      supervisor: supervisorUserId, // User ID yuborish kerak
      company: parseInt(formData.company),
      end_date: formData.end_date,
      grade: formData.grade ? (typeof formData.grade === 'string' ? parseFloat(formData.grade) : formData.grade) : null,
      duration_days: typeof formData.duration_days === 'string' ? parseInt(formData.duration_days) : formData.duration_days
    };

    onSave(apiData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {internship ? 'Amaliyotni tahrirlash' : 'Yangi amaliyot yaratish'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Talaba *
              </label>
              <select
                value={formData.student}
                onChange={(e) => setFormData({...formData, student: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Talabani tanlang</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.full_name || student.name} ({student.student_id})
                  </option>
                ))}
              </select>
              {studentCanStart && !studentCanStart.can_start && (
                <p className="text-red-600 text-sm mt-1">
                  ⚠️ Bu talaba allaqachon faol amaliyotda
                </p>
              )}
            </div>

            {/* Supervisor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amaliyot rahbari *
              </label>
              <select
                value={formData.supervisor}
                onChange={(e) => {
                  console.log('Supervisor selected:', e.target.value);
                  setFormData({...formData, supervisor: e.target.value});
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Rahbarni tanlang</option>
                {supervisors.map(supervisor => (
                  <option key={supervisor.id} value={supervisor.id}>
                    {supervisor.full_name || supervisor.name} ({supervisor.position})
                  </option>
                ))}
              </select>
            </div>

            {/* Company Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Korxona
              </label>
              <select
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Korxonani tanlang</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.direction})
                  </option>
                ))}
              </select>
            </div>

            {/* Internship Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amaliyot turi *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as 'malaka' | 'pedagogik' | 'ilmiy' | 'ishlab_chiqarish'})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="malaka">Malaka amaliyoti</option>
                <option value="pedagogik">Pedagogik amaliyot</option>
                <option value="ilmiy">Ilmiy amaliyot</option>
                <option value="ishlab_chiqarish">Ishlab chiqarish amaliyoti</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boshlanish sanasi *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Duration Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amaliyot kunlari soni *
              </label>
              <input
                type="number"
                min="1"
                value={formData.duration_days}
                onChange={(e) => setFormData({...formData, duration_days: parseInt(e.target.value)})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Calculated End Date */}
            {calculatedEndDate && (
              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm font-medium">
                    📅 Avtomatik hisoblangan tugash sanasi: {new Date(calculatedEndDate).toLocaleDateString('uz-UZ')}
                  </p>
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Holat
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as 'started' | 'completed' | 'cancelled'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="started">Boshlangan</option>
                <option value="completed">Yakunlangan</option>
                <option value="cancelled">Bekor qilingan</option>
              </select>
            </div>

            {/* Grade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bahosi
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.grade}
                onChange={(e) => setFormData({...formData, grade: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Feedback */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Izoh
              </label>
              <textarea
                value={formData.feedback}
                onChange={(e) => setFormData({...formData, feedback: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Supervisor Feedback */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rahbar izohi
              </label>
              <textarea
                value={formData.supervisor_feedback}
                onChange={(e) => setFormData({...formData, supervisor_feedback: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {internship ? 'Yangilash' : 'Yaratish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Internship Detail Modal Component
function InternshipDetailModal({ 
  isOpen, 
  onClose, 
  internship,
  userRole
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  internship: Internship | null;
  userRole: string;
}) {
  if (!isOpen || !internship) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <InternshipDetail 
          internshipId={internship.id}
          userRole={userRole as 'student' | 'admin' | 'supervisor' | 'super_admin'}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
