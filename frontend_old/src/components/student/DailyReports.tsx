import React, { useState } from 'react';
import { Calendar, Camera, FileText, Plus, Eye, Upload } from 'lucide-react';
import { apiService } from '../../services/api';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { useAuth } from '../../contexts/AuthContext';

export function DailyReports() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    activities: '',
    hours: 8
  });

  // Real-time updates
  const { data: reports, loading, refresh } = useRealTimeUpdates('report', () => apiService.getDailyReports());

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedPhotos(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.activities.length < 50) {
      alert('Faoliyat tavsifi kamida 50 ta belgi bo\'lishi kerak');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('date', formData.date);
      formDataToSend.append('activities', formData.activities);
      formDataToSend.append('hours', formData.hours.toString());
      
      // Rasmlarni qo'shish (ixtiyoriy)
      selectedPhotos.forEach((photo) => {
        formDataToSend.append(`photos`, photo);
      });

      await apiService.createDailyReport(formDataToSend);
      
      // Kunlik statusni yangilash (hisobot topshirilgan)
      if (user?.id) {
        try {
          // Student ning faol amaliyotini topish
          const studentData = await apiService.getStudent(user.id) as any;
          if (studentData && studentData.active_internship) {
            // DailyStatus ni yangilash - hisobot topshirilgan deb belgilash
            const today = new Date().toISOString().split('T')[0];
            console.log('Hisobot yuborildi, DailyStatus yangilanishi kerak:', today);
            
            // WebSocket orqali real-time yangilanish
            window.dispatchEvent(new CustomEvent('refresh-internship-data'));
            window.dispatchEvent(new CustomEvent('refresh-report-data'));
          }
        } catch (error) {
          console.error('Error updating daily status:', error);
        }
      }
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        activities: '',
        hours: 8
      });
      setSelectedPhotos([]);
      setShowForm(false);
      
      // Ma'lumotlarni yangilash
      await refresh();
      
      alert('Kundalik hisobot yuborildi!');
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Hisobot yuborishda xatolik yuz berdi');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Kutish', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Tasdiqlangan', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rad etilgan', color: 'bg-red-100 text-red-800' }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kundalik hisobotlar</h1>
          <p className="text-gray-600 mt-1">Har kungi faoliyat va fotosurat hisobotlari</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Yangi hisobot
        </button>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Mening hisobotlarim</h3>
        </div>
        
        <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 mx-auto"></div>
              <div className="h-32 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        ) : reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Calendar className="text-blue-600" size={20} />
                        <span className="font-medium text-gray-900">
                          {new Date(report.date).toLocaleDateString('uz-UZ')}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(report.status).color}`}>
                          {getStatusBadge(report.status).label}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 mb-2">{report.activities}</p>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <span>{report.hours} soat</span>
                        {report.photos && report.photos.length > 0 && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{report.photos.length} ta rasm</span>
                          </>
                        )}
                      </div>

                      {report.supervisor_feedback && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Rahbar izohi:</strong> {report.supervisor_feedback}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                      <Eye size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Hali hisobotlar yo'q</h3>
              <p className="mt-1 text-sm text-gray-500">
                Birinchi kundalik hisobotingizni yozing
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Report Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Yangi kundalik hisobot</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sana *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ish soatlari *
                    </label>
                    <input
                      type="number"
                      value={formData.hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, hours: parseInt(e.target.value) }))}
                      required
                      min="1"
                      max="12"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rasmlar (ixtiyoriy)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <Camera className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Rasmlarni tanlash uchun bosing
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, JPEG (ixtiyoriy)</p>
                    </label>
                  </div>
                  
                  {selectedPhotos.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Tanlangan rasmlar ({selectedPhotos.length}):
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedPhotos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Rasm ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs">{photo.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bajarilgan ishlar va faoliyat *
                  </label>
                  <textarea
                    value={formData.activities}
                    onChange={(e) => setFormData(prev => ({ ...prev, activities: e.target.value }))}
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bugun bajarilgan ishlar, o'rganilgan mavzular va faoliyatlar haqida batafsil yozing..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.activities.length}/50 (kamida 50 ta belgi)
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Eslatma:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Faoliyat tavsifi kamida 50 ta belgi bo'lishi kerak</li>
                    <li>• Rasmlar ixtiyoriy (3 tagacha)</li>
                    <li>• Hisobot rahbar tomonidan ko'rib chiqiladi</li>
                    <li>• Tasdiqlangan hisobotlar bahoga ta'sir qiladi</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={formData.activities.length < 50}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <Upload size={20} className="mr-2" />
                  Yuborish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
