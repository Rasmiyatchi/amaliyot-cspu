import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Search, Filter, Calendar, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import { InternshipsManagement } from './InternshipsManagement';

interface Admin {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  date_joined: string;
}

export function AdminManagement() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [activeTab, setActiveTab] = useState<'admins' | 'internships'>('admins');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      
      // Avval oddiy getUsers() bilan sinab ko'ramiz
      const response = await apiService.getUsers() as any;
      
      let allUsers: any[] = [];
      
      if (response.results) {
        // Paginated response
        allUsers = [...response.results];
        let nextUrl = response.next;
        
        // Barcha sahifalarni yuklash
        while (nextUrl) {
          try {
            // To'g'ridan-to'g'ri fetch ishlatamiz
            const csrfToken = apiService.getCSRFToken();
            const response = await fetch(nextUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRFToken': csrfToken }),
              },
              credentials: 'include',
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            
            const nextResponse = await response.json();
            allUsers = [...allUsers, ...(nextResponse.results || [])];
            nextUrl = nextResponse.next;
          } catch (pageError) {
            console.error('Error fetching page:', pageError);
            break;
          }
        }
      } else {
        // Non-paginated response
        allUsers = Array.isArray(response) ? response : [response];
      }
      
      // Faqat admin va super_admin rollarini ko'rsatish
      const adminUsers = allUsers.filter((user: any) => 
        user.role === 'admin' || user.role === 'super_admin'
      );
      setAdmins(adminUsers);
    } catch (error) {
      console.error('Error fetching admins:', error);
      // Fallback: bo'sh array
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (adminData: any) => {
    try {
      await apiService.createUser(adminData);
      fetchAdmins();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating admin:', error);
    }
  };

  const handleUpdateAdmin = async (id: string, adminData: any) => {
    try {
      await apiService.updateUser(id, adminData);
      fetchAdmins();
      setEditingAdmin(null);
    } catch (error) {
      console.error('Error updating admin:', error);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (window.confirm('Bu adminni o\'chirishni xohlaysizmi?')) {
      try {
        await apiService.deleteUser(id);
        fetchAdmins();
      } catch (error) {
        console.error('Error deleting admin:', error);
        alert('Adminni o\'chirishda xatolik yuz berdi');
      }
    }
  };

  // const filteredAdmins = admins.filter(admin =>
  //   admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   admin.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   admin.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  // );

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin boshqaruvi</h1>
          <p className="text-gray-600 mt-1">Tizim administratorlarini va amaliyotlarni boshqarish</p>
        </div>
        {user?.role === 'super_admin' && activeTab === 'admins' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Yangi admin
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('admins')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'admins'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Users size={20} className="mr-2" />
                Adminlar
              </div>
            </button>
            <button
              onClick={() => setActiveTab('internships')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'internships'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Calendar size={20} className="mr-2" />
                Amaliyotlar
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'admins' ? (
            <AdminsTab 
              admins={admins}
              loading={loading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              showCreateForm={showCreateForm}
              setShowCreateForm={setShowCreateForm}
              editingAdmin={editingAdmin}
              setEditingAdmin={setEditingAdmin}
              handleCreateAdmin={handleCreateAdmin}
              handleUpdateAdmin={handleUpdateAdmin}
              handleDeleteAdmin={handleDeleteAdmin}
              user={user}
            />
          ) : (
            <InternshipsManagement />
          )}
        </div>
      </div>
    </div>
  );
}

// Admins Tab Component
interface AdminsTabProps {
  admins: Admin[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showCreateForm: boolean;
  setShowCreateForm: (show: boolean) => void;
  editingAdmin: Admin | null;
  setEditingAdmin: (admin: Admin | null) => void;
  handleCreateAdmin: (data: any) => void;
  handleUpdateAdmin: (id: string, data: any) => void;
  handleDeleteAdmin: (id: string) => void;
  user: any;
}

function AdminsTab({
  admins,
  loading,
  searchTerm,
  setSearchTerm,
  showCreateForm,
  setShowCreateForm,
  editingAdmin,
  setEditingAdmin,
  handleCreateAdmin,
  handleUpdateAdmin,
  handleDeleteAdmin,
  user
}: AdminsTabProps) {
  // const filteredAdmins = admins.filter(admin =>
  //   admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   admin.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   admin.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Admin qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter size={20} className="mr-2" />
          Filtr
        </button>
      </div>

      {/* Admins Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Holat
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qo'shilgan sana
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amallar
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <Shield className="text-gray-600" size={20} />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {admin.first_name} {admin.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{admin.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    admin.role === 'super_admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    admin.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {admin.is_active ? 'Faol' : 'Nofaol'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(admin.date_joined).toLocaleDateString('uz-UZ')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingAdmin(admin)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit size={16} />
                    </button>
                    {user?.role === 'super_admin' && admin.role !== 'super_admin' && (
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingAdmin) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingAdmin ? 'Adminni tahrirlash' : 'Yangi admin yaratish'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const data = Object.fromEntries(formData.entries());
              
              if (editingAdmin) {
                handleUpdateAdmin(editingAdmin.id, data);
              } else {
                handleCreateAdmin(data);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ism
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    defaultValue={editingAdmin?.first_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Familiya
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    defaultValue={editingAdmin?.last_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    defaultValue={editingAdmin?.username || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingAdmin?.email || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={editingAdmin?.phone || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {!editingAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parol
                    </label>
                    <input
                      type="password"
                      name="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    defaultValue={editingAdmin?.role || 'admin'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="admin">Admin</option>
                    {user?.role === 'super_admin' && (
                      <option value="super_admin">Super Admin</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingAdmin(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingAdmin ? 'Yangilash' : 'Yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
