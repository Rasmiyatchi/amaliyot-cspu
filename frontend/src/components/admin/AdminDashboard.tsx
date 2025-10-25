import { Users, BookOpen, Award, TrendingUp, Calendar, Building2, AlertCircle } from 'lucide-react';
import { StatCard } from './StatCard';
import { ProgressBar } from '../shared/ProgressBar';
import { useStatistics } from '../../hooks/useData';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

export function AdminDashboard() {
  const { stats, loading } = useStatistics();
  const [capacityAlerts, setCapacityAlerts] = useState<any[]>([]);
  const [recentInternships, setRecentInternships] = useState<any[]>([]);

  useEffect(() => {
    fetchCapacityAlerts();
    fetchRecentInternships();
  }, []);

  const fetchCapacityAlerts = async () => {
    try {
      const supervisors = await apiService.getSupervisors();
      const companies = await apiService.getCompanies();
      
      const alerts: any[] = [];
      
      // Supervisor capacity alerts
      if (Array.isArray(supervisors)) {
        supervisors.forEach(supervisor => {
          if (supervisor.assigned_students >= supervisor.capacity * 0.9) {
            alerts.push({
              type: 'supervisor',
              name: supervisor.name,
              capacity: supervisor.capacity,
              assigned: supervisor.assigned_students,
              percentage: (supervisor.assigned_students / supervisor.capacity) * 100
            });
          }
        });
      }
      
      // Company capacity alerts
      if (Array.isArray(companies)) {
        companies.forEach(company => {
          if (company.assigned_students >= company.capacity * 0.9) {
            alerts.push({
              type: 'company',
              name: company.name,
              capacity: company.capacity,
              assigned: company.assigned_students,
              percentage: (company.assigned_students / company.capacity) * 100
            });
          }
        });
      }
      
      setCapacityAlerts(alerts);
    } catch (error) {
      console.error('Error fetching capacity alerts:', error);
    }
  };

  const fetchRecentInternships = async () => {
    try {
      const internships = await apiService.getInternships();
      const recent = Array.isArray(internships) 
        ? internships.slice(0, 8) 
        : (internships as any).results?.slice(0, 8) || [];
      setRecentInternships(recent);
    } catch (error) {
      console.error('Error fetching recent internships:', error);
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
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Amaliyot boshqaruvi va statistika</p>
      </div>

      {/* Capacity Alerts */}
      {capacityAlerts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center mb-3">
            <AlertCircle className="text-orange-600 mr-2" size={20} />
            <h3 className="text-orange-800 font-medium">Sig'im ogohlantirishlari</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {capacityAlerts.map((alert, index) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {alert.type === 'supervisor' ? 'Rahbar' : 'Korxona'}: {alert.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {alert.assigned}/{alert.capacity} ({alert.percentage.toFixed(1)}%)
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    alert.percentage >= 100 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {alert.percentage >= 100 ? 'To\'ldi' : 'Dek to\'ldi'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Jami talabalar"
          value={stats.totalStudents}
          changeType="positive"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Joylashtirilgan talabalar"
          value={stats.assignedStudents}
          changeType="positive"
          icon={BookOpen}
          color="green"
        />
        <StatCard
          title="Faol amaliyotlar"
          value={stats.activeInternships || 0}
          changeType="positive"
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Korxonalar"
          value={stats.activeCompanies}
          changeType="positive"
          icon={Building2}
          color="yellow"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
        <StatCard
          title="O'rtacha baho"
          value={stats.averageGrade}
          changeType="positive"
          icon={TrendingUp}
          color="yellow"
        />
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Ishga joylashuv foizi"
          value={`${stats.employmentRate}%`}
          changeType="positive"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Faol talabalar"
          value={stats.assignedStudents || 0}
          changeType="positive"
          icon={Users}
          color="blue"
        />
      </div>

      {/* Recent Internships */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">So'nggi amaliyotlar va progress</h3>
        <div className="space-y-3">
          {recentInternships.length > 0 ? (
            recentInternships.map((internship) => (
              <div key={internship.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Calendar className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{internship.student_name}</p>
                      <p className="text-sm text-gray-600">
                        {internship.supervisor_name} • {internship.type_display}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      internship.status === 'started' 
                        ? 'bg-green-100 text-green-800' 
                        : internship.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {internship.status_display}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(internship.created_at).toLocaleDateString('uz-UZ')}
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
            ))
          ) : (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Hali amaliyotlar mavjud emas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}