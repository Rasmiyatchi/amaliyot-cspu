import { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/api';

interface DocumentUploadProps {
  internshipId: string;
  onUploadSuccess?: () => void;
}

interface UploadedDocument {
  id: string;
  name: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
}

export function DocumentUpload({ internshipId, onUploadSuccess }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newDocuments: UploadedDocument[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      file,
      status: 'uploading',
      progress: 0
    }));

    setDocuments(prev => [...prev, ...newDocuments]);
    
    // Har bir faylni yuklash
    newDocuments.forEach(doc => uploadDocument(doc));
  };

  const uploadDocument = async (document: UploadedDocument) => {
    try {
      const formData = new FormData();
      formData.append('file', document.file);
      formData.append('internship', internshipId);
      formData.append('document_type', 'general'); // Umumiy hujjat
      formData.append('description', `Student tomonidan yuklangan: ${document.name}`);

      // Progress simulation
      const progressInterval = setInterval(() => {
        setDocuments(prev => prev.map(doc => 
          doc.id === document.id 
            ? { ...doc, progress: Math.min(doc.progress + 10, 90) }
            : doc
        ));
      }, 100);

      const response = await apiService.uploadDocument(formData);
      
      clearInterval(progressInterval);
      
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, status: 'success', progress: 100 }
          : doc
      ));

      if (onUploadSuccess) {
        onUploadSuccess();
      }

    } catch (error) {
      console.error('Upload error:', error);
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, status: 'error', progress: 0 }
          : doc
      ));
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Hujjatlar yuklash</h3>
        <button
          onClick={triggerFileInput}
          disabled={isUploading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Upload className="mr-2" size={20} />
          Fayl tanlash
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Qabul qilinadigan fayl formatlari:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• PDF hujjatlar (.pdf)</li>
          <li>• Word hujjatlar (.doc, .docx)</li>
          <li>• Excel jadvallar (.xls, .xlsx)</li>
          <li>• Rasm fayllar (.jpg, .jpeg, .png)</li>
        </ul>
        <p className="text-xs text-blue-700 mt-2">
          Maksimal fayl hajmi: 10MB
        </p>
      </div>

      {/* Upload Progress */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Yuklanayotgan fayllar:</h4>
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center flex-1">
                <File className="text-gray-400 mr-3" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        doc.status === 'success' ? 'bg-green-500' :
                        doc.status === 'error' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${doc.progress}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center ml-3">
                {doc.status === 'success' && (
                  <CheckCircle className="text-green-500 mr-2" size={20} />
                )}
                {doc.status === 'error' && (
                  <AlertCircle className="text-red-500 mr-2" size={20} />
                )}
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success Message */}
      {documents.some(doc => doc.status === 'success') && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="text-green-500 mr-2" size={20} />
            <p className="text-green-800 font-medium">
              Hujjatlar muvaffaqiyatli yuklandi!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
