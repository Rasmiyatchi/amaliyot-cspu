import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { apiService } from '../../services/api';

interface Document {
  id: number;
  name: string;
  type: string;
  description: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  uploaded_at: string;
  student_name: string;
  student_id: number;
}

export function DocumentApproval() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDocuments() as any;
      setDocuments(response.results || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (document: Document) => {
    try {
      await apiService.approveDocument(document.id.toString());
      await fetchDocuments();
    } catch (error) {
      console.error('Error approving document:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedDocument || !rejectionReason.trim()) return;

    try {
      await apiService.rejectDocument(selectedDocument.id.toString(), rejectionReason);
      setShowRejectModal(false);
      setSelectedDocument(null);
      setRejectionReason('');
      await fetchDocuments();
    } catch (error) {
      console.error('Error rejecting document:', error);
    }
  };

  const openRejectModal = (document: Document) => {
    setSelectedDocument(document);
    setShowRejectModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Tasdiqlangan
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rad etilgan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Kutilmoqda
          </span>
        );
    }
  };

  const getTypeName = (type: string) => {
    const typeNames: { [key: string]: string } = {
      'contract': 'Shartnoma',
      'program': 'Dastur',
      'report': 'Hisobot',
      'certificate': 'Sertifikat',
      'other': 'Boshqa'
    };
    return typeNames[type] || type;
  };

  const filteredDocuments = documents.filter(doc => {
    if (filter === 'all') return true;
    return doc.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hujjat Tasdiqlash</h1>
          <p className="text-gray-600">Talabalar tomonidan yuklangan hujjatlarni ko'rib chiqing va tasdiqlang</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex space-x-2">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === status
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'Barchasi' : 
             status === 'pending' ? 'Kutilmoqda' :
             status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow">
        {filteredDocuments.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <FileText className="text-blue-600 mt-1" size={24} />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{doc.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>Talaba: {doc.student_name}</span>
                        <span>Tur: {getTypeName(doc.type)}</span>
                        <span>Yuklangan: {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                      {doc.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-700">
                            <strong>Rad etish sababi:</strong> {doc.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(doc.status)}
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/document/${doc.id}`)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Ko'rish"
                      >
                        <Eye size={16} />
                      </button>
                      
                      {doc.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(doc)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Tasdiqlash"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => openRejectModal(doc)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Rad etish"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Hujjatlar yo'q</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'pending' ? 'Kutilayotgan hujjatlar yo\'q' : 'Bu kategoriyada hujjatlar yo\'q'}
            </p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Hujjatni rad etish</h3>
              <p className="text-sm text-gray-600 mb-4">
                "{selectedDocument?.name}" hujjatini rad etish sababini kiriting:
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                rows={4}
                placeholder="Rad etish sababini kiriting..."
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedDocument(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Rad etish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
