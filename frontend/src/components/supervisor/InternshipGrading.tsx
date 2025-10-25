import React, { useState } from 'react';
import { Star, Send, X, AlertCircle } from 'lucide-react';
import { Internship } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';

interface InternshipGradingProps {
  internship: Internship;
  onGradeSubmitted?: () => void;
}

export function InternshipGrading({ internship, onGradeSubmitted }: InternshipGradingProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (score < 0 || score > 5) {
      setError('Baho 0 dan 5 gacha bo\'lishi kerak');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Izoh kamida 10 ta belgi bo\'lishi kerak');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiService.gradeInternship(internship.id, score, comment);
      setShowModal(false);
      setScore(0);
      setComment('');
      onGradeSubmitted?.();
    } catch (error: any) {
      setError(error.message || 'Baholashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setScore(star)}
            className={`w-8 h-8 transition-colors ${
              star <= score
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <Star className="w-full h-full fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {score}/5
        </span>
      </div>
    );
  };

  // Faqat supervisor va faqat yakunlangan amaliyotlar uchun
  if (user?.role !== 'supervisor' || internship.status !== 'completed' || internship.is_graded) {
    return null;
  }

  return (
    <>
      {/* Baholash tugmasi */}
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Star className="w-4 h-4" />
        Amaliyotni baholash
      </button>

      {/* Baholash modali */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Amaliyotni baholash
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student ma'lumotlari */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {internship.student_name}
                </h4>
                <p className="text-sm text-gray-600">
                  {internship.type_display} • {internship.company_name}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(internship.start_date).toLocaleDateString('uz-UZ')} - {new Date(internship.end_date).toLocaleDateString('uz-UZ')}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Baho */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Baho (0-5)
                  </label>
                  {renderStars()}
                </div>

                {/* Izoh */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Baholash izohi *
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Amaliyot davomida talabaning ishlashini, faolligini, hisobotlarini baholang..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Kamida 10 ta belgi
                  </p>
                </div>

                {/* Tugmalar */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={loading}
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={loading || score === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Yuborilmoqda...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Baholash
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
