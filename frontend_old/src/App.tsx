import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { useWebSocket } from './hooks/useWebSocket';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { AdminManagement } from './components/admin/AdminManagement';
import { SystemSettings } from './components/admin/SystemSettings';
import { AdminSettings } from './components/admin/AdminSettings';
import { InternshipsManagement } from './components/admin/InternshipsManagement';
import { StudentDashboard } from './components/student/StudentDashboard';
import { MyInternship } from './components/student/MyInternship';
import { DailyReports } from './components/student/DailyReports';  
import { StudentDocuments } from './components/student/StudentDocuments';
import { SupervisorDashboard } from './components/supervisor/SupervisorDashboard';
import { MyStudents } from './components/supervisor/MyStudents';
import { MyInternships } from './components/supervisor/MyInternships';
import { StudentsTable } from './components/admin/StudentsTable';
import { SupervisorsTable } from './components/admin/SupervisorsTable';
import { CompaniesTable } from './components/admin/CompaniesTable';
import { HemisImport } from './components/admin/HemisImport';
import { ReportsManagement } from './components/admin/ReportsManagement';
import DocumentPreview from './components/shared/DocumentPreview';
import { DocumentApproval } from './components/supervisor/DocumentApproval';

function App() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // WebSocket connection
  useWebSocket();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const renderContent = () => {
    if (user.role === 'admin' || user.role === 'super_admin') {
      switch (activeTab) {
        case 'dashboard':
          return user.role === 'super_admin' ? <SuperAdminDashboard /> : <AdminDashboard />;
        case 'students':
          return <StudentsTable />;
        case 'supervisors':
          return <SupervisorsTable />;
        case 'companies':
          return <CompaniesTable />;
        case 'import':
          return <HemisImport />;
        case 'reports':
          return <ReportsManagement />;
        case 'internships':
          return <InternshipsManagement />;
        case 'admin-management':
          return <AdminManagement />;
        case 'settings':
          return user.role === 'super_admin' ? <SystemSettings /> : <AdminSettings />;
        default:
          return user.role === 'super_admin' ? <SuperAdminDashboard /> : <AdminDashboard />;
      }
    } else if (user.role === 'student') {
      switch (activeTab) {
        case 'dashboard':
          return <StudentDashboard />;
        case 'my-internship':
          return <MyInternship />;
        case 'daily-reports':
          return <DailyReports />;
        case 'documents':
          return <StudentDocuments />;
        default:
          return <StudentDashboard />;
      }
    } else if (user.role === 'supervisor') {
      switch (activeTab) {
        case 'dashboard':
          return <SupervisorDashboard />;
        case 'students':
          return <MyStudents />;
        case 'internships':
          return <MyInternships />;
        case 'documents':
          return <DocumentApproval />;
        case 'reports':
          return <ReportsManagement />;
        default:
          return <SupervisorDashboard />;
      }
    }
  };

  return (
    <Routes>
      <Route path="/document/:id" element={<DocumentPreview />} />
      <Route path="*" element={
        <div className="min-h-screen bg-gray-50 flex">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          
          <div className="flex-1 flex flex-col lg:ml-0">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            
            <main className="flex-1 p-6">
              {renderContent()}
            </main>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;