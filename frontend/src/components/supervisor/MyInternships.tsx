import { useState, useEffect } from 'react';
import { BookOpen, Star, AlertCircle, Eye, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Internship } from '../../types';
import { InternshipDetail } from '../shared/InternshipDetail';
import { InternshipActions } from './InternshipActions';

export function MyInternships() {
  const { user } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInternship, setSelectedInternship] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (user?.id) {
        const internshipsData = await apiService.getSupervisorInternships(user.id);
        setInternships((internshipsData as any).internships || []);
      }
    } catch (error) {
      console.error('Error fetching internships data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInternships = internships.filter(internship => {
    const matchesSearch = 
      internship.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      internship.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      internship.type_display.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || internship.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusCounts = () => {
    return {
      all: internships.length,
      assigned: internships.filter(i => i.status === 'assigned').length,
      started: internships.filter(i => i.status === 'started').length,
      completed: internships.filter(i => i.status === 'completed').length,
      cancelled: internships.filter(i => i.status === 'cancelled').length
    };
  };

  const statusCounts = getStatusCounts();

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
          <h1 className="text-2xl font-bold text-gray-900">Mening amaliyotlarim</h1>
          <p className="text-gray-600 mt-1">Boshqariladigan amaliyotlar</p>
        </div>
        <div className="text-sm text-gray-600">
          Jami: {internships.length} ta amaliyot
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{statusCounts.all}</p>
            <p className="text-sm text-gray-600">Jami</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{statusCounts.assigned}</p>
            <p className="text-sm text-gray-600">Tayinlangan</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{statusCounts.started}</p>
            <p className="text-sm text-gray-600">Boshlangan</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{statusCounts.completed}</p>
            <p className="text-sm text-gray-600">Tugagan</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{statusCounts.cancelled}</p>
            <p className="text-sm text-gray-600">Bekor qilingan</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Amaliyot qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <BookOpen className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Barcha holatlar</option>
              <option value="assigned">Tayinlangan</option>
              <option value="started">Boshlangan</option>
              <option value="completed">Tugagan</option>
              <option value="cancelled">Bekor qilingan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Internships List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Amaliyotlar ro'yxati</h2>
        </div>
        <div className="p-6">
          {filteredInternships.length > 0 ? (
            <div className="space-y-4">
              {filteredInternships.map((internship) => (
                <div key={internship.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <BookOpen className="text-green-600" size={24} />
                      </div>
                      <div className="ml-4">
                        <h3 className="font-semibold text-gray-900">{internship.student_name}</h3>
                        <p className="text-sm text-gray-600">{internship.company_name}</p>
                        <p className="text-sm text-gray-500">{internship.type_display}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        internship.status === 'started' ? 'bg-green-100 text-green-800' :
                        internship.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        internship.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {internship.status_display}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedInternship(internship.id);
                          setShowDetail(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Amaliyotni ko'rish"
                      >
                        <Eye size={20} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedInternship(internship.id);
                          setShowActions(true);
                        }}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Amaliyot harakatlari"
                      >
                        <Star size={20} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Boshlanish sanasi</p>
                        <p className="font-medium">{new Date(internship.start_date).toLocaleDateString('uz-UZ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tugash sanasi</p>
                        <p className="font-medium">{new Date(internship.end_date).toLocaleDateString('uz-UZ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Davomiyligi</p>
                        <p className="font-medium">{internship.duration_days} kun</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Bahosi</p>
                        <p className="font-medium">
                          {internship.grade ? (
                            <span className="flex items-center">
                              <Star className="text-yellow-500 mr-1" size={16} />
                              {internship.grade}/5
                              {internship.grade_comment && (
                                <span className="ml-2 text-xs text-gray-500">
                                  (Izoh bor)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-500">Hali yo'q</span>
                          )}
                        </p>
                        {internship.is_graded && internship.graded_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Baholangan: {new Date(internship.graded_at).toLocaleDateString('uz-UZ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Baholash izohi */}
                    {internship.grade_comment && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="mb-2">
                          <p className="text-sm text-gray-600 mb-1">Baholash izohi:</p>
                          <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                            {internship.grade_comment}
                          </p>
                        </div>
                        {internship.graded_at && (
                          <p className="text-xs text-gray-500">
                            Baholangan: {new Date(internship.graded_at).toLocaleDateString('uz-UZ')}
                          </p>
                        )}
                      </div>
                    )}

                    {(internship.feedback || internship.supervisor_feedback) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        {internship.feedback && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-600 mb-1">Rahbar izohi:</p>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{internship.feedback}</p>
                          </div>
                        )}
                        {internship.supervisor_feedback && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Supervisor izohi:</p>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{internship.supervisor_feedback}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="text-gray-400 mx-auto mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Amaliyot topilmadi</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' ? 'Qidiruv natijasiga mos amaliyot yo\'q' : 'Hali amaliyot yo\'q'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Internship Detail Modal */}
      {showDetail && selectedInternship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <InternshipDetail 
              internshipId={selectedInternship}
              userRole="supervisor"
              onClose={() => {
                setShowDetail(false);
                setSelectedInternship(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Internship Actions Modal */}
      {showActions && selectedInternship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Amaliyot harakatlari</h2>
                <button
                  onClick={() => {
                    setShowActions(false);
                    setSelectedInternship(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <InternshipActions 
                internship={internships.find(i => i.id === selectedInternship)}
                onUpdate={() => {
                  fetchData();
                  setShowActions(false);
                  setSelectedInternship(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
