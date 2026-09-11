import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Check, Globe2, ArrowRight, ShieldCheck } from 'lucide-react';

interface LanguageSelectionScreenProps {
  onCompleted?: () => void;
}

export const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({ onCompleted }) => {
  const { language, setLanguage, t } = useLanguage();
  const { currentUser, saveUserLanguage } = useAuth();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(currentUser?.language || language || 'en');
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = (code: LanguageCode) => {
    setSelectedLang(code);
    setLanguage(code);
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await saveUserLanguage(selectedLang);
      onCompleted?.();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="language-selection-screen" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Globe2 className="w-4 h-4" />
            <span>MedTrack • Multilingual Healthcare Logistics</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
            {t('chooseYourLanguage', 'Choose Your Language')}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
            {t('selectLanguageSubtitle', 'Select your preferred Indian language for Medicycle dashboards and tracking')}
          </p>

          {currentUser?.name && (
            <div className="mt-3 text-xs text-slate-400">
              Logged in as <span className="text-emerald-400 font-medium">{currentUser.name}</span> ({currentUser.role})
            </div>
          )}
        </div>

        {/* 13 Language Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                id={`lang-btn-${lang.code}`}
                onClick={() => handleSelect(lang.code)}
                type="button"
                className={`group relative p-4 rounded-xl text-left border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-950/50 border-emerald-500 shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 group-hover:border-slate-600">
                    {lang.code.toUpperCase()}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950'
                        : 'border border-slate-700 text-transparent group-hover:border-slate-500'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-base sm:text-lg font-bold text-white leading-tight">
                    {lang.nativeName}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{lang.name}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Preference is securely saved in your profile and synchronized across all sessions.</span>
          </div>

          <button
            id="confirm-language-btn"
            onClick={handleConfirm}
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-sm transition shadow-lg shadow-emerald-900/30 disabled:opacity-50 cursor-pointer"
          >
            <span>{isSaving ? t('loading', 'Saving...') : t('continue', 'Continue to Dashboard')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
