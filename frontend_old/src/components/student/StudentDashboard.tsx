import { BookOpen, Calendar, FileText, Award, MapPin, Phone, AlertCircle, Play, TrendingUp } from 'lucide-react';
import { StatCard } from '../admin/StatCard';
import { ProgressBar } from '../shared/ProgressBar';
import { useDailyReports } from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Internship } from '../../types';

export function StudentDashboard() {
  const { reports } = useDailyReports();
  const { user } = useAuth();
  const [currentInternship, setCurrentInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [canStartInternship, setCanStartInternship] = useState<any>(null);
  const [dailyStatus, setDailyStatus] = useState<any>(null);
  const [internshipHistory, setInternshipHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      
      // Talabaning faol amaliyotini olish
      if (user?.id) {
        const canStart = await apiService.checkStudentCanStart(user.id) as any;
        setCanStartInternship(canStart);
        
        if (canStart.active_internship) {
          setCurrentInternship(canStart.active_internship);
          
          // Kunlik statusni olish - faqat started holatida
          if (canStart.active_internship.status === 'started') {
            try {
              const status = await apiService.getStudentDailyStatus() as any;
              setDailyStatus(status);
            } catch (error) {
              console.error('Error fetching daily status:', error);
              setDailyStatus(null);
              // Xatolikni ignore qilish - polling davom etsin
            }
          } else {
            setDailyStatus(null);
          }
        } else {
          console.log('DEBUG: No active internship'); // Debug
        }
        
        // Amaliyotlar tarixini olish
        await fetchInternshipHistory();
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInternshipHistory = async () => {
    try {
      const internships = await apiService.getInternships();
      const allInternships = Array.isArray(internships) 
        ? internships 
        : (internships as any).results || [];
      
      // Faqat yakunlangan amaliyotlarni olish
      const history = allInternships.filter((internship: any) => 
        internship.status === 'confirmed' && internship.student_name === user?.name
      );
      
      setInternshipHistory(history);
    } catch (error) {
      console.error('Error fetching internship history:', error);
    }
  };

  const handleStartInternship = async () => {
    if (!currentInternship) return;
    
    try {
      setLoading(true);
      // Amaliyotni boshlash API chaqirishi
      await apiService.updateInternship(currentInternship.id, { status: 'started' });
      
      // Ma'lumotlarni yangilash
      await fetchStudentData();
      
      alert('Amaliyot muvaffaqiyatli boshladi!');
    } catch (error) {
      console.error('Error starting internship:', error);
      alert('Amaliyotni boshlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const studentReports = reports.filter(r => r.student === user?.id);
  const approvedReports = studentReports.filter(r => r.status === 'approved').length;
  const pendingReports = studentReports.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mening Dashboardim</h1>
        <p className="text-gray-600 mt-1">Amaliyot jarayoni va natijalar</p>
      </div>

      {/* Student Statistics */}
      {currentInternship && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            title="Amaliyot holati"
            value={currentInternship.status_display}
            changeType="positive"
            icon={Calendar}
            color="blue"
          />
          <StatCard
            title="Davomiyligi"
            value={`${currentInternship.duration_days || 0} kun`}
            changeType="positive"
            icon={BookOpen}
            color="green"
          />
          <StatCard
            title="Yakunlangan kunlar"
            value={`${currentInternship.completed_days || 0} kun`}
            changeType="positive"
            icon={Award}
            color="purple"
          />
          <StatCard
            title="Progress"
            value={`${currentInternship.progress_percentage || 0}%`}
            changeType="positive"
            icon={TrendingUp}
            color="yellow"
          />
        </div>
      )}

      {/* Grade Statistics */}
      {currentInternship && currentInternship.is_graded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="Baho"
            value={`${currentInternship.grade || 0}/5`}
            changeType="positive"
            icon={Award}
            color="green"
          />
          <StatCard
            title="Baholangan vaqt"
            value={currentInternship.graded_at ? new Date(currentInternship.graded_at).toLocaleDateString('uz-UZ') : 'Noma\'lum'}
            changeType="positive"
            icon={Calendar}
            color="blue"
          />
        </div>
      )}

      {/* No Active Internship Alert */}
      {!currentInternship && canStartInternship?.can_start && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="text-blue-600 mr-2" size={20} />
            <div className="flex-1">
              <h3 className="text-blue-800 font-medium">Sizda amaliyot tayinlanmagan</h3>
              <p className="text-blue-700 text-sm mt-1">
                Amaliyot tayinlanishini kuting. Admin sizga amaliyot tayinlaganidan keyin bu yerda ko'rasiz.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cannot Start Internship Alert */}
      {!canStartInternship?.can_start && currentInternship && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="text-orange-600 mr-2" size={20} />
            <div>
              <h3 className="text-orange-800 font-medium">Sizda allaqachon faol amaliyot mavjud</h3>
              <p className="text-orange-700 text-sm mt-1">
                Yangi amaliyot boshlash uchun avval joriy amaliyotni yakunlang.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Internship Info */}
      {currentInternship && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {currentInternship.status === 'completed' ? 'Yakunlangan amaliyot' : 'Joriy amaliyot'}
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentInternship.status === 'started' ? 'bg-green-100 text-green-800' :
              currentInternship.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              currentInternship.status === 'graded' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {currentInternship.status_display}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Rahbar</p>
              <p className="font-medium">{currentInternship.supervisor_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Korxona</p>
              <p className="font-medium">{currentInternship.company_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Boshlanish sanasi</p>
              <p className="font-medium">{new Date(currentInternship.start_date).toLocaleDateString('uz-UZ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tugash sanasi</p>
              <p className="font-medium">{new Date(currentInternship.end_date).toLocaleDateString('uz-UZ')}</p>
            </div>

            {/* Baho ko'rsatish */}
            {currentInternship.grade && (
              <div className="md:col-span-2">
                <div className="flex items-center justify-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Award className="text-yellow-600 mr-2" size={24} />
                      <span className="text-lg font-semibold text-gray-900">Yakuniy baho</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-4xl font-bold text-yellow-600">{currentInternship.grade}</span>
                      <span className="text-gray-500 ml-1 text-lg">/5</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {Math.round((currentInternship.grade / 5) * 100)}% ga teng
                    </div>
                    {currentInternship.grade_comment && (
                      <div className="mt-3 p-3 bg-white bg-opacity-50 rounded-lg">
                        <p className="text-sm text-gray-700">{currentInternship.grade_comment}</p>
                        {currentInternship.graded_by_name && (
                          <p className="text-xs text-gray-500 mt-1">
                            Baholagan: {currentInternship.graded_by_name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Start Internship Button */}
          {(currentInternship.status === 'start_pending') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Amaliyotni boshlash</p>
                  <p className="text-xs text-gray-500">
                    Boshlanish sanasi: {new Date(currentInternship.start_date).toLocaleDateString('uz-UZ')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const today = new Date();
                    const startDate = new Date(currentInternship.start_date);
                    if (today >= startDate) {
                      // Amaliyotni boshlash
                      handleStartInternship();
                    } else {
                      alert(`Amaliyotni boshlash uchun ${startDate.toLocaleDateString('uz-UZ')} sanasini kutish kerak`);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
        </div>
      )}

      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Amaliyot holati"
          value={currentInternship ? currentInternship.status_display : "Amaliyot yo'q"}
          change={currentInternship ? `${currentInternship.duration_days || 0} kun` : "Yangi amaliyot kerak"}
          changeType={currentInternship ? "positive" : "neutral"}
          icon={BookOpen}
          color={currentInternship ? "green" : "blue"}
        />
        <StatCard
          title="Kundalik hisobotlar"
          value={studentReports.length}
          change={`${pendingReports} ta ko'rib chiqilmoqda`}
          changeType="neutral"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Tasdiqlanganlar"
          value={approvedReports}
          change={`${Math.round((approvedReports / studentReports.length) * 100) || 0}% tasdiqlangan`}
          changeType="positive"
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="Bahosi"
          value={currentInternship?.grade || "Hali yo'q"}
          change={currentInternship?.grade ? "Yakunlangan" : "Kutilmoqda"}
          changeType={currentInternship?.grade ? "positive" : "neutral"}
          icon={Award}
          color={currentInternship?.grade ? "yellow" : "blue"}
        />
      </div>

      {/* Current Internship */}
      {currentInternship && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Joriy amaliyot</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <BookOpen className="text-blue-600" size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{currentInternship.company_name || "Korxona nomi yo'q"}</h4>
                  <p className="text-sm text-gray-600">{currentInternship.type_display}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Calendar size={16} className="mr-3 text-gray-400" />
                  <span className="text-gray-600">
                    {new Date(currentInternship.start_date).toLocaleDateString('uz-UZ')} - {new Date(currentInternship.end_date).toLocaleDateString('uz-UZ')}
                  </span>
                </div>
                
                <div className="flex items-center text-sm">
                  <Phone size={16} className="mr-3 text-gray-400" />
                  <div>
                    <span className="text-gray-600">Rahbar: {currentInternship.supervisor_name}</span>
                  </div>
                </div>
                
                <div className="flex items-center text-sm">
                  <MapPin size={16} className="mr-3 text-gray-400" />
                  <span className="text-gray-600">{currentInternship.company_name || "Manzil yo'q"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Amaliyot davomiyligi</span>
                  <span className="text-sm font-medium text-gray-900">
                    {currentInternship.duration_days} kun
                  </span>
                </div>
                <ProgressBar internship={currentInternship} size="md" />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Holat:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    currentInternship.status === 'started' ? 'bg-green-100 text-green-800' :
                    currentInternship.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    currentInternship.status === 'start_pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {currentInternship.status_display}
                  </span>
                </div>
              </div>

              {currentInternship.feedback && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm">
                    <span className="text-gray-600 font-medium">Rahbar izohi:</span>
                    <p className="text-gray-800 mt-1">{currentInternship.feedback}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tezkor amallar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Kunni boshlash tugmasi - har doim ko'rsatiladi */}
          {currentInternship && currentInternship.status === 'started' && (
            <button 
              onClick={async () => {
                if (!currentInternship) return;
                
                // Agar kunni boshlashga ruxsat bo'lmasa, tugmani ishga tushirmaslik
                if (dailyStatus && dailyStatus.status && ['day_start', 'start_confirmed', 'start_rejected', 'day_completed', 'report_submitted', 'report_confirmed', 'report_rejected'].includes(dailyStatus.status)) {
                  return;
                }
                
                try {
                  setLoading(true);
                  const response = await apiService.startDay(currentInternship.id) as any;
                  alert(`Kunni boshlash muvaffaqiyatli! Boshlanish vaqti: ${response.daily_status?.start_time || 'Noma\'lum'}`);
                  
                  // WebSocket orqali real-time yangilanish
                  window.dispatchEvent(new CustomEvent('refresh-internship-data'));
                  
                  // Ma'lumotlarni yangilash
                  await fetchStudentData();
                } catch (error) {
                  console.error('Error starting day:', error);
                  if (error instanceof Error && error.message && error.message.includes('allaqachon mavjud')) {
                    alert('Bugungi kun uchun kunni boshlash allaqachon amalga oshirilgan!');
                  } else {
                    alert('Kunni boshlashda xatolik yuz berdi');
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || (dailyStatus && dailyStatus.status && ['day_start', 'start_confirmed', 'start_rejected', 'day_completed', 'report_submitted', 'report_confirmed', 'report_rejected'].includes(dailyStatus.status))}
              className={`flex items-center p-4 border rounded-lg transition-colors ${
                !loading && (!dailyStatus || !dailyStatus.status || !['day_start', 'start_confirmed', 'start_rejected', 'day_completed', 'report_submitted', 'report_confirmed', 'report_rejected'].includes(dailyStatus.status))
                  ? 'border-gray-200 hover:bg-green-50 hover:border-green-300 cursor-pointer' 
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed'
              }`}
            >
              <Play className={`mr-3 ${
                !loading && (!dailyStatus || !dailyStatus.status || !['day_start', 'start_confirmed', 'start_rejected', 'day_completed', 'report_submitted', 'report_confirmed', 'report_rejected'].includes(dailyStatus.status))
                  ? 'text-green-600' 
                  : 'text-gray-400'
              }`} size={20} />
              <div className="text-left">
                <div className={`text-sm font-medium ${
                  !loading && (!dailyStatus || !dailyStatus.status || !['day_start', 'start_confirmed', 'start_rejected', 'day_completed', 'report_submitted', 'report_confirmed', 'report_rejected'].includes(dailyStatus.status))
                    ? 'text-gray-900' 
                    : 'text-gray-500'
                }`}>
                  {dailyStatus?.status === 'day_start' ? 'Kunni boshlash kutilmoqda' :
                   dailyStatus?.status === 'start_confirmed' ? 'Kunni boshlash tasdiqlandi' :
                   dailyStatus?.status === 'start_rejected' ? 'Kunni boshlash rad etildi' :
                   dailyStatus?.status === 'day_completed' ? 'Kun yakunlandi' :
                   dailyStatus?.status === 'report_submitted' ? 'Hisobot topshirildi' :
                   dailyStatus?.status === 'report_confirmed' ? 'Hisobot tasdiqlandi' :
                   dailyStatus?.status === 'report_rejected' ? 'Hisobot rad etildi' :
                   'Kunni boshlash'}
                </div>
                <div className={`text-xs ${
                  !loading && (!dailyStatus || !dailyStatus.status || !['day_start', 'start_confirmed', 'start_rejected', 'day_completed', 'report_submitted', 'report_confirmed', 'report_rejected'].includes(dailyStatus.status))
                    ? 'text-gray-500' 
                    : 'text-gray-400'
                }`}>
                  {dailyStatus?.status === 'day_start' ? 'Supervisor tasdiqlashini kuting' :
                   dailyStatus?.status === 'start_confirmed' ? 'Ishni davom ettiring' :
                   dailyStatus?.status === 'start_rejected' ? (dailyStatus.rejection_reason ? `Sabab: ${dailyStatus.rejection_reason}` : 'Rad etilgan') :
                   dailyStatus?.status === 'day_completed' ? 'Bugungi kun yakunlandi' :
                   dailyStatus?.status === 'report_submitted' ? 'Supervisor ko\'rib chiqmoqda' :
                   dailyStatus?.status === 'report_confirmed' ? 'Hisobot qabul qilindi' :
                   dailyStatus?.status === 'report_rejected' ? (dailyStatus.rejection_reason ? `Sabab: ${dailyStatus.rejection_reason}` : 'Rad etilgan') :
                   'Bugungi ishni boshlash'}
                </div>
              </div>
            </button>
          )}

          {/* Kunni yakunlash tugmasi - har doim ko'rsatiladi */}
          {currentInternship && currentInternship.status === 'started' && (
            <button 
              onClick={async () => {
                if (!currentInternship) return;
                
                // Agar kunni yakunlashga ruxsat bo'lmasa, tugmani ishga tushirmaslik
                if (!dailyStatus?.status || dailyStatus?.status === 'day_completed') {
                  return;
                }
                
                try {
                  setLoading(true);
                  const response = await apiService.endDay(currentInternship.id) as any;
                  alert(`Kunni yakunlash muvaffaqiyatli! Yakunlash vaqti: ${response.daily_status?.end_time || 'Noma\'lum'}`);
                  
                  // WebSocket orqali real-time yangilanish
                  window.dispatchEvent(new CustomEvent('refresh-internship-data'));
                  
                  // Ma'lumotlarni yangilash
                  await fetchStudentData();
                } catch (error) {
                  console.error('Error ending day:', error);
                  alert('Kunni yakunlashda xatolik yuz berdi');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !dailyStatus?.status || dailyStatus?.status === 'day_completed'}
              className={`flex items-center p-4 border rounded-lg transition-colors ${
                !loading && dailyStatus?.status && dailyStatus?.status !== 'day_completed'
                  ? 'border-gray-200 hover:bg-red-50 hover:border-red-300 cursor-pointer' 
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed'
              }`}
            >
              <div className={`mr-3 ${
                !loading && dailyStatus?.status && dailyStatus?.status !== 'day_completed'
                  ? 'text-red-600' 
                  : 'text-gray-400'
              }`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              </div>
              <div className="text-left">
                <div className={`text-sm font-medium ${
                  !loading && dailyStatus?.status && dailyStatus?.status !== 'day_completed'
                    ? 'text-gray-900' 
                    : 'text-gray-500'
                }`}>
                  {dailyStatus?.status === 'day_completed' ? 'Kun yakunlandi' : 
                   dailyStatus?.status === 'start_confirmed' ? 'Kunni yakunlash' :
                   dailyStatus?.status === 'report_confirmed' ? 'Kunni yakunlash' :
                   'Kunni yakunlash'}
                </div>
                <div className={`text-xs ${
                  !loading && dailyStatus?.status && dailyStatus?.status !== 'day_completed'
                    ? 'text-gray-500' 
                    : 'text-gray-400'
                }`}>
                  {dailyStatus?.status === 'day_completed' ? 'Bugungi kun tugadi' :
                   dailyStatus?.status === 'start_confirmed' ? 'Ishni tugatish' :
                   dailyStatus?.status === 'report_confirmed' ? 'Ishni tugatish' :
                   dailyStatus?.status ? 'Bugungi ishni yakunlash' : 'Avval kunni boshlang'}
                </div>
              </div>
            </button>
          )}

          {/* Amaliyotni yakunlash tugmasi - tez-tez test qilish uchun */}
          {currentInternship && currentInternship.status === 'started' && (
            <button 
              onClick={async () => {
                if (!currentInternship) return;
                
                const confirmComplete = confirm('Amaliyotni yakunlashni xohlaysizmi? Bu amalni qaytarib bo\'lmaydi.');
                if (!confirmComplete) return;
                
                try {
                  setLoading(true);
                  await apiService.updateInternship(currentInternship.id, { status: 'completed' });
                  alert('Amaliyot muvaffaqiyatli yakunlandi! Endi supervisor baholay oladi.');
                  
                  // Ma'lumotlarni yangilash
                  await fetchStudentData();
                } catch (error) {
                  console.error('Error completing internship:', error);
                  alert('Amaliyotni yakunlashda xatolik yuz berdi');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="flex items-center p-4 border border-gray-200 rounded-lg transition-colors hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
            >
              <div className="mr-3 text-blue-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  Amaliyotni yakunlash
                </div>
                <div className="text-xs text-gray-500">
                  Test uchun tez yakunlash
                </div>
              </div>
            </button>
          )}

          {/* Amaliyot yakunlangan xabari */}
          {currentInternship && currentInternship.status === 'completed' && (
            <div className="flex items-center p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="mr-3 text-blue-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-blue-900">
                  Amaliyot yakunlandi
                </div>
                <div className="text-xs text-blue-700">
                  Supervisor baholashini kuting
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Amaliyotlar tarixi */}
      {internshipHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Amaliyotlar tarixi</h3>
          <div className="space-y-4">
            {internshipHistory.map((internship) => (
              <div key={internship.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{internship.company_name}</h4>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Yakunlangan
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div>
                    <p className="font-medium">Rahbar</p>
                    <p>{internship.supervisor_name}</p>
                  </div>
                  <div>
                    <p className="font-medium">Tur</p>
                    <p>{internship.type_display}</p>
                  </div>
                  <div>
                    <p className="font-medium">Davomiyligi</p>
                    <p>{internship.duration_days} kun</p>
                  </div>
                  <div>
                    <p className="font-medium">Baho</p>
                    <p className="font-semibold text-green-600">
                      {internship.grade ? `${internship.grade}/5` : 'Baholanmagan'}
                    </p>
                  </div>
                </div>
                {internship.grade_comment && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Izoh:</span> {internship.grade_comment}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}