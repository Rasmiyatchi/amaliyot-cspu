import { useState, useEffect } from 'react';
import { Users, Star, AlertCircle, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Student, Internship } from '../../types';
import { InternshipDetail } from '../shared/InternshipDetail';

export function MyStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInternship, setSelectedInternship] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (user?.id) {
        const [studentsData, internshipsData] = await Promise.all([
          apiService.getSupervisorStudents(user.id),
          apiService.getSupervisorInternships(user.id)
        ]);

        setStudents((studentsData as any).students || []);
        setInternships((internshipsData as any).internships || []);
      }
    } catch (error) {
      console.error('Error fetching students data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStudentInternship = (studentId: string) => {
    return internships.find(internship => internship.student === studentId);
  };

  const filteredStudents = students.filter(student =>
    (student.full_name || student.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.student_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mening talabalarim</h1>
          <p className="text-gray-600 mt-1">Biriktirilgan talabalar ro'yxati</p>
        </div>
        <div className="text-sm text-gray-600">
          Jami: {students.length} ta talaba
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Talaba qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Users className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Talabalar ro'yxati</h2>
        </div>
        <div className="p-6">
          {filteredStudents.length > 0 ? (
            <div className="space-y-4">
              {filteredStudents.map((student) => {
                const internship = getStudentInternship(student.id);
                return (
                  <div key={student.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="text-blue-600" size={24} />
                        </div>
                        <div className="ml-4">
                          <h3 className="font-semibold text-gray-900">{student.full_name || student.name}</h3>
                          <p className="text-sm text-gray-600">Student ID: {student.student_id}</p>
                          <p className="text-sm text-gray-500">{student.course}-kurs, {student.group} guruhi</p>
                          <p className="text-sm text-gray-500">{student.faculty} - {student.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {internship ? (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            internship.status === 'started' ? 'bg-green-100 text-green-800' :
                            internship.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            internship.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                            internship.status === 'waiting' ? 'bg-gray-100 text-gray-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {internship.status_display}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            Amaliyot yo'q
                          </span>
                        )}
                        <button
                          onClick={() => internship && setSelectedInternship(internship.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Amaliyotni ko'rish"
                          disabled={!internship}
                        >
                          <Eye size={20} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Talaba qo'shimcha ma'lumotlari */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Telefon:</p>
                          <p className="font-medium">{student.phone || '—'}</p>
                        </div>
                        {student.region && (
                          <div>
                            <p className="text-gray-600">Viloyat:</p>
                            <p className="font-medium">{student.region}</p>
                          </div>
                        )}
                        {student.district && (
                          <div>
                            <p className="text-gray-600">Tuman:</p>
                            <p className="font-medium">{student.district}</p>
                          </div>
                        )}
                        {student.educationLanguage && (
                          <div>
                            <p className="text-gray-600">Ta'lim tili:</p>
                            <p className="font-medium">{student.educationLanguage}</p>
                          </div>
                        )}
                        {student.specialization && (
                          <div>
                            <p className="text-gray-600">Mutaxassislik:</p>
                            <p className="font-medium">{student.specialization}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {internship && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Amaliyot ma'lumotlari</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Korxona</p>
                            <p className="font-medium">{internship.company_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Boshlanish sanasi</p>
                            <p className="font-medium">{new Date(internship.start_date).toLocaleDateString('uz-UZ')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Tugash sanasi</p>
                            <p className="font-medium">{internship.end_date ? new Date(internship.end_date).toLocaleDateString('uz-UZ') : '—'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Davomiyligi</p>
                            <p className="font-medium">{internship.duration_days ? `${internship.duration_days} kun` : '—'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Amaliyot turi</p>
                            <p className="font-medium">{internship.type_display || internship.type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Holati</p>
                            <p className="font-medium">{internship.status_display || internship.status}</p>
                          </div>
                        </div>
                        
                        {internship.grade && (
                          <div className="mt-3 flex items-center">
                            <Star className="text-yellow-500 mr-2" size={16} />
                            <span className="text-sm text-gray-600">Bahosi: </span>
                            <span className="font-medium text-gray-900 ml-1">{internship.grade}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="text-gray-400 mx-auto mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Talaba topilmadi</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Qidiruv natijasiga mos talaba yo\'q' : 'Hali talaba biriktirilmagan'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Internship Detail Modal */}
      {selectedInternship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <InternshipDetail 
              internshipId={selectedInternship}
              userRole="supervisor"
              onClose={() => setSelectedInternship(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
