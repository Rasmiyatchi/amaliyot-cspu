import { useState } from 'react';
import { FileText, Calendar, CheckCircle, XCircle, Clock, Eye, MessageSquare } from 'lucide-react';
import { useDailyReports, useStudents } from '../../hooks/useData';
import { DailyReport } from '../../types';

export function ReportsManagement() {
  const { reports, loading, approveReport, rejectReport } = useDailyReports();
  const { students } = useStudents();
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [feedback, setFeedback] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredReports = reports.filter(report => {
    if (filterStatus === 'all') return true;
    return report.status === filterStatus;
  });

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Noma\'lum talaba';
  };

  const getStatusBadge = (status: DailyReport['status']) => {
    const statusConfig = {
      pending: { label: 'Kutish', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: 'Tasdiqlangan', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Rad etilgan', color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        <Icon size={12} className="mr-1" />
        {config.label}
      </span>
    );
  };

  const handleApprove = (reportId: string) => {
    approveReport(reportId, feedback);
    setSelectedReport(null);
    setFeedback('');
  };

  const handleReject = (reportId: string) => {
    if (!feedback.trim()) {
      alert('Rad etish uchun izoh kiriting');
      return;
    }
    rejectReport(reportId, feedback);
    setSelectedReport(null);
    setFeedback('');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Hisobotlar boshqaruvi</h1>
          <p className="text-gray-600 mt-1">Talabalarning kundalik hisobotlarini ko'rish va tasdiqlash</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Filter */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Holat bo'yicha filter:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Barchasi</option>
              <option value="pending">Kutish</option>
              <option value="approved">Tasdiqlangan</option>
              <option value="rejected">Rad etilgan</option>
            </select>
          </div>
        </div>

        {/* Reports List */}
        <div className="divide-y divide-gray-200">
          {filteredReports.map((report) => (
            <div key={report.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getStudentName(report.studentId)}
                    </h3>
                    {getStatusBadge(report.status)}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 mb-3">
                    <Calendar size={16} className="mr-2" />
                    <span>{new Date(report.date).toLocaleDateString('uz-UZ')}</span>
                    <span className="mx-2">•</span>
                    <Clock size={16} className="mr-1" />
                    <span>{report.hours} soat</span>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{report.activities}</p>
                  
                  {report.supervisorFeedback && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center text-sm text-blue-800 mb-1">
                        <MessageSquare size={16} className="mr-2" />
                        Rahbar izohi:
                      </div>
                      <p className="text-blue-700">{report.supervisorFeedback}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Hisobotlar topilmadi</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tanlangan filtrga mos hisobotlar mavjud emas.
            </p>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Hisobot tafsilotlari</h2>
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setFeedback('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talaba:</label>
                  <p className="text-gray-900">{getStudentName(selectedReport.studentId)}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sana:</label>
                    <p className="text-gray-900">{new Date(selectedReport.date).toLocaleDateString('uz-UZ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soatlar:</label>
                    <p className="text-gray-900">{selectedReport.hours} soat</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Faoliyat:</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedReport.activities}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Holat:</label>
                  {getStatusBadge(selectedReport.status)}
                </div>

                {selectedReport.status === 'pending' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Izoh (ixtiyoriy):
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Izoh yozing..."
                    />
                  </div>
                )}

                {selectedReport.supervisorFeedback && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Oldingi izoh:</label>
                    <p className="text-gray-900 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      {selectedReport.supervisorFeedback}
                    </p>
                  </div>
                )}
              </div>

              {selectedReport.status === 'pending' && (
                <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => handleReject(selectedReport.id)}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                  >
                    <XCircle size={20} className="mr-2" />
                    Rad etish
                  </button>
                  <button
                    onClick={() => handleApprove(selectedReport.id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <CheckCircle size={20} className="mr-2" />
                    Tasdiqlash
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}