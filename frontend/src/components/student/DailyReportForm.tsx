import { useState } from 'react';
import { Calendar, Clock, FileText, Save } from 'lucide-react';
import { useDailyReports } from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';

interface DailyReportFormProps {
  internshipId: string;
}

export function DailyReportForm({ internshipId }: DailyReportFormProps) {
  const { addReport } = useDailyReports();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    activities: '',
    hours: 8
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      await addReport({
        studentId: user.id,
        internshipId: internshipId,
        date: formData.date,
        activities: formData.activities,
        hours: formData.hours,
        status: 'pending'
      });
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        activities: '',
        hours: 8
      });
      
      alert('Hisobot muvaffaqiyatli yuborildi!');
    } catch {
      alert('Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hours' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <FileText className="mr-3 text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-gray-900">Kundalik hisobot</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline mr-2" size={16} />
              Sana *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline mr-2" size={16} />
              Ish soatlari *
            </label>
            <input
              type="number"
              name="hours"
              value={formData.hours}
              onChange={handleChange}
              required
              min="1"
              max="12"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bajarilgan ishlar va faoliyat *
          </label>
          <textarea
            name="activities"
            value={formData.activities}
            onChange={handleChange}
            required
            rows={6}
            placeholder="Bugun bajarilgan ishlar, o'rganilgan mavzular va faoliyatlar haqida batafsil yozing..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Kamida 50 ta belgi kiriting. Aniq va batafsil ma'lumot bering.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Eslatma:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Har kuni bajarilgan ishlar haqida hisobot bering</li>
            <li>• Aniq va batafsil ma'lumot kiriting</li>
            <li>• Hisobot rahbar tomonidan ko'rib chiqiladi</li>
            <li>• Tasdiqlangan hisobotlar bahoga ta'sir qiladi</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || formData.activities.length < 50}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <Save size={20} className="mr-2" />
            {isSubmitting ? 'Yuklanmoqda...' : 'Hisobotni yuborish'}
          </button>
        </div>
      </form>
    </div>
  );
}