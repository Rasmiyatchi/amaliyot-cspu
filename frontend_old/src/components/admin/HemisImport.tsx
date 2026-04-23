import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Users, Loader } from 'lucide-react';
import { useStudents } from '../../hooks/useData';
import { ImportResult } from '../../types';
import apiService from '../../services/api';

export function HemisImport() {
  const { refresh: refreshStudents } = useStudents();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      alert('Faqat Excel (.xlsx, .xls) yoki CSV fayllarni yuklash mumkin');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      // Real file upload to backend
      const result = await apiService.importHemisData(file) as any;
      setImportResult(result);
      
      // Refresh students list if import was successful
      if (result.success > 0) {
        await refreshStudents();
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: 0,
        failed: 1,
        duplicates: 0,
        errors: ['Fayl yuklashda xatolik yuz berdi']
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Create a sample CSV template
    const csvContent = `hemisId,fullName,studentId,faculty,department,course,group,phone,birthDate,passport,address,parentPhone
HEMIS001,Aziza Toshmatova,ST2024001,Informatika,Dasturiy injiniring,4,IT-401,+998901234567,2002-05-15,AA1234567,Toshkent sh. Yunusobod t.,+998901234568
HEMIS002,Bobur Aliyev,ST2024002,Texnika,Mexanika,3,TE-301,+998901234569,2003-08-22,AA2345678,Toshkent sh. Mirzo Ulugbek t.,+998901234570`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'hemis_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HEMIS Import</h1>
        <p className="text-gray-600 mt-1">HEMIS tizimidan talabalar ma'lumotlarini import qilish</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="text-blue-600 mr-3 mt-1" size={20} />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Import qilish bo'yicha ko'rsatmalar</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>1. HEMIS tizimidan talabalar ro'yxatini Excel yoki CSV formatda eksport qiling</li>
              <li>2. Fayl quyidagi ustunlarni o'z ichiga olishi kerak: hemisId, fullName, studentId, faculty, department, course, group</li>
              <li>3. Qo'shimcha ma'lumotlar: phone, birthDate, passport, address, parentPhone</li>
              <li>4. Har bir talaba uchun avtomatik login va parol yaratiladi</li>
              <li>5. Takroriy ma'lumotlar avtomatik aniqlash va o'tkazib yuboriladi</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Template Download */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Namuna fayl</h3>
            <p className="text-gray-600 text-sm">To'g'ri formatda fayl tayyorlash uchun namuna faylni yuklab oling</p>
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={20} className="mr-2" />
            Namuna yuklab olish
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fayl yuklash</h3>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInput}
            className="hidden"
          />
          
          {importing ? (
            <div className="flex flex-col items-center">
              <Loader className="animate-spin text-blue-600 mb-4" size={48} />
              <p className="text-lg font-medium text-gray-900">Import qilinmoqda...</p>
              <p className="text-gray-600">Iltimos, kuting</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <FileSpreadsheet className="text-gray-400 mb-4" size={48} />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Faylni bu yerga sudrab oling yoki tanlang
              </p>
              <p className="text-gray-600 mb-4">Excel (.xlsx, .xls) yoki CSV fayllar qo'llab-quvvatlanadi</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload size={20} className="mr-2" />
                Fayl tanlash
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import natijalari</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="text-green-600 mr-3" size={24} />
                <div>
                  <p className="text-2xl font-bold text-green-900">{importResult.success}</p>
                  <p className="text-sm text-green-700">Muvaffaqiyatli</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="text-yellow-600 mr-3" size={24} />
                <div>
                  <p className="text-2xl font-bold text-yellow-900">{importResult.duplicates}</p>
                  <p className="text-sm text-yellow-700">Takroriy</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="text-red-600 mr-3" size={24} />
                <div>
                  <p className="text-2xl font-bold text-red-900">{importResult.failed}</p>
                  <p className="text-sm text-red-700">Xatolik</p>
                </div>
              </div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">Xatoliklar:</h4>
              <ul className="text-sm text-red-800 space-y-1">
                {importResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}