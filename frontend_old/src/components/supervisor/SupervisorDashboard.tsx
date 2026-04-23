import { useState, useEffect } from 'react';
import { Users, BookOpen, Calendar, AlertCircle, TrendingUp, Award } from 'lucide-react';
import { ProgressBar } from '../shared/ProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import { useStatistics } from '../../hooks/useData';
import { apiService } from '../../services/api';
import { Student, Internship } from '../../types';
import { StatCard } from '../admin/StatCard';

export function SupervisorDashboard() {
  const { user } = useAuth();
  const { stats } = useStatistics();
  const [students, setStudents] = useState<Student[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error('Error fetching supervisor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (dailyStatusId: string, newStatus: string, rejectionReason?: string) => {
    try {
      await apiService.updateDailyStatusById(dailyStatusId, newStatus, rejectionReason);
      // Ma'lumotlarni qayta yuklash
      await fetchData();
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
        <h1 className="text-2xl font-bold text-gray-900">Supervisor Dashboard</h1>
        <p className="text-gray-600 mt-1">Talabalar va amaliyotlar boshqaruvi</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Jami talabalar"
          value={students.length}
          changeType="positive"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Faol amaliyotlar"
          value={internships.filter(i => i.status === 'started').length}
          changeType="positive"
          icon={Calendar}
          color="green"
        />
        <StatCard
          title="Yakunlangan amaliyotlar"
          value={internships.filter(i => i.status === 'completed').length}
          changeType="positive"
          icon={Award}
          color="purple"
        />
        <StatCard
          title="Baholangan amaliyotlar"
          value={internships.filter(i => i.status === 'graded').length}
          changeType="positive"
          icon={Award}
          color="yellow"
        />
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="O'rtacha baho"
          value={stats.averageGrade || 0}
          changeType="positive"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Ishga joylashuv foizi"
          value={`${stats.employmentRate || 0}%`}
          changeType="positive"
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Recent Students */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">So'nggi talabalar</h2>
        </div>
        <div className="p-6">
          {students.length > 0 ? (
            <div className="space-y-4">
              {students.slice(0, 5).map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Users className="text-gray-600" size={20} />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">{student.full_name || student.name}</p>
                      <p className="text-sm text-gray-600">{student.student_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{student.course}-kurs</p>
                    <p className="text-sm text-gray-500">{student.group}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="text-gray-400 mx-auto mb-4" size={48} />
              <p className="text-gray-600">Hali talaba biriktirilmagan</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Internships */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">So'nggi amaliyotlar</h2>
        </div>
        <div className="p-6">
          {internships.length > 0 ? (
            <div className="space-y-4">
              {internships.slice(0, 5).map((internship) => (
                <div key={internship.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <BookOpen className="text-gray-600" size={20} />
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">{internship.student_name}</p>
                        <p className="text-sm text-gray-600">{internship.company_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        internship.status === 'started' ? 'bg-green-100 text-green-800' :
                        internship.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        internship.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                        internship.status === 'waiting' ? 'bg-gray-100 text-gray-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {internship.status_display}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
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
              <AlertCircle className="text-gray-400 mx-auto mb-4" size={48} />
              <p className="text-gray-600">Hali amaliyot yo'q</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
