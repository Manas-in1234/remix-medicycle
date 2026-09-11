import React, { useState } from 'react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
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
  X,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';

interface LandingPageProps {
  onEnterWorkspace: (role: UserRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterWorkspace }) => {
  const { loginWithGoogle, switchDemoRole } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default or detected role redirect
    const lower = email.toLowerCase();
    if (lower.includes('driver')) {
      onEnterWorkspace('DRIVER');
    } else if (lower.includes('plant')) {
      onEnterWorkspace('PLANT');
    } else if (lower.includes('admin')) {
      onEnterWorkspace('ADMIN');
    } else {
      onEnterWorkspace('HOSPITAL');
    }
    setShowLoginModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Simple Bar */}
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

        <button
          onClick={() => setShowLoginModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-sm transition-all"
        >
          <LogIn className="w-4 h-4" />
          <span>LOGIN</span>
        </button>
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
            Track biomedical waste from hospital to treatment plant.
          </p>

          <div className="pt-3">
            <button
              onClick={() => setShowLoginModal(true)}
              className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-600/25 transition-all inline-flex items-center justify-center gap-2"
            >
              <span>LOGIN</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Visual Cards */}
        <div className="w-full space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Choose Your Workspace
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Hospital */}
            <button
              onClick={() => onEnterWorkspace('HOSPITAL')}
              className="bg-white hover:bg-emerald-50/70 border-2 border-slate-200/80 hover:border-emerald-500 p-5 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
              <span className="font-extrabold text-slate-900 text-base">Hospital</span>
              <span className="text-xs text-slate-500 mt-0.5">Book &amp; Handover</span>
            </button>

            {/* Driver */}
            <button
              onClick={() => onEnterWorkspace('DRIVER')}
              className="bg-white hover:bg-cyan-50/70 border-2 border-slate-200/80 hover:border-cyan-500 p-5 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Truck className="w-7 h-7" />
              </div>
              <span className="font-extrabold text-slate-900 text-base">Driver</span>
              <span className="text-xs text-slate-500 mt-0.5">Collect &amp; Transport</span>
            </button>

            {/* Treatment Plant */}
            <button
              onClick={() => onEnterWorkspace('PLANT')}
              className="bg-white hover:bg-amber-50/70 border-2 border-slate-200/80 hover:border-amber-500 p-5 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Factory className="w-7 h-7" />
              </div>
              <span className="font-extrabold text-slate-900 text-base">Treatment Plant</span>
              <span className="text-xs text-slate-500 mt-0.5">Weigh &amp; Treat</span>
            </button>

            {/* Admin */}
            <button
              onClick={() => onEnterWorkspace('ADMIN')}
              className="bg-white hover:bg-purple-50/70 border-2 border-slate-200/80 hover:border-purple-500 p-5 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <span className="font-extrabold text-slate-900 text-base">Admin</span>
              <span className="text-xs text-slate-500 mt-0.5">Operations &amp; Audit</span>
            </button>
          </div>
        </div>

        {/* Simple 5-Step Process Illustration */}
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            How It Works
          </h2>

          {/* 5-step flow */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2 items-center">
            {/* Step 1 */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                <Package className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-500">1</span>
              <span className="text-sm font-bold text-slate-900">Waste</span>
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
              <span className="text-sm font-bold text-slate-900">Scan</span>
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
              <span className="text-sm font-bold text-slate-900">Pickup</span>
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
              <span className="text-sm font-bold text-emerald-900">Done</span>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Login Modal (Section 6) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 sm:p-8 relative border border-slate-200">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Centered Logo */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                MEDI<span className="text-emerald-600">CYCLE</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials to access your terminal
              </p>
            </div>

            {/* Simple Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hospital.org"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setForgotSent(true)}
                  className="text-xs text-slate-500 hover:text-emerald-600 underline font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {forgotSent && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 text-center font-medium">
                  Password reset link sent to your registered email.
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all"
              >
                LOGIN
              </button>
            </form>

            {/* Quick Demo Role Jump */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Or Quick Access As
              </p>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                <button
                  onClick={() => {
                    onEnterWorkspace('HOSPITAL');
                    setShowLoginModal(false);
                  }}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 transition-colors"
                >
                  🏥 Hospital
                </button>
                <button
                  onClick={() => {
                    onEnterWorkspace('DRIVER');
                    setShowLoginModal(false);
                  }}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-cyan-100 text-slate-700 hover:text-cyan-800 transition-colors"
                >
                  🚚 Driver
                </button>
                <button
                  onClick={() => {
                    onEnterWorkspace('PLANT');
                    setShowLoginModal(false);
                  }}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 transition-colors"
                >
                  ♻️ Plant
                </button>
                <button
                  onClick={() => {
                    onEnterWorkspace('ADMIN');
                    setShowLoginModal(false);
                  }}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 transition-colors"
                >
                  👑 Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
