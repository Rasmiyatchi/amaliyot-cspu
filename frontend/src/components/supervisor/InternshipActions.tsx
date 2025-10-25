import { useState } from 'react';
import { CheckCircle, XCircle, Star, FileText, Eye } from 'lucide-react';
import { apiService } from '../../services/api';

interface InternshipActionsProps {
  internship: any;
  onUpdate: () => void;
}

export function InternshipActions({ internship, onUpdate }: InternshipActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleApproveReport = async (reportId: string) => {
    try {
      setLoading(`approve-${reportId}`);
      await apiService.updateDailyReport(reportId, 'approved');
      onUpdate();
    } catch (error) {
      console.error('Error approving report:', error);
      alert('Hisobotni tasdiqlashda xatolik yuz berdi');
    } finally {
      setLoading(null);
    }
  };

  const handleRejectReport = async (reportId: string) => {
    const reason = prompt('Rad etish sababini kiriting:');
    if (!reason) return;

    try {
      setLoading(`reject-${reportId}`);
      await apiService.updateDailyReport(reportId, 'rejected', reason);
      onUpdate();
    } catch (error) {
      console.error('Error rejecting report:', error);
      alert('Hisobotni rad etishda xatolik yuz berdi');
    } finally {
      setLoading(null);
    }
  };

  const handleGradeInternship = async () => {
    const grade = prompt('Amaliyot uchun baho kiriting (1-5):');
    if (!grade || isNaN(Number(grade)) || Number(grade) < 1 || Number(grade) > 5) {
      alert('Baho 1 dan 5 gacha bo\'lishi kerak');
      return;
    }

    const comment = prompt('Izoh kiriting (ixtiyoriy):');

    try {
      setLoading('grade');
      await apiService.gradeInternship(internship.id, {
        grade: Number(grade),
        comment: comment || ''
      });
      onUpdate();
      alert('Amaliyot muvaffaqiyatli baholandi!');
    } catch (error) {
      console.error('Error grading internship:', error);
      alert('Amaliyotni baholashda xatolik yuz berdi');
    } finally {
      setLoading(null);
    }
  };

  const handleCompleteInternship = async () => {
    if (!confirm('Amaliyotni yakunlashni tasdiqlaysizmi?')) return;

    try {
      setLoading('complete');
      await apiService.updateInternship(internship.id, { status: 'completed' });
      onUpdate();
      alert('Amaliyot muvaffaqiyatli yakunlandi!');
    } catch (error) {
      console.error('Error completing internship:', error);
      alert('Amaliyotni yakunlashda xatolik yuz berdi');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Reports Actions */}
      {internship.reports && internship.reports.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">Hisobotlar</h4>
          <div className="space-y-2">
            {internship.reports.map((report: any) => (
              <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="text-gray-400 mr-2" size={16} />
                  <div>
                    <p className="text-sm font-medium">{report.date}</p>
                    <p className="text-xs text-gray-500">
                      {report.hours} soat • {report.status_display}
                    </p>
                  </div>
                </div>
                
                {report.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApproveReport(report.id)}
                      disabled={loading === `approve-${report.id}`}
                      className="flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle size={14} className="mr-1" />
                      Tasdiqlash
                    </button>
                    <button
                      onClick={() => handleRejectReport(report.id)}
                      disabled={loading === `reject-${report.id}`}
                      className="flex items-center px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle size={14} className="mr-1" />
                      Rad etish
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Internship Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3">Amaliyot harakatlari</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Grade Internship */}
          {internship.status === 'started' && !internship.grade && (
            <button
              onClick={handleGradeInternship}
              disabled={loading === 'grade'}
              className="flex items-center justify-center p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              <Star className="mr-2" size={20} />
              Amaliyotni baholash
            </button>
          )}

          {/* Complete Internship */}
          {internship.status === 'started' && (
            <button
              onClick={handleCompleteInternship}
              disabled={loading === 'complete'}
              className="flex items-center justify-center p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="mr-2" size={20} />
              Amaliyotni yakunlash
            </button>
          )}

          {/* View Documents */}
          <button className="flex items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Eye className="mr-2" size={20} />
            Hujjatlarni ko'rish
          </button>
        </div>
      </div>

      {/* Status Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Amaliyot holati</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>Holat: <span className="font-medium">{internship.status_display}</span></p>
          <p>Boshlanish: {new Date(internship.start_date).toLocaleDateString('uz-UZ')}</p>
          <p>Tugash: {new Date(internship.end_date).toLocaleDateString('uz-UZ')}</p>
          {internship.grade && (
            <p>Baho: <span className="font-medium">{internship.grade}/5</span></p>
          )}
        </div>
      </div>
    </div>
  );
}
