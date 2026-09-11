import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AuthModal } from '../auth/AuthModal';
import {
  ShieldCheck,
  Building2,
  Truck,
  Factory,
  ArrowRight,
  Package,
  QrCode,
  Flame,
  CheckCircle2,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface LandingPageProps {
  onLoginSuccess?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'signin' | 'signup'>('signin');
  const [modalInitialUsername, setModalInitialUsername] = useState('');

  const openAuthModal = (tab: 'signin' | 'signup' = 'signin', hintUsername: string = '') => {
    setModalInitialTab(tab);
    setModalInitialUsername(hintUsername);
    setShowLoginModal(true);
  };

  const openLoginWithHint = (hintUsername?: string) => {
    openAuthModal('signin', hintUsername || '');
  };

  return (
    <div id="landing-page-root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              MEDI<span className="text-emerald-600">CYCLE</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="header-signin-btn"
            onClick={() => openAuthModal('signin')}
            className="flex items-center gap-1.5 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
          <button
            id="header-signup-btn"
            onClick={() => openAuthModal('signup')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs shadow-emerald-600/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Sign Up</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 sm:py-16 flex flex-col items-center text-center space-y-12">
        {/* Title & Subtitle */}
        <div className="space-y-4 max-w-xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Smart Waste.<br />
            <span className="text-emerald-600">Safer Healthcare.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 font-medium">
            Track biomedical waste from hospital to treatment plant with digital custody and real-time compliance.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="hero-signin-btn"
              onClick={() => openAuthModal('signin')}
              className="w-full sm:w-auto px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/25 transition inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>SIGN IN TO MEDICYCLE</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              id="hero-signup-btn"
              onClick={() => openAuthModal('signup')}
              className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 border-2 border-slate-200 hover:border-emerald-500 font-bold text-sm sm:text-base rounded-2xl transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>CREATE ACCOUNT</span>
            </button>
          </div>
        </div>

        {/* 4 Ecosystem Cards */}
        <div className="w-full space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Biomedical Waste Lifecycle Stakeholders
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Hospital */}
            <button
              id="role-preview-hospital"
              onClick={() => openLoginWithHint('hospital01')}
              className="bg-white hover:bg-emerald-50/70 border-2 border-slate-200/80 hover:border-emerald-500 p-5 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
              <span className="font-extrabold text-slate-900 text-base">Hospital</span>
              <span className="text-xs text-slate-500 mt-0.5">Book &amp; Handover</span>
            </button>

            {/* Driver */}
            <button
              id="role-preview-driver"
              onClick={() => openLoginWithHint('driver01')}
              className="bg-white hover:bg-cyan-50/70 border-2 border-slate-200/80 hover:border-cyan-500 p-5 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Truck className="w-7 h-7" />
              </div>
              <span className="font-extrabold text-slate-900 text-base">Driver</span>
              <span className="text-xs text-slate-500 mt-0.5">Collect &amp; Transport</span>
            </button>

            {/* Treatment Plant */}
            <button
              id="role-preview-plant"
              onClick={() => openLoginWithHint('plant01')}
              className="bg-white hover:bg-amber-50/70 border-2 border-slate-200/80 hover:border-amber-500 p-5 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Factory className="w-7 h-7" />
              </div>
              <span className="font-extrabold text-slate-900 text-base">Treatment Plant</span>
              <span className="text-xs text-slate-500 mt-0.5">Weigh &amp; Treat</span>
            </button>

            {/* Admin */}
            <button
              id="role-preview-admin"
              onClick={() => openLoginWithHint('admin01')}
              className="bg-white hover:bg-purple-50/70 border-2 border-slate-200/80 hover:border-purple-500 p-5 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <span className="font-extrabold text-slate-900 text-base">Admin</span>
              <span className="text-xs text-slate-500 mt-0.5">Operations &amp; Audit</span>
            </button>
          </div>
        </div>

        {/* 5-Step Process Illustration */}
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            How MedTrack Works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2 items-center">
            {/* Step 1 */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                <Package className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-500">1</span>
              <span className="text-sm font-bold text-slate-900">Segregate</span>
            </div>

            <div className="text-slate-300 hidden sm:block">
              <ArrowRight className="w-5 h-5 mx-auto" />
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                <QrCode className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-500">2</span>
              <span className="text-sm font-bold text-slate-900">QR Tag</span>
            </div>

            <div className="text-slate-300 hidden sm:block">
              <ArrowRight className="w-5 h-5 mx-auto" />
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-2">
                <Truck className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-500">3</span>
              <span className="text-sm font-bold text-slate-900">Transit</span>
            </div>

            <div className="text-slate-300 hidden sm:block">
              <ArrowRight className="w-5 h-5 mx-auto" />
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-2">
                <Flame className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-500">4</span>
              <span className="text-sm font-bold text-slate-900">Treat</span>
            </div>

            <div className="text-slate-300 hidden sm:block">
              <ArrowRight className="w-5 h-5 mx-auto" />
            </div>

            {/* Step 5 */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-emerald-600">5</span>
              <span className="text-sm font-bold text-emerald-900">Manifest</span>
            </div>
          </div>
        </div>
      </main>

      {/* Production Authentication & Registration Modal */}
      <AuthModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        initialTab={modalInitialTab}
        initialUsername={modalInitialUsername}
        onSuccess={() => {
          setShowLoginModal(false);
          onLoginSuccess?.();
        }}
      />
    </div>
  );
};
