import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../services/store';
import { PickupRequest } from '../../types';
import { formatISTDateTime } from '../../lib/dateUtils';
import {
  Truck,
  Building2,
  MapPin,
  QrCode,
  CheckCircle2,
  Navigation,
  Check,
  Package,
  ArrowRight,
  ArrowLeft,
  Factory,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface DriverDashboardProps {
  onOpenScanner: (req: PickupRequest) => void;
  onOpenMap: (req: PickupRequest) => void;
  onOpenQrModal: (req: PickupRequest) => void;
  currentNav?: 'HOME' | 'WASTE' | 'PICKUP' | 'REPORTS' | 'PROFILE';
  onNavChange?: (nav: 'HOME' | 'WASTE' | 'PICKUP' | 'REPORTS' | 'PROFILE') => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({
  onOpenScanner,
  onOpenMap,
  onOpenQrModal,
  currentNav,
  onNavChange,
}) => {
  const { currentUser } = useAuth();

  // Find driver & vehicle
  const driver =
    store.drivers.find((d) => d.driverId === currentUser?.uid) ||
    store.drivers[0] || {
      driverId: 'drv-01',
      name: 'Ramesh Babu',
      phone: '+91 98480 12345',
      status: 'ACTIVE' as const,
      vehicleId: 'veh-01',
      currentLocation: { lat: 16.5062, lng: 80.648 },
    };
  const vehicle =
    store.vehicles.find((v) => v.vehicleId === driver?.vehicleId) ||
    store.vehicles[0] || {
      vehicleId: 'veh-01',
      vehicleNumber: 'AP 16 TJ 2044',
      model: 'Tata Ace Bio-Hauler',
      capacityKg: 1200,
      currentLoadKg: 0,
      status: 'AVAILABLE' as const,
      gpsTrackerId: 'GPS-AP16-01',
      batteryPercent: 88,
    };

  // Requests assigned or open for this driver
  const assignedRequests = store.pickupRequests.filter(
    (r) =>
      r.assignment?.driverId === driver?.driverId ||
      r.status === 'READY_FOR_ASSIGNMENT' ||
      r.status === 'DRIVER_ASSIGNED' ||
      r.status === 'DRIVER_ACCEPTED' ||
      r.status === 'PICKUP_IN_PROGRESS' ||
      r.status === 'PICKED_UP' ||
      r.status === 'IN_TRANSIT' ||
      r.status === 'PLANT_ARRIVED'
  );

  // Active non-closed job
  const activeRequest = assignedRequests.find((r) => r.status !== 'CLOSED' && r.status !== 'TREATED');
  const [selectedReq, setSelectedReq] = useState<PickupRequest | null>(activeRequest || null);
  const [showDailyReports, setShowDailyReports] = useState<boolean>(currentNav === 'REPORTS');

  // React to sidebar navigation clicks
  useEffect(() => {
    if (currentNav === 'HOME') {
      setShowDailyReports(false);
      setSelectedReq(null);
    } else if (currentNav === 'WASTE') {
      setShowDailyReports(false);
      setSelectedReq(activeRequest || assignedRequests[0] || null);
    } else if (currentNav === 'PICKUP') {
      setShowDailyReports(false);
      const reqToMap = selectedReq || activeRequest || assignedRequests[0];
      if (reqToMap) {
        onOpenMap(reqToMap);
      }
    } else if (currentNav === 'REPORTS') {
      setShowDailyReports(true);
    }
  }, [currentNav]);

  // Quick action handlers
  const handleAccept = (req: PickupRequest) => {
    store.acceptPickup(req.requestId, driver.driverId, driver.name);
    const updated = store.pickupRequests.find((r) => r.requestId === req.requestId);
    setSelectedReq(updated ? { ...updated } : null);
  };

  const handleStartPickup = (req: PickupRequest) => {
    store.startPickup(req.requestId, driver.driverId, driver.name);
    const updated = store.pickupRequests.find((r) => r.requestId === req.requestId);
    setSelectedReq(updated ? { ...updated } : null);
  };

  const handleCollectWaste = (req: PickupRequest) => {
    store.verifyAndCollectWaste(
      req.requestId,
      req.verificationToken,
      driver.driverId,
      driver.name
    );
    const updated = store.pickupRequests.find((r) => r.requestId === req.requestId);
    setSelectedReq(updated ? { ...updated } : null);
  };

  const handleGoToPlant = (req: PickupRequest) => {
    store.startTransitToPlant(req.requestId, driver.driverId, driver.name);
    const updated = store.pickupRequests.find((r) => r.requestId === req.requestId);
    setSelectedReq(updated ? { ...updated } : null);
  };

  const handleDeliverAtPlant = (req: PickupRequest) => {
    store.arriveAtPlant(req.requestId, driver.driverId, driver.name);
    const updated = store.pickupRequests.find((r) => r.requestId === req.requestId);
    setSelectedReq(updated ? { ...updated } : null);
  };

  // State determination:
  // Is driver currently in delivery phase (waste already collected)?
  const isWasteCollected =
    selectedReq?.status === 'PICKED_UP' ||
    selectedReq?.status === 'IN_TRANSIT';

  const isDelivered =
    selectedReq?.status === 'PLANT_ARRIVED' ||
    selectedReq?.status === 'PLANT_RECEIVED' ||
    selectedReq?.status === 'UNDER_TREATMENT' ||
    selectedReq?.status === 'TREATED';

  // ==========================================
  // DRIVER TRIP LOGS / DAILY SUMMARY (REPORTS)
  // ==========================================
  if (showDailyReports) {
    const completedTrips = assignedRequests.filter(
      (r) => r.status === 'PLANT_ARRIVED' || r.status === 'PLANT_RECEIVED' || r.status === 'UNDER_TREATMENT' || r.status === 'TREATED' || r.status === 'CLOSED'
    );
    const totalCollectedKg = assignedRequests
      .filter((r) => r.status !== 'REQUESTED' && r.status !== 'READY_FOR_ASSIGNMENT' && r.status !== 'DRIVER_ASSIGNED')
      .reduce((sum, r) => sum + (r.totalWeightKg || 0), 0);

    return (
      <div className="max-w-md mx-auto w-full space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setShowDailyReports(false);
              onNavChange?.('HOME');
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 p-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Driver Home</span>
          </button>
          <span className="text-xs font-bold text-slate-500">Daily Log</span>
        </div>

        {/* Driver Summary Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Trip Logs &amp; Summary
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Vehicle: {vehicle.vehicleNumber} &bull; {driver.name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Lifted
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {totalCollectedKg.toFixed(1)} <span className="text-xs font-bold text-slate-400">kg</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Delivered
              </p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">
                {completedTrips.length} <span className="text-xs font-bold text-slate-400">runs</span>
              </p>
            </div>
          </div>
        </div>

        {/* Trip Entries */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700 px-1">Completed &amp; Active Runs</h3>
          {assignedRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-xs text-slate-400">
              No trips recorded for today yet.
            </div>
          ) : (
            assignedRequests.map((req) => (
              <div
                key={req.requestId}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🏥</span>
                    <span className="font-extrabold text-slate-900 text-xs">
                      {req.hospitalName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {formatISTDateTime(req.createdAt)} &bull; {req.totalWeightKg} kg &bull; {req.totalBagsCount} Bags
                  </p>
                  <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {req.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setShowDailyReports(false);
                    setSelectedReq(req);
                    onNavChange?.('WASTE');
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 16. DRIVER DELIVERY SCREEN (Section 16)
  // ==========================================
  if (selectedReq && (isWasteCollected || isDelivered)) {
    return (
      <div className="max-w-md mx-auto w-full space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedReq(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 p-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Pickups</span>
          </button>
          <span className="text-xs font-mono font-bold text-slate-500">
            {selectedReq.consignmentId}
          </span>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isDelivered ? '✅ Delivered' : '✅ Waste collected'}
            </h2>
            <p className="text-xs text-slate-500">
              {isDelivered
                ? 'Consignment arrived at Common Bio-Treatment Facility.'
                : 'All bags verified, barcoded & sealed in vehicle.'}
            </p>
          </div>

          {/* Plant Destination Info */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Factory className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Maridi Bio-Industries Facility</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1">
              <span>Distance: 8.4 km</span>
              <span>ETA: 14 mins</span>
            </div>
          </div>

          {/* Actions */}
          {!isDelivered ? (
            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  handleGoToPlant(selectedReq);
                  onOpenMap(selectedReq);
                }}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Navigation className="w-5 h-5" />
                <span>🗺️ GO TO PLANT</span>
              </button>

              <button
                onClick={() => onOpenScanner(selectedReq)}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>📷 SCAN PLANT QR</span>
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                Consignment successfully handed over to plant operator for treatment.
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="w-full mt-3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-2xl transition-all"
              >
                Return to Next Pickup
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 15. DRIVER PICKUP SCREEN (Section 15)
  // ==========================================
  if (selectedReq && (selectedReq.status === 'DRIVER_ACCEPTED' || selectedReq.status === 'PICKUP_IN_PROGRESS')) {
    const isEnRoute = selectedReq.status === 'PICKUP_IN_PROGRESS';

    return (
      <div className="max-w-md mx-auto w-full space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedReq(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 p-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Pickups</span>
          </button>
          <span className="text-xs font-mono font-bold text-slate-500">
            {selectedReq.consignmentId}
          </span>
        </div>

        {/* Hospital Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              🏥 {selectedReq.hospitalName}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {selectedReq.hospitalAddress}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                📍 Distance
              </p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                4.2 km
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                ⏱ ETA
              </p>
              <p className="text-xl font-black text-cyan-600 mt-0.5">
                12 min
              </p>
            </div>
          </div>

          {/* Action Buttons (Section 15) */}
          <div className="space-y-3 pt-2">
            {!isEnRoute ? (
              <button
                onClick={() => {
                  handleStartPickup(selectedReq);
                  onOpenMap(selectedReq);
                }}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Navigation className="w-5 h-5" />
                <span>🗺️ START NAVIGATION</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenScanner(selectedReq)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <QrCode className="w-5 h-5" />
                <span>📷 SCAN QR</span>
              </button>
            )}

            {/* Waste Verified Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Total Bags:</span>
                <span className="font-extrabold text-slate-900">
                  {selectedReq.totalBagsCount} bags
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Total Weight:</span>
                <span className="font-extrabold text-slate-900">
                  {selectedReq.totalWeightKg} kg
                </span>
              </div>
            </div>

            {/* Collect Waste Button */}
            <button
              onClick={() => handleCollectWaste(selectedReq)}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5 text-emerald-400" />
              <span>📦 COLLECT WASTE</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 14. DRIVER HOME SCREEN (Section 14)
  // ==========================================
  const activePickupsCount = assignedRequests.filter((r) => r.status !== 'CLOSED').length;

  return (
    <div className="max-w-md mx-auto w-full space-y-6 pb-8">
      {/* Top Greeting */}
      <div className="text-center sm:text-left pt-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Hello, {driver?.name ? driver.name.split(' ')[0] : 'Driver'} 👋
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Vehicle: {vehicle?.vehicleNumber || 'Bio-Hauler'} &bull; Bio-Logistics Unit
        </p>
      </div>

      {/* Large Status Card (Section 14) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center mx-auto">
          <Truck className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900">
            🚚 {activePickupsCount} pickups today
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Current payload: {vehicle.currentLoadKg} / {vehicle.capacityKg} kg
          </p>
        </div>

        {/* Main Action Button */}
        <div>
          <button
            onClick={() => {
              const next = assignedRequests.find((r) => r.status !== 'CLOSED');
              if (next) setSelectedReq(next);
            }}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
          >
            <span>START NEXT PICKUP</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Today's Pickups List (Section 14) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 px-1">
          Today's Pickups
        </h3>

        {assignedRequests.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center space-y-2">
            <span className="text-3xl">🚚</span>
            <p className="text-sm font-bold text-slate-700">No pickup yet</p>
            <p className="text-xs text-slate-400">All assigned jobs completed.</p>
          </div>
        ) : (
          assignedRequests.map((req) => (
            <div
              key={req.requestId}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🏥</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {req.hospitalName}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span>4.2 km</span>
                  <span>&bull;</span>
                  <span>{req.totalWeightKg} kg</span>
                  <span>&bull;</span>
                  <span>{req.totalBagsCount} bags</span>
                </div>
              </div>

              {/* Action */}
              {req.status === 'READY_FOR_ASSIGNMENT' || req.status === 'DRIVER_ASSIGNED' ? (
                <button
                  onClick={() => handleAccept(req)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all"
                >
                  ACCEPT
                </button>
              ) : (
                <button
                  onClick={() => setSelectedReq(req)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl transition-all"
                >
                  OPEN
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
