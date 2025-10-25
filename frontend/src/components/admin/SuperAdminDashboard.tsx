import { Users, UserCheck, BookOpen, Award, TrendingUp, Shield } from 'lucide-react';
import { StatCard } from './StatCard';
import { ProgressBar } from '../shared/ProgressBar';
import { useStatistics } from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

export function SuperAdminDashboard() {
  const { stats, loading } = useStatistics();
  const { user } = useAuth();
  const [recentInternships, setRecentInternships] = useState<any[]>([]);
  const [internshipsLoading, setInternshipsLoading] = useState(true);

  useEffect(() => {
    fetchRecentInternships();
  }, []);

  const fetchRecentInternships = async () => {
    try {
      setInternshipsLoading(true);
      const internships = await apiService.getInternships();
      const recent = Array.isArray(internships) 
        ? internships.slice(0, 10) 
        : (internships as any).results?.slice(0, 10) || [];
      setRecentInternships(recent);
    } catch (error) {
      console.error('Error fetching recent internships:', error);
    } finally {
      setInternshipsLoading(false);
    }
  };

  const handleStatusUpdate = async (dailyStatusId: string, newStatus: string, rejectionReason?: string) => {
    try {
      await apiService.updateDailyStatusById(dailyStatusId, newStatus, rejectionReason);
      await fetchRecentInternships();
    } catch (error) {
      console.error('Status yangilashda xatolik:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
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
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Tizim boshqaruvi va to'liq statistika</p>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Xush kelibsiz, {user?.name}!</h2>
            <p className="text-purple-100 mt-1">Siz Super Admin sifatida tizimni to'liq boshqarishingiz mumkin</p>
          </div>
          <Shield className="text-purple-200" size={48} />
        </div>
      </div>

      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Jami foydalanuvchilar"
          value={stats.totalUsers || 0}
          // change="+5 yangi foydalanuvchi"
          changeType="positive"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Jami talabalar"
          value={stats.totalStudents}
          // change="+12 yangi talaba"
          changeType="positive"
          icon={BookOpen}
          color="green"
        />
        <StatCard
          title="Amaliyot rahbarlari"
          value={stats.totalSupervisors || 0}
          // change="+3 yangi rahbar"
          changeType="positive"
          icon={UserCheck}
          color="purple"
        />
        <StatCard
          title="Korxonalar"
          value={stats.totalCompanies || 0}
          // change="+2 yangi korxona"
          changeType="positive"
          icon={Award}
          color="yellow"
        />
      </div>

      {/* Secondary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Faol amaliyotlar"
          value={stats.activeInternships || 0}
          changeType="positive"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Yakunlangan amaliyotlar"
          value={stats.completedInternships}
          changeType="positive"
          icon={Award}
          color="blue"
        />
        <StatCard
          title="Baholangan amaliyotlar"
          value={stats.gradedInternships || 0}
          changeType="positive"
          icon={Award}
          color="purple"
        />
        <StatCard
          title="Tasdiqlangan amaliyotlar"
          value={stats.confirmedInternships || 0}
          changeType="positive"
          icon={Award}
          color="green"
        />
      </div>

      {/* Performance Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Ishga joylashuv foizi"
          value={`${stats.employmentRate}%`}
          changeType="positive"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="O'rtacha baho"
          value={stats.averageGrade}
          changeType="positive"
          icon={Award}
          color="purple"
        />
        <StatCard
          title="Jami foydalanuvchilar"
          value={stats.totalUsers || 0}
          changeType="positive"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Jami rahbarlar"
          value={stats.totalSupervisors || 0}
          changeType="positive"
          icon={UserCheck}
          color="yellow"
        />
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tizim holati</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Ma'lumotlar bazasi</p>
              <p className="text-xs text-gray-600">Faol</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">API server</p>
              <p className="text-xs text-gray-600">Faol</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Fayl serveri</p>
              <p className="text-xs text-gray-600">Faol</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Internships with Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Faol amaliyotlar va progress</h3>
        {internshipsLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : recentInternships.length > 0 ? (
          <div className="space-y-4">
            {recentInternships.map((internship) => (
              <div key={internship.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <BookOpen className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{internship.student_name}</p>
                      <p className="text-sm text-gray-600">
                        {internship.supervisor_name} • {internship.company_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      internship.status === 'started' 
                        ? 'bg-green-100 text-green-800' 
                        : internship.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : internship.status === 'assigned'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {internship.status_display}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(internship.start_date).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <ProgressBar 
                    internship={internship} 
                    size="sm" 
                    canManage={true}
                    onStatusUpdate={handleStatusUpdate}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-500 mt-2">Hali faol amaliyotlar mavjud emas</p>
          </div>
        )}
      </div>
    </div>
  );
}
