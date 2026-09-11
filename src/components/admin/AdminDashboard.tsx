import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { store } from '../../services/store';
import { fetchAiWasteForecast } from '../../services/api';
import {
  AiWasteForecast,
  Anomaly,
  PickupRequest,
  SystemSettings,
  WasteCategoryCode,
} from '../../types';
import {
  ShieldCheck,
  Building2,
  Truck,
  Factory,
  Package,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  X,
  FileText,
  Sliders,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardProps {
  onOpenQrModal: (req: PickupRequest) => void;
  onOpenMap: () => void;
  currentNav?: 'HOME' | 'WASTE' | 'PICKUP' | 'REPORTS' | 'PROFILE';
  onNavChange?: (nav: 'HOME' | 'WASTE' | 'PICKUP' | 'REPORTS' | 'PROFILE') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenQrModal,
  onOpenMap,
  currentNav,
  onNavChange,
}) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  // Modal / sub-views
  const [showReports, setShowReports] = useState(currentNav === 'REPORTS');
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  // AI Forecast state (for Reports view)
  const [forecast, setForecast] = useState<AiWasteForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    ...store.settings,
    proximityWeight: store.settings.proximityWeight ?? 0.35,
    anomalyWeightDiffPercent:
      store.settings.anomalyWeightDiffPercent ??
      store.settings.weightMismatchThresholdPercent ??
      5,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Sync with sidebar navigation
  useEffect(() => {
    if (currentNav === 'HOME') {
      setShowReports(false);
    } else if (currentNav === 'WASTE') {
      setShowReports(false);
    } else if (currentNav === 'PICKUP') {
      setShowReports(false);
      onOpenMap();
    } else if (currentNav === 'REPORTS') {
      setShowReports(true);
    }
  }, [currentNav]);

  useEffect(() => {
    if (showReports && !forecast) {
      loadForecast();
    }
  }, [showReports]);

  const loadForecast = async () => {
    setForecastLoading(true);
    try {
      const data = await fetchAiWasteForecast(store.historicalWasteRecords);
      setForecast(data);
    } catch (err) {
      console.warn('Failed to load forecast:', err);
    } finally {
      setForecastLoading(false);
    }
  };

  const handleResolveAnomaly = (anomalyId: string) => {
    store.resolveAnomaly(
      anomalyId,
      resolutionText || 'Investigated and verified against calibrated scale.',
      currentUser?.name || 'Safety Inspector'
    );
    setSelectedAnomaly(null);
    setResolutionText('');
  };

  const handleSaveSettings = () => {
    store.settings = {
      ...store.settings,
      ...settings,
      weightMismatchThresholdPercent: settings.anomalyWeightDiffPercent ?? 5,
    };
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  // Aggregates for the 6 Cards
  const totalHospitals = store.hospitals.length;
  const totalDrivers = store.drivers.length;
  const totalVehicles = store.vehicles.length;
  const totalPickups = store.pickupRequests.length;
  const totalWaste = Math.round(
    store.pickupRequests.reduce((acc, r) => acc + r.totalWeightKg, 0)
  );
  const openAnomalies = store.anomalies.filter((a) => a.status === 'OPEN');

  // Today's Activity (4 metrics)
  const pickedUpCount = store.pickupRequests.filter((r) => r.status === 'PICKED_UP').length;
  const inTransitCount = store.pickupRequests.filter((r) => r.status === 'IN_TRANSIT').length;
  const atPlantCount = store.pickupRequests.filter(
    (r) => r.status === 'PLANT_ARRIVED' || r.status === 'PLANT_RECEIVED' || r.status === 'UNDER_TREATMENT'
  ).length;
  const completedCount = store.pickupRequests.filter(
    (r) => r.status === 'TREATED' || r.status === 'CLOSED'
  ).length;

  // Waste Today Category Breakdown
  const getCatWeight = (cat: WasteCategoryCode) => {
    return Math.round(
      store.pickupRequests.reduce((acc, r) => {
        const bagSum = r.bags
          .filter((b) => b.category === cat || b.confirmedCategory === cat)
          .reduce((bAcc, b) => bAcc + b.weightKg, 0);
        return acc + bagSum;
      }, 0)
    );
  };

  const yellowKg = getCatWeight('YELLOW') || 42;
  const redKg = getCatWeight('RED') || 28;
  const whiteKg = getCatWeight('WHITE') || 14;
  const blueKg = getCatWeight('BLUE') || 9;
  const maxCatWeight = Math.max(yellowKg, redKg, whiteKg, blueKg, 1);

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Operations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Regional Bio-Logistics &amp; Safety Control
          </p>
        </div>

        <button
          onClick={() => setShowReports(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>VIEW REPORTS</span>
        </button>
      </div>

      {/* 6 Large Cards (Section 19) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Hospitals */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Hospitals
          </p>
          <p className="text-3xl font-black text-slate-900 mt-1">
            {totalHospitals}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Active nodes</p>
        </div>

        {/* Drivers */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Drivers
          </p>
          <p className="text-3xl font-black text-cyan-600 mt-1">
            {totalDrivers}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">On shift</p>
        </div>

        {/* Vehicles */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Vehicles
          </p>
          <p className="text-3xl font-black text-slate-900 mt-1">
            {totalVehicles}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">GPS tracked</p>
        </div>

        {/* Pickups */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t('pickup', 'Pickups')}
          </p>
          <p className="text-3xl font-black text-amber-600 mt-1">
            {totalPickups}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{t('collectionDate', 'Logged today')}</p>
        </div>

        {/* Waste */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t('waste', 'Waste')}
          </p>
          <p className="text-3xl font-black text-slate-900 mt-1">
            {totalWaste} <span className="text-xs font-bold text-slate-400">kg</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{t('totalWeight', 'Total weight')}</p>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Alerts
          </p>
          <p className={`text-3xl font-black mt-1 ${openAnomalies.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {openAnomalies.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Requires check</p>
        </div>
      </div>

      {/* ACTIVE MAP Preview (Section 19 & 21) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              ACTIVE MAP
            </h3>
          </div>
          <button
            onClick={onOpenMap}
            className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
          >
            <span>Open Full Map</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Visual Corridor Preview */}
        <div
          onClick={onOpenMap}
          className="w-full h-44 rounded-2xl bg-gradient-to-br from-slate-100 via-blue-50 to-emerald-50 border border-slate-200 p-4 relative overflow-hidden flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 z-10">
            <span className="bg-white/80 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-slate-200/60">
              🏥 NRI &bull; AIIMS Mangalagiri &bull; GGH
            </span>
            <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg shadow-xs">
              🚚 3 Vehicles Live
            </span>
          </div>

          <div className="flex items-center justify-center my-auto z-10">
            <div className="px-4 py-2 rounded-xl bg-white/95 border border-slate-200 shadow-sm text-center group-hover:scale-105 transition-transform">
              <span className="text-xs font-extrabold text-slate-900 block">
                Vijayawada — Guntur Corridor
              </span>
              <span className="text-[11px] text-emerald-600 font-bold">
                Tap to explore real-time GPS routes &amp; checkpoints
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 z-10">
            <span>Plant: Maridi Bio-Industries</span>
            <span>Speed: 38 km/h</span>
          </div>
        </div>
      </div>

      {/* Today's Activity (4 simple metrics) (Section 19) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900">
          Today's Activity
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400">Picked Up</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {pickedUpCount}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400">In Transit</p>
            <p className="text-2xl font-black text-cyan-600 mt-0.5">
              {inTransitCount}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400">At Plant</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">
              {atPlantCount}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400">Completed</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">
              {completedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Waste Today (4 simple visual bars/cards) (Section 19) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900">
          Waste Today
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Yellow */}
          <div className="bg-amber-400 text-amber-950 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-black">
              <span>🟨 Yellow</span>
            </div>
            <p className="text-2xl font-black mt-2">{yellowKg} <span className="text-xs font-bold opacity-75">kg</span></p>
          </div>

          {/* Red */}
          <div className="bg-rose-500 text-white p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-black">
              <span>🟥 Red</span>
            </div>
            <p className="text-2xl font-black mt-2">{redKg} <span className="text-xs font-bold opacity-75">kg</span></p>
          </div>

          {/* White */}
          <div className="bg-slate-100 text-slate-800 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-black text-slate-500">
              <span>⬜ White</span>
            </div>
            <p className="text-2xl font-black mt-2">{whiteKg} <span className="text-xs font-bold text-slate-400">kg</span></p>
          </div>

          {/* Blue */}
          <div className="bg-blue-500 text-white p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-black">
              <span>🟦 Blue</span>
            </div>
            <p className="text-2xl font-black mt-2">{blueKg} <span className="text-xs font-bold opacity-75">kg</span></p>
          </div>
        </div>
      </div>

      {/* ADMIN ALERTS (Section 20) */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 px-1">
          Safety &amp; Compliance Alerts
        </h3>

        {openAnomalies.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-slate-800">No open alerts</p>
            <p className="text-xs text-slate-400">All weight and dispatch handoffs within normal limits.</p>
          </div>
        ) : (
          openAnomalies.map((a) => (
            <div
              key={a.anomalyId}
              className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs flex items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">⚠️</span>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {a.type === 'WEIGHT_MISMATCH'
                      ? 'Weight mismatch'
                      : a.type === 'PICKUP_DELAY'
                      ? 'Pickup delayed'
                      : 'Route deviation'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    {a.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAnomaly(a)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-colors"
              >
                VIEW
              </button>
            </div>
          ))
        )}
      </div>

      {/* Simple Anomaly Resolution Modal */}
      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl p-6 relative border border-slate-200 text-center space-y-4">
            <button
              onClick={() => setSelectedAnomaly(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-3xl">⚠️</span>
            <h3 className="text-lg font-black text-slate-900">
              {selectedAnomaly.type.replace(/_/g, ' ')}
            </h3>
            <p className="text-xs text-slate-600">
              {selectedAnomaly.description}
            </p>

            <textarea
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="Resolution note (e.g. Weighbridge recalibrated)"
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              rows={2}
            />

            <button
              onClick={() => handleResolveAnomaly(selectedAnomaly.anomalyId)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-xs transition-all"
            >
              Resolve Alert
            </button>
          </div>
        </div>
      )}

      {/* Advanced Reports & Settings Modal (Section 19 & 33) */}
      {showReports && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl p-6 sm:p-7 relative border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Reports &amp; Parameters
                </h3>
                <p className="text-xs text-slate-500">
                  AI predictive forecast &amp; system settings
                </p>
              </div>
              <button
                onClick={() => setShowReports(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Forecast Card */}
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2 text-left">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-purple-900">
                  AI Waste Demand Forecast (Next 24h)
                </span>
              </div>
              {forecastLoading ? (
                <div className="flex items-center gap-2 text-xs text-purple-700 py-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating regional predictive models...</span>
                </div>
              ) : forecast ? (
                <div className="space-y-1 text-xs text-purple-900">
                  <p className="font-extrabold">
                    Expected Generation: {forecast.predictedTotalVolumeKg ?? forecast.summary?.totalEstimatedKg ?? 0} kg
                  </p>
                  <p className="text-[11px] opacity-85">
                    {forecast.insights?.[0] || 'Peak surge projected around NRI Hospital wards.'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-purple-700">Forecast ready.</p>
              )}
            </div>

            {/* Smart Dispatch Threshold Settings */}
            <div className="space-y-3 text-left">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Dispatch Weighting
              </span>
              <div className="space-y-2 text-xs font-medium">
                <div>
                  <div className="flex justify-between text-slate-700 mb-1">
                    <span>Proximity Weight</span>
                    <span className="font-bold">{Math.round((settings.proximityWeight ?? 0.35) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={settings.proximityWeight ?? 0.35}
                    onChange={(e) =>
                      setSettings({ ...settings, proximityWeight: parseFloat(e.target.value) })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 mb-1">
                    <span>Weight Anomaly Threshold</span>
                    <span className="font-bold">{settings.anomalyWeightDiffPercent ?? 5}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="1"
                    value={settings.anomalyWeightDiffPercent ?? 5}
                    onChange={(e) =>
                      setSettings({ ...settings, anomalyWeightDiffPercent: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Save Parameters
                </button>
                {settingsSaved && (
                  <span className="text-xs font-bold text-emerald-700">
                    Saved!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
