import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, Download, Eye, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export function StudentDocuments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'contract' | 'program'>('contract');
  const [currentInternship, setCurrentInternship] = useState<any>(null);

  useEffect(() => {
    fetchDocuments();
    fetchCurrentInternship();
  }, []);

  const fetchCurrentInternship = async () => {
    try {
      if (user?.id) {
        const canStart = await apiService.checkStudentCanStart(user.id) as any;
        if (canStart.active_internship) {
          setCurrentInternship(canStart.active_internship);
        }
      }
    } catch (error) {
      console.error('Error fetching current internship:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDocuments();
      // Ma'lumotlar array formatida kelishini ta'minlash
      if (Array.isArray(data)) {
        setDocuments(data);
      } else if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
        setDocuments(data.results);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]); // Xatolik bo'lsa bo'sh array
    } finally {
      setLoading(false);
    }
  };

  // Ma'lumotlar array ekanligini ta'minlash
  const userDocuments = Array.isArray(documents) ? documents : [];
  const contractDocuments = userDocuments.filter(doc => doc.type === 'contract');
  const programDocuments = userDocuments.filter(doc => doc.type === 'program');

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    // Debug uchun FormData ni tekshirish
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }
    
    // Backend uchun kerakli fieldlarni qo'shish
    // User ID ni student ID sifatida ishlatish (backend da filter(user=user) qilinadi)
    // Student modeli User modeliga OneToOneField bilan bog'langan
    if (user?.id) {
      formData.append('student', user.id.toString());
    }
    if (currentInternship?.id) {
      formData.append('internship', currentInternship.id.toString());
    }
    
    // Agar name fieldi bo'sh bo'lsa, type ni name sifatida ishlatish
    const nameValue = formData.get('name') as string;
    if (!nameValue || nameValue.trim() === '') {
      const typeValue = formData.get('type') as string;
      if (typeValue) {
        formData.set('name', typeValue === 'contract' ? 'Amaliyot shartnomasi' : 'Amaliyot dasturi');
      }
    }
    
    // Debug uchun yakuniy FormData ni tekshirish
    console.log('Final FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }
    
    try {
      await apiService.uploadDocument(formData);
      setShowUploadModal(false);
      await fetchDocuments();
      alert('Hujjat yuklandi va tasdiqlash uchun yuborildi!');
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Hujjat yuklashda xatolik yuz berdi');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Kutish', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: 'Tasdiqlangan', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Rad etilgan', color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        <Icon size={12} className="mr-1" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hujjatlar</h1>
          <p className="text-gray-600 mt-1">Amaliyot shartnomasi va dasturlari</p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload size={20} className="mr-2" />
          Hujjat yuklash
        </button>
      </div>

      {/* Contract Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Amaliyot shartnomasi</h3>
          <p className="text-gray-600 text-sm">Tashkilot bilan imzolangan shartnoma</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 mx-auto"></div>
                <div className="h-32 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          ) : contractDocuments.length > 0 ? (
            <div className="space-y-3">
              {contractDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center">
                    <FileText className="text-blue-600 mr-3" size={24} />
                    <div>
                      <h4 className="font-medium text-gray-900">{doc.name}</h4>
                      <p className="text-sm text-gray-600">{doc.description}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Calendar size={12} className="mr-1" />
                        Yuklangan: {doc.uploadedAt}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(doc.status)}
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => navigate(`/document/${doc.id}`)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Eye size={16} />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Shartnoma yuklanmagan</h3>
              <p className="mt-1 text-sm text-gray-500">
                Tashkilot bilan imzolangan shartnomani yuklang
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Program Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Amaliyot dasturi</h3>
          <p className="text-gray-600 text-sm">Amaliyot dasturi va rejasi</p>
        </div>
        
        <div className="p-6">
          {programDocuments.length > 0 ? (
            <div className="space-y-3">
              {programDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center">
                    <FileText className="text-green-600 mr-3" size={24} />
                    <div>
                      <h4 className="font-medium text-gray-900">{doc.name}</h4>
                      <p className="text-sm text-gray-600">{doc.description}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Calendar size={12} className="mr-1" />
                        Yuklangan: {doc.uploadedAt}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(doc.status)}
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => navigate(`/document/${doc.id}`)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Eye size={16} />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Dastur yuklanmagan</h3>
              <p className="mt-1 text-sm text-gray-500">
                Amaliyot dasturi va rejasini yuklang
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Work Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Ish jadvali</h3>
          <p className="text-gray-600 text-sm">Haftalik ish kunlari va vaqtlari</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma'].map((day, index) => (
              <div key={index} className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-900">{day}</p>
                <p className="text-sm text-blue-700">9:00 - 17:00</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Eslatma:</strong> Kundalik hisobotlar ushbu jadvalga muvofiq tekshiriladi. 
              Ish kunlarida hisobot yuklash majburiy.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Hujjat yuklash</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>
            
            {!currentInternship ? (
              <div className="p-6 text-center">
                <div className="text-red-600 mb-4">
                  <FileText size={48} className="mx-auto mb-2" />
                  <p className="text-lg font-medium">Amaliyot topilmadi</p>
                </div>
                <p className="text-gray-600 mb-4">
                  Hujjat yuklash uchun avval amaliyotga tayinlanish kerak.
                </p>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Yopish
                </button>
              </div>
            ) : (
            <form onSubmit={handleFileUpload} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hujjat turi *
                  </label>
                  <select
                    name="type"
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="contract">Amaliyot shartnomasi</option>
                    <option value="program">Amaliyot dasturi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hujjat nomi (ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder={uploadType === 'contract' ? 'Amaliyot shartnomasi (avtomatik)' : 'Amaliyot dasturi (avtomatik)'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Bo'sh qoldirilsa, hujjat turi avtomatik nom sifatida ishlatiladi
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tavsif
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Hujjat haqida qisqacha ma'lumot"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fayl *
                  </label>
                  <input
                    type="file"
                    name="file"
                    accept=".pdf,.doc,.docx"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, DOC, DOCX formatlarida yuklash mumkin
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Yuklash
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
