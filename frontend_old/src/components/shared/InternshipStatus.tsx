import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Building2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Internship } from '../../types';
import { apiService } from '../../services/api';

interface InternshipStatusProps {
  internshipId: string;
}

export function InternshipStatus({ internshipId }: InternshipStatusProps) {
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInternship();
  }, [internshipId]);

  const fetchInternship = async () => {
    try {
      const data = await apiService.getInternship(internshipId);
      setInternship(data);
    } catch (error) {
      console.error('Amaliyot ma\'lumotlarini olishda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Faol';
      case 'completed':
        return 'Yakunlangan';
      case 'cancelled':
        return 'Bekor qilingan';
      default:
        return 'Noma\'lum';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const calculateProgress = () => {
    if (!internship || !internship.start_date || !internship.end_date) return 0;
    
    const start = new Date(internship.start_date);
    const end = new Date(internship.end_date);
    const today = new Date();
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const passedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (passedDays < 0) return 0;
    if (passedDays > totalDays) return 100;
    
    return Math.round((passedDays / totalDays) * 100);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Amaliyot ma'lumotlari topilmadi</p>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Amaliyot holati</h3>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(internship.status)}`}>
          {getStatusIcon(internship.status)}
          <span className="ml-2">{getStatusText(internship.status)}</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Jarayon</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Internship details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span>Boshlanish: {new Date(internship.start_date).toLocaleDateString('uz-UZ')}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span>Tugash: {new Date(internship.end_date).toLocaleDateString('uz-UZ')}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <User className="w-4 h-4 mr-2" />
            <span>Rahbar: {internship.supervisor?.first_name} {internship.supervisor?.last_name}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="w-4 h-4 mr-2" />
            <span>Korxona: {internship.company?.name || 'Korxona yo\'q'}</span>
          </div>
        </div>

        {/* Duration info */}
        {internship.duration_days && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Amaliyot davomiyligi</span>
              <span className="text-sm text-gray-600">{internship.duration_days} kun</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
