import { useState, useEffect } from 'react';
import { User, Calendar, Building2, AlertCircle, FileText, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Internship } from '../../types';
import { InternshipDetail } from '../shared/InternshipDetail';

export function MyInternship() {
  const { user } = useAuth();
  const [currentInternship, setCurrentInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [canStartInternship, setCanStartInternship] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (user?.id) {
        // Talabaning holatini tekshirish
        const canStart = await apiService.checkStudentCanStart(user.id) as any;
        setCanStartInternship(canStart);
        
        if (canStart.active_internship) {
          setCurrentInternship(canStart.active_internship);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInternship = async () => {
    if (!currentInternship) return;
    
    try {
      // Amaliyotni boshlash API chaqirishi
      await apiService.updateInternship(currentInternship.id, { status: 'started' });
      
      // Ma'lumotlarni yangilash
      await fetchData();
      
      alert('Amaliyot muvaffaqiyatli boshladi!');
    } catch (error) {
      console.error('Error starting internship:', error);
      alert('Amaliyotni boshlashda xatolik yuz berdi');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mening amaliyotim</h1>
        <p className="text-gray-600 mt-1">Amaliyot ma'lumotlari va boshqaruvi</p>
      </div>

      {/* No Internship Alert */}
      {!currentInternship && canStartInternship?.can_start && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertCircle className="text-blue-600 mr-3" size={24} />
            <div>
              <h3 className="text-blue-800 font-medium text-lg">Amaliyot tayinlanmagan</h3>
              <p className="text-blue-700 mt-1">
                Hali sizga amaliyot tayinlanmagan. Admin sizga amaliyot tayinlaganidan keyin bu yerda ko'rasiz.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Internship */}
      {currentInternship && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Amaliyot ma'lumotlari</h2>
                <p className="text-gray-600 mt-1">{currentInternship.type_display}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentInternship.status === 'started' ? 'bg-green-100 text-green-800' :
                currentInternship.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                currentInternship.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {currentInternship.status_display}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="text-gray-400 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Rahbar</p>
                    <p className="font-medium">{currentInternship.supervisor_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Building2 className="text-gray-400 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Korxona</p>
                    <p className="font-medium">{currentInternship.company_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="text-gray-400 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Davomiyligi</p>
                    <p className="font-medium">{currentInternship.duration_days} kun</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <Calendar className="text-gray-400 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Boshlanish sanasi</p>
                    <p className="font-medium">{new Date(currentInternship.start_date).toLocaleDateString('uz-UZ')}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="text-gray-400 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Tugash sanasi</p>
                    <p className="font-medium">{new Date(currentInternship.end_date).toLocaleDateString('uz-UZ')}</p>
                  </div>
                </div>
                
                {currentInternship.grade && (
                  <div className="flex items-center">
                    <Star className="text-yellow-500 mr-3" size={20} />
                    <div>
                      <p className="text-sm text-gray-600">Yakuniy baho</p>
                      <p className="font-medium text-lg">{currentInternship.grade}/5</p>
                      <p className="text-xs text-gray-500">
                        {Math.round((currentInternship.grade / 5) * 100)}% ga teng
                      </p>
                      {currentInternship.grade_comment && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                          <p className="font-medium mb-1">Rahbar izohi:</p>
                          <p>{currentInternship.grade_comment}</p>
                          {currentInternship.graded_by_name && (
                            <p className="text-xs text-blue-600 mt-1">
                              Baholagan: {currentInternship.graded_by_name}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Start Internship Button */}
            {currentInternship.status === 'assigned' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Amaliyotni boshlash</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Boshlanish sanasi: {new Date(currentInternship.start_date).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                  <button
                    onClick={handleStartInternship}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      new Date() >= new Date(currentInternship.start_date)
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={new Date() < new Date(currentInternship.start_date)}
                  >
                    {new Date() >= new Date(currentInternship.start_date) ? 'Amaliyotni boshlash' : 'Kutish kerak'}
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            {currentInternship.status === 'started' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">Amaliyot harakatlari</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setShowDetail(true)}
                    className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="mr-2" size={20} />
                    <span>Batafsil ko'rish</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feedback */}
            {currentInternship.feedback && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Rahbar izohi</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{currentInternship.feedback}</p>
              </div>
            )}

            {currentInternship.supervisor_feedback && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 mb-2">Supervisor izohi</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{currentInternship.supervisor_feedback}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Internship Detail Modal */}
      {showDetail && currentInternship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <InternshipDetail 
              internshipId={currentInternship.id}
              userRole="student"
              onClose={() => setShowDetail(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}