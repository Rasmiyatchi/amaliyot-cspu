import { 
  Users, 
  UserCheck, 
  BookOpen, 
  BarChart3, 
  Settings, 
  LogOut,
  GraduationCap,
  FileText,
  Calendar,
  Upload,
  Building2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ isOpen, onClose, activeTab, setActiveTab }: SidebarProps) {
  const { user, logout } = useAuth();

  const getMenuItems = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'students', label: 'Talabalar', icon: Users },
          { id: 'supervisors', label: 'Amaliyot rahbarlari', icon: UserCheck },
          { id: 'companies', label: 'Korxonalar', icon: Building2 },
          { id: 'internships', label: 'Amaliyotlar', icon: BookOpen },
          { id: 'import', label: 'HEMIS Import', icon: Upload },
          { id: 'settings', label: 'Sozlamalar', icon: Settings },
        ];
      case 'super_admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'admin-management', label: 'Admin boshqaruvi', icon: Settings },
          { id: 'students', label: 'Talabalar', icon: Users },
          { id: 'supervisors', label: 'Amaliyot rahbarlari', icon: UserCheck },
          { id: 'companies', label: 'Korxonalar', icon: Building2 },
          { id: 'internships', label: 'Amaliyotlar', icon: BookOpen },
          { id: 'import', label: 'HEMIS Import', icon: Upload },
          { id: 'settings', label: 'Tizim sozlamalari', icon: Settings },
        ];
      case 'student':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: GraduationCap },
          { id: 'my-internship', label: 'Mening amaliyotim', icon: BookOpen },
          { id: 'daily-reports', label: 'Kundalik hisobotlar', icon: Calendar },
          { id: 'documents', label: 'Hujjatlar', icon: FileText },
        ];
      case 'supervisor':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: UserCheck },
          { id: 'students', label: 'Bizning talabalar', icon: Users },
          { id: 'internships', label: 'Amaliyotlar', icon: BookOpen },
          { id: 'documents', label: 'Hujjatlar', icon: FileText },
        ];
      default:
        return [];
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto lg:block
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              Amaliyot Platformasi
            </h2>
            <p className="text-sm text-gray-600 mt-1 capitalize">
              {user?.role === 'super_admin' ? 'Super Admin paneli' :
               user?.role === 'admin' ? 'Boshqaruv paneli' : 
               user?.role === 'student' ? 'Talaba paneli' : 'Rahbar paneli'}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6">
            <ul className="space-y-2 px-4">
              {getMenuItems().map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      onClose();
                    }}
                    className={`
                      w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors duration-200
                      ${activeTab === item.id 
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon size={20} className="mr-3" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <img
                src={user?.avatar || '/admin_icon.png'}
                alt={user?.name}
                className="w-10 h-10 rounded-full mr-3"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role === 'super_admin' ? 'Super Admin' : 
                   user?.role === 'admin' ? 'Admin' : 
                   user?.role === 'supervisor' ? 'Amaliyot Rahbari' : 
                   user?.role === 'student' ? 'Talaba' : user?.phone}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <LogOut size={18} className="mr-3" />
              <span className="font-medium">Chiqish</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}