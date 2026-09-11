import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { store } from './services/store';
import { PickupRequest, UserRole } from './types';
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
  LogIn,
  LogOut,
  ExternalLink,
} from 'lucide-react';

type NavTab = 'HOME' | 'WASTE' | 'PICKUP' | 'REPORTS' | 'PROFILE';

function AppContent() {
  const { currentUser, switchDemoRole, logout, loginWithGoogle } = useAuth();
  const [, setVersion] = useState(0);

  // Subscribe to store updates so UI refreshes whenever any role takes action
  useEffect(() => {
    return store.subscribe(() => {
      setVersion((v) => v + 1);
    });
  }, []);

  // Global Navigation State (Section 4)
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

  if (showLanding) {
    return (
      <LandingPage
        onEnterWorkspace={(role: UserRole) => {
          switchDemoRole(role);
          setShowLanding(false);
          setActiveNav('HOME');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white pb-20 md:pb-0">
      {/* Top Header */}
      <Header
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadCount}
        onOpenScanner={() => handleOpenScanner()}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {/* Main Layout: Small Sidebar (Desktop) + Main View */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Desktop Very Small Sidebar (Section 4) */}
        <aside className="hidden md:flex flex-col items-center py-4 px-2 w-18 bg-white border border-slate-200/80 rounded-3xl shadow-xs shrink-0 self-start sticky top-22 space-y-4">
          <button
            onClick={() => handleNavClick('HOME')}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeNav === 'HOME'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Home"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Home</span>
          </button>

          <button
            onClick={() => handleNavClick('WASTE')}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeNav === 'WASTE'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Waste"
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Waste</span>
          </button>

          <button
            onClick={() => handleNavClick('PICKUP')}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeNav === 'PICKUP'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Pickup"
          >
            <Truck className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Pickup</span>
          </button>

          <button
            onClick={() => handleNavClick('REPORTS')}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeNav === 'REPORTS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Reports"
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Reports</span>
          </button>

          <button
            onClick={() => handleNavClick('PROFILE')}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeNav === 'PROFILE'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Profile"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Profile</span>
          </button>
        </aside>

        {/* Dynamic Role Dashboard Container */}
        <main className="flex-1 min-w-0">
          {currentUser?.role === 'HOSPITAL' && (
            <HospitalDashboard
              onOpenQrModal={(req) => setQrModalReq(req)}
              onOpenMapModal={(req) => handleOpenMap(req)}
              onOpenScanner={() => handleOpenScanner()}
              currentNav={activeNav}
              onNavChange={(nav) => setActiveNav(nav)}
            />
          )}

          {currentUser?.role === 'DRIVER' && (
            <DriverDashboard
              onOpenScanner={(req) => handleOpenScanner(req)}
              onOpenMap={(req) => handleOpenMap(req)}
              onOpenQrModal={(req) => setQrModalReq(req)}
              currentNav={activeNav}
              onNavChange={(nav) => setActiveNav(nav)}
            />
          )}

          {currentUser?.role === 'PLANT' && (
            <PlantDashboard
              onOpenQrModal={(req) => setQrModalReq(req)}
              onOpenScanner={(req) => handleOpenScanner(req)}
              currentNav={activeNav}
              onNavChange={(nav) => setActiveNav(nav)}
            />
          )}

          {currentUser?.role === 'ADMIN' && (
            <AdminDashboard
              onOpenQrModal={(req) => setQrModalReq(req)}
              onOpenMap={() => handleOpenMap()}
              currentNav={activeNav}
              onNavChange={(nav) => setActiveNav(nav)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Section 4) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => handleNavClick('HOME')}
          className={`flex flex-col items-center p-1.5 transition-colors ${
            activeNav === 'HOME' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Home</span>
        </button>

        <button
          onClick={() => handleNavClick('WASTE')}
          className={`flex flex-col items-center p-1.5 transition-colors ${
            activeNav === 'WASTE' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Waste</span>
        </button>

        <button
          onClick={() => handleNavClick('PICKUP')}
          className={`flex flex-col items-center p-1.5 transition-colors ${
            activeNav === 'PICKUP' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <Truck className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Pickup</span>
        </button>

        <button
          onClick={() => handleNavClick('PROFILE')}
          className={`flex flex-col items-center p-1.5 transition-colors ${
            activeNav === 'PROFILE' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Profile</span>
        </button>
      </nav>

      {/* Profile & Switcher Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl p-6 relative border border-slate-200 space-y-5">
            <button
              onClick={handleCloseProfileModal}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl font-black">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <h3 className="text-lg font-black text-slate-900">
                {currentUser?.name || 'Authorized Operator'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {currentUser?.email || 'operator@medicycle.in'}
              </p>
            </div>

            {/* Quick Switch Roles */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                Switch Role Terminal
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    switchDemoRole('HOSPITAL');
                    setShowProfileModal(false);
                    setActiveNav('HOME');
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
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
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
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
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
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
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    currentUser?.role === 'ADMIN'
                      ? 'bg-purple-50 border-purple-500 text-purple-800'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  👑 Admin
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  store.resetToDemoSeed();
                  setShowProfileModal(false);
                  showToast('Demo data reset successfully!', 'info');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Demo Seed Data</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setShowLanding(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Return to Landing Page</span>
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
          currentUser?.role === 'DRIVER'
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
                className="text-slate-400 hover:text-white p-1"
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
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
            className="text-slate-400 hover:text-white p-1"
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
