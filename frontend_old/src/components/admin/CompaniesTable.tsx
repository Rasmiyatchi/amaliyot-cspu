import { useState } from 'react';
import { Search, Plus, Building2, Star, Phone, MapPin, Edit, Trash2 } from 'lucide-react';
import { useCompanies } from '../../hooks/useData';
import { Company } from '../../types';
import { CompanyForm } from './CompanyForm';

export function CompaniesTable() {
  const { companies, loading, addCompany, updateCompany, deleteCompany } = useCompanies();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();

  const filteredCompanies = companies.filter(company =>
    (company.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.direction || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveCompany = (companyData: Omit<Company, 'id' | 'assignedStudents' | 'rating'>) => {
    if (editingCompany) {
      updateCompany(editingCompany.id, companyData);
    } else {
      // Add default values for assignedStudents and rating
      const fullCompanyData = {
        ...companyData,
        assignedStudents: 0,
        rating: 0
      };
      addCompany(fullCompanyData);
    }
    setShowForm(false);
    setEditingCompany(undefined);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setShowForm(true);
  };

  const handleDeleteCompany = async (id: string) => {
    if (window.confirm('Bu korxonani o\'chirishni xohlaysizmi?')) {
      try {
        await deleteCompany(id);
      } catch (error) {
        console.error('Error deleting company:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Korxonalar</h1>
          <p className="text-gray-600 mt-1">Hamkor korxonalar va amaliyot bazalari</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Yangi korxona
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Korxona nomi yoki yo'nalish bo'yicha qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Companies Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <div key={company.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="text-blue-600" size={24} />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                      <div className="flex items-center mt-1">
                        <Star className="text-yellow-400 fill-current" size={16} />
                        <span className="text-sm text-gray-600 ml-1">{company.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      company.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {company.status === 'active' ? 'Faol' : 'Nofaol'}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditCompany(company)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Tahrirlash"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin size={16} className="mr-2 text-gray-400" />
                    <span className="truncate">{company.address}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone size={16} className="mr-2 text-gray-400" />
                    <span>{company.phone}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Yo'nalish:</span>
                    <span className="font-medium text-gray-900">{company.direction}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">Talabalar:</span>
                    <span className="font-medium text-gray-900">
                      {company.assignedStudents}/{company.capacity}
                    </span>
                  </div>
                  
                  {/* Ish kunlari va soatlari */}
                  {company.work_days && company.work_days.length > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-500">Ish kunlari:</span>
                        <div className="flex flex-wrap gap-1">
                          {company.work_days_display?.slice(0, 3).map((day, index) => (
                            <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {day}
                            </span>
                          ))}
                          {company.work_days_display && company.work_days_display.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{company.work_days_display.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-500">Ish vaqti:</span>
                        <span className="font-medium text-gray-900">
                          {company.work_hours_start} - {company.work_hours_end}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(company.assignedStudents / company.capacity) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Bandlik</span>
                    <span>{Math.round((company.assignedStudents / company.capacity) * 100)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCompanies.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Korxonalar topilmadi</h3>
              <p className="mt-1 text-sm text-gray-500">
                Qidiruv shartlaringizni o'zgartiring yoki yangi korxona qo'shing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Company Form Modal */}
      {showForm && (
        <CompanyForm
          company={editingCompany}
          onSave={handleSaveCompany}
          onClose={() => {
            setShowForm(false);
            setEditingCompany(undefined);
          }}
        />
      )}
    </div>
  );
}