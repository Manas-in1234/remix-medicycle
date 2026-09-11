import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  ShieldCheck,
  Bell,
  QrCode,
  RotateCcw,
  User,
  LogIn,
  ExternalLink,
  ChevronDown,
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
  const { currentUser, switchDemoRole, logout } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const handleResetData = () => {
    store.resetToDemoSeed();
    setResetConfirm(true);
    setTimeout(() => setResetConfirm(false), 2000);
  };

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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
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
              onClick={onOpenScanner}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Scan QR Code"
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
          )}

          {/* Notifications */}
          <button
            onClick={onOpenNotifications}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Role Pill & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${roleInfo.bg}`}
            >
              <span>{roleInfo.label}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Switch Workspace
                </p>
                <button
                  onClick={() => {
                    switchDemoRole('HOSPITAL');
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
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
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
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
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
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
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
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
                  className="w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>{resetConfirm ? 'Data Reset!' : 'Reset Demo Data'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Profile Trigger */}
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              title="Profile & Settings"
            >
              <User className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
