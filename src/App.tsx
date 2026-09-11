import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { store } from './services/store';
import { PickupRequest, SUPPORTED_LANGUAGES, LanguageCode } from './types';
import { Header } from './components/common/Header';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { QrCodeModal } from './components/common/QrCodeModal';
import { QrScannerModal } from './components/common/QrScannerModal';
import { MapModal } from './components/common/MapModal';
import { ChainOfCustodyTimeline } from './components/common/ChainOfCustodyTimeline';
import { HospitalDashboard } from './components/hospital/HospitalDashboard';
import { DriverDashboard } from './components/driver/DriverDashboard';
import { PlantDashboard } from './components/plant/PlantDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LandingPage } from './components/landing/LandingPage';
import { LanguageSelectionScreen } from './components/common/LanguageSelectionScreen';
import {
  Home,
  Package,
  Truck,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  RotateCcw,
  LogOut,
  ExternalLink,
  Globe2,
  Check,
} from 'lucide-react';

type NavTab = 'HOME' | 'WASTE' | 'PICKUP' | 'REPORTS' | 'PROFILE';

function AppContent() {
  const { currentUser, switchDemoRole, logout, saveUserLanguage, loading } = useAuth();
  const { language, t } = useLanguage();
  const [, setVersion] = useState(0);

  // Subscribe to store updates so UI refreshes whenever any role takes action
  useEffect(() => {
    return store.subscribe(() => {
      setVersion((v) => v + 1);
    });
  }, []);

  // Global Navigation State
  const [activeNav, setActiveNav] = useState<NavTab>('HOME');
  const [prevNav, setPrevNav] = useState<NavTab>('HOME');

  // Modals state
  const [qrModalReq, setQrModalReq] = useState<PickupRequest | null>(null);
  const [scannerModalReq, setScannerModalReq] = useState<PickupRequest | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [activeMapReq, setActiveMapReq] = useState<PickupRequest | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedTimelineReq, setSelectedTimelineReq] = useState<PickupRequest | null>(null);
  const [showLanding, setShowLanding] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Unread notifications
  const unreadCount = store.notifications.filter((n) => !n.read).length;

  // Scanner handler
  const handleOpenScanner = (req?: PickupRequest) => {
    setScannerModalReq(req || store.pickupRequests[0]);
    setIsScannerOpen(true);
  };

  const handleScanSuccess = (scannedValue: string) => {
    if (!scannerModalReq) return;

    try {
      if (currentUser?.role === 'DRIVER') {
        store.verifyAndCollectWaste(
          scannerModalReq.requestId,
          scannedValue,
          currentUser.uid,
          currentUser.name
        );
        showToast(`Verification Successful! Consignment ${scannerModalReq.consignmentId} is sealed & loaded.`, 'success');
      } else if (currentUser?.role === 'PLANT') {
        showToast(`Consignment ${scannerModalReq.consignmentId} QR verified. Weighbridge scale ready.`, 'success');
      } else {
        showToast(`Scanned token: ${scannedValue}. Consignment verified.`, 'info');
      }
    } catch (err: any) {
      showToast(`Scan Verification: ${err.message || 'Processed.'}`, 'error');
    }
  };

  const handleOpenMap = (req?: PickupRequest) => {
    setActiveMapReq(req || null);
    setIsMapOpen(true);
  };

  // Handle global nav clicks
  const handleNavClick = (tab: NavTab) => {
    if (tab === 'PROFILE') {
      setPrevNav(activeNav === 'PROFILE' ? 'HOME' : activeNav);
      setActiveNav('PROFILE');
      setShowProfileModal(true);
      return;
    }

    setActiveNav(tab);

    if (tab === 'PICKUP' && currentUser?.role === 'ADMIN') {
      handleOpenMap();
    }
  };

  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    if (activeNav === 'PROFILE') {
      setActiveNav(prevNav);
    }
  };

  // 1. If checking auth session
  if (loading) {
    return (
      <div id="app-loading" className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-slate-400 font-medium text-sm">{t('loading', 'Loading MedTrack...')}</div>
      </div>
    );
  }

  // 2. If unauthenticated or explicitly visiting landing page
  if (!currentUser || showLanding) {
    return (
      <LandingPage
        onLoginSuccess={() => {
          setShowLanding(false);
          setActiveNav('HOME');
        }}
      />
    );
  }

  // 3. Language Selection Screen for first-time login without preferred language
  if (!currentUser.language) {
    return (
      <LanguageSelectionScreen
        onCompleted={() => {
          setActiveNav('HOME');
        }}
      />
    );
  }

  return (
    <div id="app-authenticated-root" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white pb-20 md:pb-0">
      {/* Top Header */}
      <Header
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadCount}
        onOpenScanner={() => handleOpenScanner()}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {/* Main Layout: Desktop Navigation Sidebar + Main View */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Desktop Sidebar with translated labels */}
        <aside className="hidden md:flex flex-col items-center py-4 px-2 w-20 bg-white border border-slate-200/80 rounded-3xl shadow-xs shrink-0 self-start sticky top-22 space-y-4">
          <button
            id="sidebar-nav-home"
            onClick={() => handleNavClick('HOME')}
            className={`w-14 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeNav === 'HOME'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={t('home', 'Home')}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5 max-w-[50px] truncate">{t('home', 'Home')}</span>
          </button>

          <button
            id="sidebar-nav-waste"
            onClick={() => handleNavClick('WASTE')}
            className={`w-14 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeNav === 'WASTE'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={t('waste', 'Waste')}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5 max-w-[50px] truncate">{t('waste', 'Waste')}</span>
          </button>

          <button
            id="sidebar-nav-pickup"
            onClick={() => handleNavClick('PICKUP')}
            className={`w-14 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeNav === 'PICKUP'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={t('pickup', 'Pickup')}
          >
            <Truck className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5 max-w-[50px] truncate">{t('pickup', 'Pickup')}</span>
          </button>

          <button
            id="sidebar-nav-reports"
            onClick={() => handleNavClick('REPORTS')}
            className={`w-14 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeNav === 'REPORTS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={t('reports', 'Reports')}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5 max-w-[50px] truncate">{t('reports', 'Reports')}</span>
          </button>

          <button
            id="sidebar-nav-profile"
            onClick={() => handleNavClick('PROFILE')}
            className={`w-14 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeNav === 'PROFILE'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={t('profile', 'Profile')}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5 max-w-[50px] truncate">{t('profile', 'Profile')}</span>
          </button>
        </aside>

        {/* Dynamic Role Dashboard Container */}
        <main className="flex-1 min-w-0">
          {currentUser.role === 'HOSPITAL' && (
            <HospitalDashboard
              onOpenQrModal={(req) => setQrModalReq(req)}
              onOpenMapModal={(req) => handleOpenMap(req)}
              onOpenScanner={() => handleOpenScanner()}
              currentNav={activeNav}
              onNavChange={(nav) => setActiveNav(nav)}
            />
          )}

          {currentUser.role === 'DRIVER' && (
            <DriverDashboard
              onOpenScanner={(req) => handleOpenScanner(req)}
              onOpenMap={(req) => handleOpenMap(req)}
              onOpenQrModal={(req) => setQrModalReq(req)}
              currentNav={activeNav}
              onNavChange={(nav) => setActiveNav(nav)}
            />
          )}

          {currentUser.role === 'PLANT' && (
            <PlantDashboard
              onOpenQrModal={(req) => setQrModalReq(req)}
              onOpenScanner={(req) => handleOpenScanner(req)}
              currentNav={activeNav}
              onNavChange={(nav) => setActiveNav(nav)}
            />
          )}

          {currentUser.role === 'ADMIN' && (
            <AdminDashboard
              onOpenQrModal={(req) => setQrModalReq(req)}
              onOpenMap={() => handleOpenMap()}
              currentNav={activeNav}
              onNavChange={(nav) => setActiveNav(nav)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation with translated labels */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 flex items-center justify-around shadow-lg">
        <button
          id="mobile-nav-home"
          onClick={() => handleNavClick('HOME')}
          className={`flex flex-col items-center p-1.5 transition-colors cursor-pointer ${
            activeNav === 'HOME' ? 'text-emerald-600 font-bold' : 'text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('home', 'Home')}</span>
        </button>

        <button
          id="mobile-nav-waste"
          onClick={() => handleNavClick('WASTE')}
          className={`flex flex-col items-center p-1.5 transition-colors cursor-pointer ${
            activeNav === 'WASTE' ? 'text-emerald-600 font-bold' : 'text-slate-400'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('waste', 'Waste')}</span>
        </button>

        <button
          id="mobile-nav-pickup"
          onClick={() => handleNavClick('PICKUP')}
          className={`flex flex-col items-center p-1.5 transition-colors cursor-pointer ${
            activeNav === 'PICKUP' ? 'text-emerald-600 font-bold' : 'text-slate-400'
          }`}
        >
          <Truck className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('pickup', 'Pickup')}</span>
        </button>

        <button
          id="mobile-nav-profile"
          onClick={() => handleNavClick('PROFILE')}
          className={`flex flex-col items-center p-1.5 transition-colors cursor-pointer ${
            activeNav === 'PROFILE' ? 'text-emerald-600 font-bold' : 'text-slate-400'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('profile', 'Profile')}</span>
        </button>
      </nav>

      {/* Profile & Multilingual Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl p-6 relative border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              id="close-profile-modal-btn"
              onClick={handleCloseProfileModal}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Avatar & Info */}
            <div className="text-center space-y-1">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl font-black">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <h3 className="text-lg font-black text-slate-900">
                {currentUser?.name || 'Authorized Operator'}
              </h3>
              {currentUser?.username && (
                <p className="text-xs font-mono font-bold text-emerald-600">
                  @{currentUser.username}
                </p>
              )}
              <p className="text-xs text-slate-500 font-medium">
                {currentUser?.email || currentUser?.uid}
              </p>
              <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                {currentUser.role} • {currentUser.organizationName || 'MedTrack Network'}
              </div>
            </div>

            {/* Language Selection Setting */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('language', 'Language')}</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-600">
                  {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200/80">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      id={`profile-lang-opt-${lang.code}`}
                      onClick={() => {
                        saveUserLanguage(lang.code);
                        showToast(`${lang.nativeName} (${lang.name}) selected!`, 'success');
                      }}
                      className={`p-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <div className="truncate">
                        <div>{lang.nativeName}</div>
                        <div className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>{lang.name}</div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Switch Roles (Developer / Demo Mode) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                {t('switchRoleTerminal', 'Switch Role Terminal')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    switchDemoRole('HOSPITAL');
                    setShowProfileModal(false);
                    setActiveNav('HOME');
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    currentUser?.role === 'HOSPITAL'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  🏥 Hospital
                </button>
                <button
                  onClick={() => {
                    switchDemoRole('DRIVER');
                    setShowProfileModal(false);
                    setActiveNav('HOME');
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    currentUser?.role === 'DRIVER'
                      ? 'bg-cyan-50 border-cyan-500 text-cyan-800'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  🚚 Driver
                </button>
                <button
                  onClick={() => {
                    switchDemoRole('PLANT');
                    setShowProfileModal(false);
                    setActiveNav('HOME');
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    currentUser?.role === 'PLANT'
                      ? 'bg-amber-50 border-amber-500 text-amber-800'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  ♻️ Plant
                </button>
                <button
                  onClick={() => {
                    switchDemoRole('ADMIN');
                    setShowProfileModal(false);
                    setActiveNav('HOME');
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    currentUser?.role === 'ADMIN'
                      ? 'bg-purple-50 border-purple-500 text-purple-800'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  👑 Admin
                </button>
              </div>
            </div>

            {/* Utility Actions */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  store.resetToDemoSeed();
                  setShowProfileModal(false);
                  showToast(t('resetDemoData', 'Demo data reset successfully!'), 'info');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('resetDemoData', 'Reset Demo Seed Data')}</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setShowLanding(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('returnToLanding', 'Return to Landing Page')}</span>
              </button>

              <button
                onClick={async () => {
                  setShowProfileModal(false);
                  await logout();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>{t('logout', 'Sign Out')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Modals */}
      <QrCodeModal
        request={qrModalReq}
        isOpen={!!qrModalReq}
        onClose={() => setQrModalReq(null)}
      />

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Biomedical Waste QR Scanner"
        subtitle={
          currentUser.role === 'DRIVER'
            ? 'Scan hospital consignment QR code at loading dock'
            : 'Scan driver QR code at weighbridge entrance'
        }
        expectedConsignmentId={scannerModalReq?.consignmentId}
        expectedToken={scannerModalReq?.verificationToken}
        onScanSuccess={handleScanSuccess}
      />

      <MapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        hospitals={store.hospitals}
        drivers={store.drivers}
        vehicles={store.vehicles}
        treatmentPlants={store.treatmentPlants}
        activeRequest={activeMapReq}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={store.notifications}
        onSelectConsignment={(cid) => {
          const r = store.pickupRequests.find((req) => req.consignmentId === cid);
          if (r) setSelectedTimelineReq(r);
        }}
      />

      {/* Chain-of-Custody Timeline Slide-over Modal */}
      {selectedTimelineReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  Chain of Custody Audit
                </h3>
                <p className="text-[11px] font-mono text-emerald-400">
                  {selectedTimelineReq.consignmentId}
                </p>
              </div>
              <button
                onClick={() => setSelectedTimelineReq(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <ChainOfCustodyTimeline request={selectedTimelineReq} />
            </div>

            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono">
                Token: {selectedTimelineReq.verificationToken}
              </span>
              <button
                onClick={() => setQrModalReq(selectedTimelineReq)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Print Manifest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Floating Toast Alert */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 max-w-md w-auto p-4 rounded-2xl shadow-xl border backdrop-blur-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 bg-slate-900 text-white border-slate-700 text-xs font-bold">
          <div className="flex items-center gap-2">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />}
            <span>{toast.text}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
