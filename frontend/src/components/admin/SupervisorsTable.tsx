import { useState } from 'react';
import { Search, Plus, UserCheck, Star, Phone, Award, Edit, Trash2, Eye, EyeOff, Building2 } from 'lucide-react';
import { useSupervisors } from '../../hooks/useData';
import { Supervisor } from '../../types';
import { SupervisorForm } from './SupervisorForm';

export function SupervisorsTable() {
  const { supervisors, loading, addSupervisor, updateSupervisor, deleteSupervisor } = useSupervisors();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | undefined>();
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});

  const filteredSupervisors = supervisors.filter(supervisor =>
    (supervisor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supervisor.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supervisor.specialization || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveSupervisor = (supervisorData: Omit<Supervisor, 'id' | 'assignedStudents' | 'rating'>) => {
    if (editingSupervisor) {
      updateSupervisor(editingSupervisor.id, supervisorData);
    } else {
      // Add default values for assignedStudents and rating
      const fullSupervisorData = {
        ...supervisorData,
        assignedStudents: 0,
        rating: 0
      };
      addSupervisor(fullSupervisorData);
    }
    setShowForm(false);
    setEditingSupervisor(undefined);
  };

  const handleEditSupervisor = (supervisor: Supervisor) => {
    setEditingSupervisor(supervisor);
    setShowForm(true);
  };

  const handleDeleteSupervisor = (id: string) => {
    if (confirm('Bu rahbarni o\'chirishni xohlaysizmi?')) {
      deleteSupervisor(id);
    }
  };

  const togglePasswordVisibility = (supervisorId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [supervisorId]: !prev[supervisorId]
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={`loading-${i}`} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Amaliyot rahbarlari</h1>
          <p className="text-gray-600 mt-1">Talabalar amaliyotini nazorat qiluvchi o'qituvchilar</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Yangi rahbar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rahbar nomi, kafedra yoki mutaxassislik bo'yicha qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Supervisors Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSupervisors.map((supervisor, index) => (
              <div key={supervisor.id || `supervisor-${index}`} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <UserCheck className="text-blue-600" size={24} />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{supervisor.name}</h3>
                      <p className="text-sm text-gray-600">{supervisor.position}</p>
                      <div className="flex items-center mt-1">
                        <Star className="text-yellow-400 fill-current" size={16} />
                        <span className="text-sm text-gray-600 ml-1">{supervisor.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditSupervisor(supervisor)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteSupervisor(supervisor.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    supervisor.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {supervisor.status === 'active' ? 'Faol' : 'Nofaol'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Award size={16} className="mr-2 text-gray-400" />
                    <span className="truncate">{supervisor.faculty}</span>
                  </div>
                  <div className="flex items-center">
                    <UserCheck size={16} className="mr-2 text-gray-400" />
                    <span className="truncate">{supervisor.department}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone size={16} className="mr-2 text-gray-400" />
                    <span>{supervisor.phone}</span>
                  </div>
                  {supervisor.company_name && supervisor.company_name !== 'null' && (
                    <div className="flex items-center">
                      <Building2 size={16} className="mr-2 text-gray-400" />
                      <span className="truncate">{supervisor.company_name}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500">Mutaxassislik:</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{supervisor.specialization}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Talabalar:</span>
                    <span className="font-medium text-gray-900">
                      {supervisor.assignedStudents}/{supervisor.capacity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-500">Tajriba:</span>
                    <span className="font-medium text-gray-900">{supervisor.experience} yil</span>
                  </div>
                  
                  {/* Login va Parol ma'lumotlari */}
                  {supervisor.autoGeneratedPassword && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-500">Login:</span>
                        <span className="font-mono text-xs text-gray-900">{supervisor.supervisorId}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Parol:</span>
                        <div className="flex items-center">
                          <span className="font-mono text-xs text-gray-900 mr-2">
                            {showPasswords[supervisor.id] ? supervisor.autoGeneratedPassword : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(supervisor.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title={showPasswords[supervisor.id] ? 'Yashirish' : 'Ko\'rsatish'}
                          >
                            {showPasswords[supervisor.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>
                      {supervisor.isPasswordChanged && (
                        <div className="text-xs text-green-600 mt-1">
                          ✓ Parol o'zgartirilgan
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(supervisor.assignedStudents / supervisor.capacity) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Bandlik</span>
                    <span>{Math.round((supervisor.assignedStudents / supervisor.capacity) * 100)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredSupervisors.length === 0 && (
            <div className="text-center py-12">
              <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Rahbarlar topilmadi</h3>
              <p className="mt-1 text-sm text-gray-500">
                Qidiruv shartlaringizni o'zgartiring yoki yangi rahbar qo'shing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Supervisor Form Modal */}
      {showForm && (
        <SupervisorForm
          supervisor={editingSupervisor}
          onSave={handleSaveSupervisor}
          onClose={() => {
            setShowForm(false);
            setEditingSupervisor(undefined);
          }}
        />
      )}
    </div>
  );
}