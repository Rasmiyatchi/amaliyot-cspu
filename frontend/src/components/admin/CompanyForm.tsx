import { useState } from 'react';
import { X, Save, Building2 } from 'lucide-react';
import { Company } from '../../types';

interface CompanyFormProps {
  company?: Company;
  onSave: (company: Omit<Company, 'id' | 'assignedStudents' | 'rating'>) => void;
  onClose: () => void;
}

export function CompanyForm({ company, onSave, onClose }: CompanyFormProps) {
  const [formData, setFormData] = useState<Omit<Company, 'id' | 'assignedStudents' | 'rating'>>({
    name: company?.name || '',
    direction: company?.direction || '',
    address: company?.address || '',
    phone: company?.phone || '',
    capacity: company?.capacity || 10,
    status: company?.status || 'active',
    work_days: company?.work_days || [],
    work_days_display: company?.work_days_display || [],
    work_hours_start: company?.work_hours_start || '09:00',
    work_hours_end: company?.work_hours_end || '18:00'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('CompanyForm submitting data:', formData);
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value) : value
    }));
  };

  const handleWorkDayChange = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      work_days: checked 
        ? [...prev.work_days, day]
        : prev.work_days.filter(d => d !== day)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {company ? 'Korxonani tahrirlash' : 'Yangi korxona qo\'shish'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building2 className="mr-2" size={20} />
                Korxona ma'lumotlari
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Korxona nomi *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yo'nalish *
                </label>
                <input
                  type="text"
                  name="direction"
                  value={formData.direction}
                  onChange={handleChange}
                  required
                  placeholder="Masalan: IT, Savdo, Xizmat ko'rsatish"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manzil *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder="To'liq manzil"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+998901234567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sig'im *
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    required
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Holat *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Faol</option>
                  <option value="inactive">Nofaol</option>
                </select>
              </div>

              {/* Ish kunlari */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ish kunlari *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 'monday', label: 'Dushanba' },
                    { value: 'tuesday', label: 'Seshanba' },
                    { value: 'wednesday', label: 'Chorshanba' },
                    { value: 'thursday', label: 'Payshanba' },
                    { value: 'friday', label: 'Juma' },
                    { value: 'saturday', label: 'Shanba' },
                    { value: 'sunday', label: 'Yakshanba' }
                  ].map((day) => (
                    <label key={day.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.work_days.includes(day.value)}
                        onChange={(e) => handleWorkDayChange(day.value, e.target.checked)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ish soatlari */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ish boshlanish vaqti *
                  </label>
                  <input
                    type="time"
                    name="work_hours_start"
                    value={formData.work_hours_start}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ish tugash vaqti *
                  </label>
                  <input
                    type="time"
                    name="work_hours_end"
                    value={formData.work_hours_end}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save size={20} className="mr-2" />
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
