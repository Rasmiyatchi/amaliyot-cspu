import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

interface Document {
  id: number;
  name: string;
  type: string;
  file_url: string;
  student_name: string;
  uploaded_at: string;
}

const DocumentPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const doc = await apiService.getDocument(id!) as Document;
        setDocument(doc);
      } catch (err) {
        setError('Hujjat yuklanmadi');
        console.error('Error fetching document:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDocument();
    }
  }, [id]);

  const handleDownload = () => {
    if (document?.file_url) {
      window.open(document.file_url, '_blank');
    }
  };

  const getFileType = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'doc':
      case 'docx':
        return 'word';
      case 'xls':
      case 'xlsx':
        return 'excel';
      default:
        return 'file';
    }
  };

  const renderPreview = () => {
    if (!document?.file_url) return null;

    const fileType = getFileType(document.file_url);
    
    switch (fileType) {
      case 'pdf':
        return (
          <iframe
            src={document.file_url}
            width="100%"
            height="600px"
            style={{ border: 'none' }}
            title="PDF Preview"
          />
        );
      case 'image':
        return (
          <img
            src={document.file_url}
            alt={document.name}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        );
      default:
        return (
          <div className="text-center p-8">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-lg text-gray-600 mb-4">
              Bu fayl turini brauzerda ko'rsatish mumkin emas
            </p>
            <button
              onClick={handleDownload}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Yuklab olish
            </button>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Hujjat yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-lg text-red-600 mb-4">{error || 'Hujjat topilmadi'}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
          >
            Orqaga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{document.name}</h1>
                <p className="text-sm text-gray-500">
                  {document.student_name} • {document.type}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleDownload}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Yuklab olish
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
