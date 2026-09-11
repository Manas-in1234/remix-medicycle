import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { SUPPORTED_LANGUAGES, UserRole, LanguageCode } from '../../types';
import {
  ShieldCheck,
  Bell,
  QrCode,
  RotateCcw,
  User,
  ChevronDown,
  Globe2,
  LogOut,
  Check,
} from 'lucide-react';
import { store } from '../../services/store';

interface HeaderProps {
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  onOpenScanner?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  unreadNotificationsCount,
  onOpenScanner,
  onOpenProfile,
}) => {
  const { currentUser, switchDemoRole, logout, saveUserLanguage } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const handleResetData = () => {
    store.resetToDemoSeed();
    setResetConfirm(true);
    setTimeout(() => setResetConfirm(false), 2000);
  };

  const handleSelectLanguage = async (code: LanguageCode) => {
    setShowLangDropdown(false);
    await saveUserLanguage(code);
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'HOSPITAL':
        return { label: '🏥 Hospital', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'DRIVER':
        return { label: '🚚 Driver', bg: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      case 'PLANT':
        return { label: '♻️ Plant', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'ADMIN':
        return { label: '👑 Admin', bg: 'bg-purple-50 text-purple-800 border-purple-200' };
      default:
        return { label: 'User', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(currentUser?.role);

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo */}
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

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Scanner */}
          {onOpenScanner && (
            <button
              id="header-scan-qr-btn"
              onClick={onOpenScanner}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title={t('scanQr', 'Scan QR Code')}
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{t('scanQr', 'Scan QR')}</span>
            </button>
          )}

          {/* Language Switcher Dropdown */}
          <div className="relative">
            <button
              id="header-language-btn"
              onClick={() => {
                setShowLangDropdown(!showLangDropdown);
                setShowRoleDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="Change Language"
            >
              <Globe2 className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{currentLangObj.nativeName}</span>
              <span className="sm:hidden uppercase">{language}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {showLangDropdown && (
              <div
                id="header-language-dropdown"
                className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in space-y-0.5"
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  {t('chooseYourLanguage', 'Select Language')}
                </p>
                {SUPPORTED_LANGUAGES.map((l) => {
                  const isSelected = language === l.code;
                  return (
                    <button
                      key={l.code}
                      onClick={() => handleSelectLanguage(l.code)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{l.nativeName}</div>
                        <div className="text-[10px] text-slate-500">{l.name}</div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notifications */}
          <button
            id="header-notifications-btn"
            onClick={onOpenNotifications}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors relative cursor-pointer"
            title={t('notifications', 'Notifications')}
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Role Pill & Terminal Switcher */}
          <div className="relative">
            <button
              id="header-role-badge-btn"
              onClick={() => {
                setShowRoleDropdown(!showRoleDropdown);
                setShowLangDropdown(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${roleInfo.bg}`}
            >
              <span>{roleInfo.label}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {showRoleDropdown && (
              <div
                id="header-role-dropdown"
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in space-y-1"
              >
                <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{currentUser?.name || 'Operator'}</p>
                  {currentUser?.username && (
                    <p className="text-[11px] text-emerald-600 font-mono font-bold">@{currentUser.username}</p>
                  )}
                  {currentUser?.email && (
                    <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                  )}
                </div>

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  {t('switchRoleTerminal', 'Terminal Role')}
                </p>
                <button
                  onClick={() => {
                    switchDemoRole('HOSPITAL');
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    currentUser?.role === 'HOSPITAL' ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>🏥</span>
                  <span>Hospital</span>
                </button>
                <button
                  onClick={() => {
                    switchDemoRole('DRIVER');
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    currentUser?.role === 'DRIVER' ? 'bg-cyan-50 text-cyan-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>🚚</span>
                  <span>Driver</span>
                </button>
                <button
                  onClick={() => {
                    switchDemoRole('PLANT');
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    currentUser?.role === 'PLANT' ? 'bg-amber-50 text-amber-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>♻️</span>
                  <span>Treatment Plant</span>
                </button>
                <button
                  onClick={() => {
                    switchDemoRole('ADMIN');
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    currentUser?.role === 'ADMIN' ? 'bg-purple-50 text-purple-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>👑</span>
                  <span>Central Admin</span>
                </button>

                <hr className="border-slate-100 my-1" />

                <button
                  onClick={() => {
                    handleResetData();
                    setShowRoleDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>{resetConfirm ? 'Data Reset!' : t('resetDemoData', 'Reset Demo Data')}</span>
                </button>

                <button
                  onClick={() => {
                    setShowRoleDropdown(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3 h-3 text-rose-500" />
                  <span>{t('logout', 'Logout')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Profile Trigger */}
          {onOpenProfile && (
            <button
              id="header-profile-btn"
              onClick={onOpenProfile}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title={t('profile', 'Profile & Settings')}
            >
              <User className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
