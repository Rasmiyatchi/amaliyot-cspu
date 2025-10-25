import { Internship, DailyStatus } from '../../types';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

interface ProgressBarProps {
  internship: Internship;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onStatusUpdate?: (dailyStatusId: string, newStatus: string, rejectionReason?: string) => void;
  canManage?: boolean; // Supervisor yoki admin uchun
}

export function ProgressBar({ 
  internship, 
  showDetails = true, 
  size = 'md', 
  onStatusUpdate,
  canManage = false 
}: ProgressBarProps) {
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedDailyStatus, setSelectedDailyStatus] = useState<DailyStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentInternship, setCurrentInternship] = useState(internship);

  // Amaliyot ma'lumotlarini yangilash
  const fetchInternshipData = async () => {
    try {
      const updatedInternship = await apiService.getInternship(internship.id);
      setCurrentInternship(updatedInternship as Internship);
    } catch (error) {
      console.error('Error fetching updated internship:', error);
    }
  };

  // Polling orqali yangilanishlarni kuzatish
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInternshipData();
    }, 3000); // 3 soniyada bir marta yangilash

    return () => clearInterval(interval);
  }, [internship.id]);

  // Progress hisoblash - kunlik statuslar asosida
  const calculateProgress = () => {
    if (!currentInternship.daily_statuses || currentInternship.daily_statuses.length === 0) {
      return currentInternship.progress_percentage || 0;
    }
    
    const completedDays = currentInternship.daily_statuses.filter(
      status => status.status === 'day_completed'
    ).length;
    
    const totalDays = currentInternship.duration_days || currentInternship.daily_statuses.length;
    return totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
  };

  // Kunlik statuslar asosida progress bar segmentlarini yaratish
  const getProgressSegments = () => {
    if (!currentInternship.daily_statuses || currentInternship.daily_statuses.length === 0) {
      return [];
    }

    const totalDays = currentInternship.duration_days || currentInternship.daily_statuses.length;
    const segmentWidth = 100 / totalDays;
    
    return currentInternship.daily_statuses
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((dailyStatus, index) => {
        let color = 'bg-gray-300'; // Default - kelmagan kunlar
        
        // Kelgan kunlar uchun ranglar
        if (dailyStatus.status === 'day_completed') {
          color = 'bg-green-500'; // Tugagan kunlar - yashil
        } else if (dailyStatus.status === 'report_confirmed') {
          color = 'bg-blue-500'; // Tasdiqlangan kunlar - ko'k
        } else if (dailyStatus.status === 'start_confirmed' || dailyStatus.status === 'report_submitted') {
          color = 'bg-yellow-500'; // Jarayonda - sariq
        } else if (dailyStatus.status === 'start_rejected' || dailyStatus.status === 'report_rejected') {
          color = 'bg-red-500'; // Rad etilgan kunlar - qizil
        } else if (dailyStatus.status === 'day_start') {
          color = 'bg-orange-500'; // Kutayotgan kunlar - to'q sariq
        }
        
        return {
          width: segmentWidth,
          color: color,
          status: dailyStatus.status,
          date: dailyStatus.date,
          index: index
        };
      });
  };

  const progress = calculateProgress();
  const completedDays = currentInternship.daily_statuses?.filter(
    status => status.status === 'day_completed'
  ).length || currentInternship.completed_days || 0;
  const remainingDays = currentInternship.remaining_days || 0;
  const totalDays = currentInternship.duration_days || 0;
  const progressSegments = getProgressSegments();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'h-2',
          text: 'text-xs',
          details: 'text-xs'
        };
      case 'lg':
        return {
          container: 'h-4',
          text: 'text-lg',
          details: 'text-base'
        };
      default:
        return {
          container: 'h-3',
          text: 'text-sm',
          details: 'text-sm'
        };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'day_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'report_confirmed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'report_submitted':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'start_confirmed':
        return <CheckCircle className="w-4 h-4 text-orange-600" />;
      case 'start_rejected':
      case 'report_rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'resubmitted':
        return <RefreshCw className="w-4 h-4 text-purple-600" />;
      case 'day_start':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'day_completed':
        return 'bg-green-500';
      case 'report_confirmed':
        return 'bg-blue-500';
      case 'report_submitted':
        return 'bg-yellow-500';
      case 'start_confirmed':
        return 'bg-orange-500';
      case 'start_rejected':
      case 'report_rejected':
        return 'bg-red-500';
      case 'resubmitted':
        return 'bg-purple-500';
      case 'day_start':
        return 'bg-gray-300';
      default:
        return 'bg-gray-300';
    }
  };

  const handleResubmit = (dailyStatus: DailyStatus) => {
    if (onStatusUpdate) {
      onStatusUpdate(dailyStatus.id, 'resubmitted');
    }
  };

  const handleApproveDayStart = async (dailyStatus: DailyStatus) => {
    try {
      setLoading(true);
      await apiService.approveDayStart(internship.id, dailyStatus.id);
      if (onStatusUpdate) {
        onStatusUpdate(dailyStatus.id, 'start_confirmed');
      }
    } catch (error) {
      console.error('Error approving day start:', error);
      alert('Kun boshlashni tasdiqlashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDayStart = (dailyStatus: DailyStatus) => {
    setSelectedDailyStatus(dailyStatus);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const handleReject = (dailyStatus: DailyStatus) => {
    setSelectedDailyStatus(dailyStatus);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const handleConfirmRejection = async () => {
    if (selectedDailyStatus && rejectionReason.trim()) {
      try {
        setLoading(true);
        
        if (selectedDailyStatus.status === 'day_start') {
          // Kun boshlashni rad etish
          await apiService.rejectDayStart(internship.id, selectedDailyStatus.id, rejectionReason);
          if (onStatusUpdate) {
            onStatusUpdate(selectedDailyStatus.id, 'start_rejected', rejectionReason);
          }
        } else {
          // Hisobotni rad etish
          if (onStatusUpdate) {
            const newStatus = selectedDailyStatus.status === 'start_confirmed' ? 'start_rejected' : 'report_rejected';
            onStatusUpdate(selectedDailyStatus.id, newStatus, rejectionReason);
          }
        }
        
        setShowRejectionModal(false);
        setSelectedDailyStatus(null);
        setRejectionReason('');
      } catch (error) {
        console.error('Error rejecting:', error);
        alert('Rad etishda xatolik');
      } finally {
        setLoading(false);
      }
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className="w-full">
      {/* Progress Bar - Segmentli ko'rinish */}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses.container} overflow-hidden shadow-inner`}>
        {progressSegments.length > 0 ? (
          <div className="h-full flex">
            {progressSegments.map((segment, index) => (
              <div
                key={index}
                className={`h-full ${segment.color} transition-all duration-300 ease-out relative group`}
                style={{ width: `${segment.width}%` }}
                title={`${new Date(segment.date).toLocaleDateString('uz-UZ')}: ${segment.status}`}
              >
                {/* Shine effect faqat tugagan kunlar uchun */}
                {segment.status === 'day_completed' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                )}
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200"></div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`h-full bg-gradient-to-r from-gray-400 to-gray-500 transition-all duration-700 ease-out relative`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Progress Details */}
      {showDetails && (
        <div className="mt-3 flex justify-between items-center">
          <div className={`text-gray-600 ${sizeClasses.details} flex items-center`}>
            <div className="w-2 h-2 rounded-full mr-2 bg-green-500"></div>
            <span className="font-semibold">{progress.toFixed(1)}%</span>
            <span className="ml-1">tugagan</span>
          </div>
          <div className={`text-gray-500 ${sizeClasses.details} font-medium`}>
            {completedDays}/{totalDays} kun
          </div>
          {remainingDays > 0 && (
            <div className={`text-gray-400 ${sizeClasses.details}`}>
              {remainingDays} kun qoldi
            </div>
          )}
          
          {/* Kunlar sonini ko'rsatish */}
          {currentInternship.attendance_stats && (
            <div className={`text-gray-500 ${sizeClasses.details} text-right`}>
              <div className="text-xs">
                <span className="text-green-600 font-medium">{currentInternship.attendance_stats.attended_days}</span> kelgan
              </div>
              <div className="text-xs">
                <span className="text-red-600 font-medium">{currentInternship.attendance_stats.absent_days}</span> kelmagan
              </div>
              <div className="text-xs">
                <span className="text-blue-600 font-medium">{currentInternship.attendance_stats.attendance_percentage}%</span> qatnashish
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Status Indicators */}
      {currentInternship.daily_statuses && currentInternship.daily_statuses.length > 0 && (
        <div className="mt-3">
          {/* Pending Approvals - Faqat kun boshlash kutayotgan kunlar uchun */}
          {canManage && currentInternship.daily_statuses.some(status => status.status === 'day_start') && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Clock className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-yellow-800">Kun boshlash uchun kutayotgan tasdiqlash</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentInternship.daily_statuses
                  .filter(status => status.status === 'day_start')
                  .map((dailyStatus) => (
                    <div key={dailyStatus.id} className="flex items-center bg-white rounded-lg p-2 border border-yellow-200">
                      <span className="text-xs text-gray-600 mr-2">
                        {new Date(dailyStatus.date).toLocaleDateString('uz-UZ')}
                      </span>
                      <button
                        onClick={() => handleApproveDayStart(dailyStatus)}
                        disabled={loading}
                        className="p-1 text-green-600 hover:bg-green-50 rounded mr-1"
                        title="Tasdiqlash"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRejectDayStart(dailyStatus)}
                        disabled={loading}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Rad etish"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-1">
            {currentInternship.daily_statuses
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((dailyStatus) => (
              <div
                key={dailyStatus.id}
                className={`relative group ${getStatusColor(dailyStatus.status)} w-3 h-3 rounded-full cursor-pointer`}
                title={`${new Date(dailyStatus.date).toLocaleDateString('uz-UZ')}: ${dailyStatus.status_display}`}
              >
                {/* Status Icon */}
                <div className="absolute -top-6 -left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {getStatusIcon(dailyStatus.status)}
                </div>
                
                {/* Management Actions - Faqat kun boshlash kutayotgan kunlar uchun emas */}
                {canManage && dailyStatus.status !== 'day_start' && (
                  <div className="absolute -top-8 -left-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg shadow-lg border p-1 flex gap-1">
                    {/* Hisobot tasdiqlash/rad etish */}
                    {(dailyStatus.status === 'start_confirmed' || dailyStatus.status === 'report_submitted') && (
                      <button
                        onClick={() => handleReject(dailyStatus)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Rad etish"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    )}
                    
                    {/* Qayta topshirish */}
                    {(dailyStatus.status === 'start_rejected' || dailyStatus.status === 'report_rejected') && (
                      <button
                        onClick={() => handleResubmit(dailyStatus)}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                        title="Qayta topshirish"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Legend - Yangilangan ranglar */}
          <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Tugagan kunlar</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Tasdiqlangan kunlar</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Jarayonda</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Kutayotgan kunlar</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Rad etilgan kunlar</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <span>Kelmagan kunlar</span>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedDailyStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedDailyStatus.status === 'day_start' ? 'Kun boshlashni rad etish' : 'Rad etish sababi'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {new Date(selectedDailyStatus.date).toLocaleDateString('uz-UZ')} kun uchun rad etish sababini kiriting:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Rad etish sababini kiriting..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowRejectionModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleConfirmRejection}
                disabled={!rejectionReason.trim() || loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Kutilmoqda...' : 'Rad etish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}