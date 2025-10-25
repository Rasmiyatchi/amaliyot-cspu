import { useState } from 'react';
import { Eye, EyeOff, GraduationCap, Building, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Backend avtomatik role aniqlaydi
    const success = await login(username, password);
    
    if (!success) {
      setError('Username yoki parol noto\'g\'ri');
    }
    
    setLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Admin uchun ham backend avtomatik role aniqlaydi
    const success = await login(username, password);
    
    if (!success) {
      setError('Username yoki parol noto\'g\'ri');
    }
    
    setLoading(false);
  };

  if (showAdminLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Admin Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-gray-700 to-slate-700 text-white">
              <div className="text-center">
                <Settings className="mx-auto mb-4" size={48} />
                <h2 className="text-2xl font-bold">Admin Panel</h2>
                <p className="text-gray-300 mt-2">Tizim boshqaruvi</p>
              </div>
            </div>

            {/* Admin Form */}
            <form onSubmit={handleAdminLogin} className="px-8 py-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-colors"
                    placeholder="Admin username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parol
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-colors"
                      placeholder="Admin parol"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-gray-700 to-slate-700 text-white py-3 px-4 rounded-lg font-medium hover:from-gray-800 hover:to-slate-800 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? 'Kuting...' : 'Admin kirish'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="w-full text-gray-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Orqaga
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
            <div className="text-center">
              <GraduationCap className="mx-auto mb-4" size={48} />
              <h2 className="text-2xl font-bold">Amaliyot Platformasi</h2>
              <button
                onClick={() => setShowAdminLogin(true)}
                className="text-blue-100 mt-2 hover:text-white transition-colors cursor-pointer"
              >
                Tizimga kirish
              </button>
            </div>
          </div>

          {/* Role Info */}
          <div className="px-8 py-4 border-b border-gray-100 bg-blue-50">
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <GraduationCap size={20} className="text-blue-600" />
                <span className="text-sm text-blue-700">Talaba</span>
              </div>
              <div className="flex items-center space-x-2">
                <Building size={20} className="text-blue-600" />
                <span className="text-sm text-blue-700">Amaliyot rahbari</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 py-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student ID, Supervisor ID
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Student ID, Supervisor ID yoki Username kiriting"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parol
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Parolingizni kiriting"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? 'Kuting...' : 'Kirish'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}