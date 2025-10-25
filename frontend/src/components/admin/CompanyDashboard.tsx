import { Users, Award, Clock, TrendingUp, Phone, Calendar } from 'lucide-react';
import { StatCard } from './StatCard';

export function SupervisorDashboard() {
  const assignedStudents = [
    {
      id: '1',
      name: 'Aziza Toshmatova',
      faculty: 'Informatika',
      department: 'Dasturiy injiniring',
      course: 4,
      startDate: '2024-02-01',
      status: 'active',
      grade: 87,
      phone: '+998901234567'
    },
    {
      id: '2',
      name: 'Dilnoza Karimova',
      faculty: 'Iqtisodiyot',
      department: 'Moliya',
      course: 4,
      startDate: '2024-01-15',
      status: 'completed',
      grade: 92,
      phone: '+998901234569'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rahbar Dashboard</h1>
        <p className="text-gray-600 mt-1">Amaliyotchi talabalarni nazorat qilish va baholash</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Jami talabalar"
          value="8"
          change="2 ta yangi talaba"
          changeType="positive"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Faol amaliyotchilar"
          value="6"
          change="2 ta yakunlangan"
          changeType="positive"
          icon={Clock}
          color="green"
        />
        <StatCard
          title="O'rtacha baho"
          value="89.5"
          change="+2.3 o'tgan oyga nisbatan"
          changeType="positive"
          icon={Award}
          color="yellow"
        />
        <StatCard
          title="Baholash darajasi"
          value="95%"
          change="Barcha talabalar baholandi"
          changeType="positive"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Bizning talabalar</h3>
          <p className="text-gray-600 text-sm">Joriy amaliyotchi talabalar ro'yxati</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {assignedStudents.map((student) => (
              <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {student.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{student.name}</h4>
                      <p className="text-sm text-gray-600">{student.faculty} - {student.department}</p>
                      <p className="text-xs text-gray-500">{student.course}-kurs</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-xs text-gray-500">
                          <Phone size={12} className="mr-1" />
                          {student.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm">
                        <span className="text-gray-500">Baho: </span>
                        <span className="font-medium text-gray-900">{student.grade}</span>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.status === 'started' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {student.status === 'started' ? 'Boshlangan' : 'Yakunlangan'}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Calendar size={12} className="mr-1" />
                      {student.startDate} dan boshlab
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <button className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md hover:bg-blue-100 transition-colors">
                    Kundalikni ko'rish
                  </button>
                  <button className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-md hover:bg-green-100 transition-colors">
                    Baholash
                  </button>
                  <button className="px-3 py-1 bg-gray-50 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-100 transition-colors">
                    Feedback berish
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tezkor amallar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors">
            <Users className="mr-3 text-blue-600" size={20} />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">Hisobotlarni ko'rish</div>
              <div className="text-xs text-gray-500">Kundalik hisobotlar</div>
            </div>
          </button>
          
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors">
            <Award className="mr-3 text-green-600" size={20} />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">Baholash</div>
              <div className="text-xs text-gray-500">Talaba faoliyati</div>
            </div>
          </button>
          
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors">
            <TrendingUp className="mr-3 text-purple-600" size={20} />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">Statistika</div>
              <div className="text-xs text-gray-500">Umumiy natijalar</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}