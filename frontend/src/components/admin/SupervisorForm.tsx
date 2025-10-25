import { useState } from 'react';
import { X, Save, User, Building } from 'lucide-react';
import { Supervisor } from '../../types';
import { useFaculties, useDepartments, useCompanies } from '../../hooks/useData';

interface SupervisorFormProps {
  supervisor?: Supervisor;
  onSave: (supervisor: Omit<Supervisor, 'id' | 'assignedStudents' | 'rating'>) => void;
  onClose: () => void;
}

export function SupervisorForm({ supervisor, onSave, onClose }: SupervisorFormProps) {
  const { faculties, loading: facultiesLoading } = useFaculties();
  const { departments, loading: departmentsLoading } = useDepartments();
  const { companies } = useCompanies();
  
  const [formData, setFormData] = useState<Omit<Supervisor, 'id' | 'assignedStudents' | 'rating'>>({
    name: supervisor?.name || '',
    position: supervisor?.position || '',
    department: supervisor?.department || '',
    faculty: supervisor?.faculty || '',
    phone: supervisor?.phone || '',
    specialization: supervisor?.specialization || '',
    capacity: supervisor?.capacity || 10,
    status: supervisor?.status || 'active',
    experience: supervisor?.experience || 0,
    company: supervisor?.company || ''
  });

  // Filter departments based on selected faculty
  const filteredDepartments = departments.filter(dept => 
    dept.faculty_name === formData.faculty || dept.faculty === formData.faculty
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Backend uchun to'g'ri formatga o'tkazish
    const backendData = {
      first_name: formData.name.split(' ')[0] || formData.name,
      last_name: formData.name.split(' ').slice(1).join(' ') || '',
      phone: formData.phone,
      position: formData.position,
      department: formData.department,
      faculty: formData.faculty,
      specialization: formData.specialization,
      capacity: formData.capacity,
      experience: formData.experience,
      status: formData.status,
      company: formData.company && formData.company !== '' ? formData.company : null
    };
    
    console.log('SupervisorForm submitting data:', backendData);
    onSave(backendData as any);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' || name === 'experience' ? 
        (value === '' ? 0 : parseInt(value) || 0) : value,
      // Reset department when faculty changes
      ...(name === 'faculty' && { department: '' })
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {supervisor ? 'Rahbarni tahrirlash' : 'Yangi rahbar qo\'shish'}
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
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="mr-2" size={20} />
                Shaxsiy ma'lumotlar
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To'liq ismi *
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
                  Telefon *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building className="mr-2" size={20} />
                Akademik ma'lumotlar
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lavozim *
                </label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Lavozimni tanlang</option>
                  <option value="Professor">Professor</option>
                  <option value="Dotsent">Dotsent</option>
                  <option value="Katta o'qituvchi">Katta o'qituvchi</option>
                  <option value="O'qituvchi">O'qituvchi</option>
                  <option value="Assistent">Assistent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fakultet *
                </label>
                <select
                  name="faculty"
                  value={formData.faculty}
                  onChange={handleChange}
                  required
                  disabled={facultiesLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Fakultetni tanlang</option>
                  {faculties.map(faculty => (
                    <option key={faculty.id} value={faculty.name}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
                {facultiesLoading && (
                  <p className="text-sm text-gray-500 mt-1">Fakultetlar yuklanmoqda...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kafedra *
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  disabled={departmentsLoading || !formData.faculty}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Kafedrani tanlang</option>
                  {filteredDepartments.map(department => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
                </select>
                {departmentsLoading && (
                  <p className="text-sm text-gray-500 mt-1">Kafedralar yuklanmoqda...</p>
                )}
                {!formData.faculty && !departmentsLoading && (
                  <p className="text-sm text-gray-500 mt-1">Avval fakultetni tanlang</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mutaxassislik *
                </label>
                <textarea
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tajriba (yil) *
                  </label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    required
                    min="0"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
              </div>

              {/* Company tanlash */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Korxona (ixtiyoriy)
                </label>
                <select
                  name="company"
                  value={formData.company || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Korxona tanlash</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
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