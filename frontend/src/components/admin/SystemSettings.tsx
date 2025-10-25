import { useState } from 'react';
import { Save, RefreshCw, Database, Server, FileText, Bell, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SystemSettings {
  site_name: string;
  site_description: string;
  max_file_size: number;
  allowed_file_types: string[];
  email_notifications: boolean;
  auto_backup: boolean;
  backup_frequency: string;
  maintenance_mode: boolean;
}

export function SystemSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: 'Amaliyot Platformasi',
    site_description: 'Talabalar amaliyotini boshqarish tizimi',
    max_file_size: 10,
    allowed_file_types: ['pdf', 'doc', 'docx', 'jpg', 'png'],
    email_notifications: true,
    auto_backup: true,
    backup_frequency: 'daily',
    maintenance_mode: false,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      // API call to create backup
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate backup
      alert('Backup muvaffaqiyatli yaratildi!');
    } catch (error) {
      console.error('Error creating backup:', error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ruxsat yo'q</h3>
        <p className="text-gray-600">Bu sahifaga faqat Super Admin kirishi mumkin</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tizim sozlamalari</h1>
          <p className="text-gray-600 mt-1">Platforma konfiguratsiyasi va boshqaruvi</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save size={20} className="mr-2" />
          {loading ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">Sozlamalar muvaffaqiyatli saqlandi!</p>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="mr-2" size={20} />
          Umumiy sozlamalar
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sayt nomi
            </label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => setSettings({...settings, site_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sayt tavsifi
            </label>
            <input
              type="text"
              value={settings.site_description}
              onChange={(e) => setSettings({...settings, site_description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* File Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="mr-2" size={20} />
          Fayl sozlamalari
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maksimal fayl hajmi (MB)
            </label>
            <input
              type="number"
              value={settings.max_file_size}
              onChange={(e) => setSettings({...settings, max_file_size: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ruxsat etilgan fayl turlari
            </label>
            <input
              type="text"
              value={settings.allowed_file_types.join(', ')}
              onChange={(e) => setSettings({...settings, allowed_file_types: e.target.value.split(', ')})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="pdf, doc, docx, jpg, png"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Bell className="mr-2" size={20} />
          Bildirishnoma sozlamalari
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Email bildirishnomalari</p>
              <p className="text-sm text-gray-600">Foydalanuvchilarga email orqali bildirishnoma yuborish</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.email_notifications}
                onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Backup Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="mr-2" size={20} />
          Backup sozlamalari
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Avtomatik backup</p>
              <p className="text-sm text-gray-600">Ma'lumotlar bazasini avtomatik ravishda backup qilish</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_backup}
                onChange={(e) => setSettings({...settings, auto_backup: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          {settings.auto_backup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup chastotasi
              </label>
              <select
                value={settings.backup_frequency}
                onChange={(e) => setSettings({...settings, backup_frequency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">Kunlik</option>
                <option value="weekly">Haftalik</option>
                <option value="monthly">Oylik</option>
              </select>
            </div>
          )}
          <button
            onClick={handleBackup}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={20} className="mr-2" />
            {loading ? 'Backup yaratilmoqda...' : 'Hozir backup yaratish'}
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Server className="mr-2" size={20} />
          Tizim holati
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Ma'lumotlar bazasi</p>
              <p className="text-xs text-gray-600">Faol</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">API server</p>
              <p className="text-xs text-gray-600">Faol</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Fayl serveri</p>
              <p className="text-xs text-gray-600">Faol</p>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="mr-2" size={20} />
          Texnik xizmat rejimi
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Texnik xizmat rejimi</p>
            <p className="text-sm text-gray-600">Tizimni vaqtincha to'xtatish</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => setSettings({...settings, maintenance_mode: e.target.checked})}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
