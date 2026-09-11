import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { store } from '../../services/store';
import { PickupRequest, WasteCategoryCode } from '../../types';
import {
  Factory,
  QrCode,
  CheckCircle2,
  Play,
  Check,
  RefreshCw,
  Scale,
  Building2,
  Flame,
  ArrowLeft,
  Minus,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface PlantDashboardProps {
  onOpenQrModal: (req: PickupRequest) => void;
  onOpenScanner: (req: PickupRequest) => void;
  currentNav?: 'HOME' | 'WASTE' | 'PICKUP' | 'REPORTS' | 'PROFILE';
  onNavChange?: (nav: 'HOME' | 'WASTE' | 'PICKUP' | 'REPORTS' | 'PROFILE') => void;
}

export const PlantDashboard: React.FC<PlantDashboardProps> = ({
  onOpenQrModal,
  onOpenScanner,
  currentNav,
  onNavChange,
}) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const plant = store.treatmentPlants[0] || {
    plantId: 'tp-01',
    name: 'AP Medical Waste Treatment Facility',
    operatorName: 'AP Bio-Clean Environmental Solutions',
    address: 'Auto Nagar Industrial Area, Vijayawada, AP',
    capacityKgPerDay: 5000,
    incineratorOperatingTempC: 1050,
    autoclavePressurePsi: 32,
    shredderOperational: true,
    emissionIndexPpm: 14.2,
    latitude: 16.502,
    longitude: 80.685,
  };

  // View state: 'HOME' | 'INCOMING_LIST' | 'COMPLETED_LIST' | 'TREATMENT_FLOW'
  const [activeTab, setActiveTab] = useState<'HOME' | 'INCOMING' | 'COMPLETED'>('HOME');
  const [selectedConsignment, setSelectedConsignment] = useState<PickupRequest | null>(null);
  const [actualWeightKg, setActualWeightKg] = useState<number>(18);
  const [treatmentMethod, setTreatmentMethod] = useState<
    'HIGH_TEMP_INCINERATION' | 'AUTOCLAVING_SHREDDING'
  >('HIGH_TEMP_INCINERATION');

  // Groups
  const incomingList = store.pickupRequests.filter(
    (r) =>
      r.status === 'IN_TRANSIT' ||
      r.status === 'PLANT_ARRIVED' ||
      r.status === 'PLANT_RECEIVED' ||
      r.status === 'UNDER_TREATMENT'
  );

  const receivedList = store.pickupRequests.filter(
    (r) => r.status === 'PLANT_RECEIVED' || r.status === 'UNDER_TREATMENT'
  );

  const completedList = store.pickupRequests.filter(
    (r) => r.status === 'TREATED' || r.status === 'CLOSED'
  );

  // Sync with sidebar navigation
  useEffect(() => {
    if (currentNav === 'HOME') {
      setActiveTab('HOME');
      setSelectedConsignment(null);
    } else if (currentNav === 'WASTE') {
      setActiveTab('INCOMING');
      setSelectedConsignment(null);
    } else if (currentNav === 'PICKUP') {
      if (incomingList.length > 0) {
        setSelectedConsignment(incomingList[0]);
        setActualWeightKg(incomingList[0].totalWeightKg);
      } else {
        setActiveTab('INCOMING');
        setSelectedConsignment(null);
      }
    } else if (currentNav === 'REPORTS') {
      setActiveTab('COMPLETED');
      setSelectedConsignment(null);
    }
  }, [currentNav]);

  const handleOpenTreatment = (req: PickupRequest) => {
    setSelectedConsignment(req);
    setActualWeightKg(req.totalWeightKg);
  };

  const handleReceiveWaste = () => {
    if (!selectedConsignment) return;
    store.receiveWasteAtPlant(
      selectedConsignment.requestId,
      actualWeightKg,
      currentUser?.uid || 'usr-plant-01',
      currentUser?.name || 'Plant Operator'
    );
    const updated = store.pickupRequests.find(
      (r) => r.requestId === selectedConsignment.requestId
    );
    if (updated) setSelectedConsignment({ ...updated });
  };

  const handleStartTreatment = () => {
    if (!selectedConsignment) return;
    store.startTreatment(
      selectedConsignment.requestId,
      treatmentMethod,
      currentUser?.uid || 'usr-plant-01',
      currentUser?.name || 'Plant Operator'
    );
    const updated = store.pickupRequests.find(
      (r) => r.requestId === selectedConsignment.requestId
    );
    if (updated) setSelectedConsignment({ ...updated });
  };

  const handleCompleteTreatment = () => {
    if (!selectedConsignment) return;
    store.completeTreatment(
      selectedConsignment.requestId,
      currentUser?.uid || 'usr-plant-01',
      currentUser?.name || 'Plant Operator'
    );
    const updated = store.pickupRequests.find(
      (r) => r.requestId === selectedConsignment.requestId
    );
    if (updated) setSelectedConsignment({ ...updated });
  };

  const handleCloseConsignment = () => {
    if (!selectedConsignment) return;
    store.disposeAndCloseConsignment(
      selectedConsignment.requestId,
      currentUser?.uid || 'usr-plant-01',
      currentUser?.name || 'Plant Operator',
      'Inert ash encapsulated in engineered landfill.'
    );
    setSelectedConsignment(null);
  };

  // ==========================================
  // 18. TREATMENT SCREEN (Section 18)
  // ==========================================
  if (selectedConsignment) {
    const req = selectedConsignment;
    const isReceived =
      req.status === 'PLANT_RECEIVED' ||
      req.status === 'UNDER_TREATMENT' ||
      req.status === 'TREATED' ||
      req.status === 'CLOSED';

    const isUnderTreatment =
      req.status === 'UNDER_TREATMENT' ||
      req.status === 'TREATED' ||
      req.status === 'CLOSED';

    const isTreated = req.status === 'TREATED' || req.status === 'CLOSED';
    const isClosed = req.status === 'CLOSED';

    // Categories present
    const categories: WasteCategoryCode[] = ['YELLOW', 'RED', 'WHITE', 'BLUE'];

    return (
      <div className="max-w-md mx-auto w-full space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedConsignment(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 p-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-xs font-mono font-bold text-slate-500">
            {req.consignmentId}
          </span>
        </div>

        {/* Consignment Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Waste Consignment
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              🏥 {req.hospitalName}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Bags
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {req.totalBagsCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Weight
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {req.totalWeightKg} <span className="text-xs font-bold text-slate-400">kg</span>
              </p>
            </div>
          </div>

          {/* Categories 4 chips (Section 18) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-center">
              Categories
            </span>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-amber-400 text-amber-950 p-2.5 rounded-xl text-center font-black text-xs">
                🟨 Yellow
              </div>
              <div className="bg-rose-500 text-white p-2.5 rounded-xl text-center font-black text-xs">
                🟥 Red
              </div>
              <div className="bg-slate-100 text-slate-800 border border-slate-200 p-2.5 rounded-xl text-center font-black text-xs">
                ⬜ White
              </div>
              <div className="bg-blue-500 text-white p-2.5 rounded-xl text-center font-black text-xs">
                🟦 Blue
              </div>
            </div>
          </div>

          {/* Sequential Step Action Buttons (Section 18) */}
          <div className="space-y-3 pt-2">
            {/* Step 1: RECEIVE WASTE */}
            {!isReceived ? (
              <button
                onClick={handleReceiveWaste}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                <span>✅ RECEIVE WASTE</span>
              </button>
            ) : !isUnderTreatment ? (
              /* Step 2: START TREATMENT */
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 text-center">
                  ✅ Consignment Received on Weighbridge ({actualWeightKg} kg)
                </div>
                <button
                  onClick={handleStartTreatment}
                  className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>▶ START TREATMENT</span>
                </button>
              </div>
            ) : !isTreated ? (
              /* Step 3: COMPLETE */
              <div className="space-y-3">
                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-xs font-bold text-cyan-800 text-center flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-600" />
                  <span>Thermal Autoclaving &amp; Shredding in Progress</span>
                </div>
                <button
                  onClick={handleCompleteTreatment}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  <span>✅ COMPLETE</span>
                </button>
              </div>
            ) : !isClosed ? (
              /* Step 4: CLOSE CONSIGNMENT */
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 text-center">
                  ✅ Biological Neutralization Complete
                </div>
                <button
                  onClick={handleCloseConsignment}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Factory className="w-5 h-5 text-emerald-400" />
                  <span>♻️ CLOSE CONSIGNMENT</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-100 rounded-2xl text-center text-xs font-bold text-emerald-900">
                Consignment completed and archived in CPCB regulatory ledger.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 17. TREATMENT PLANT HOME (Section 17)
  // ==========================================
  return (
    <div className="max-w-md mx-auto w-full space-y-6 pb-8">
      {/* Top Greeting */}
      <div className="text-center sm:text-left pt-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Treatment Plant ♻️
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {plant.name} &bull; Capacity: {plant.capacityKgPerDay} kg/day
        </p>
      </div>

      {/* Top Cards: Incoming, Received, Completed (Section 17) */}
      <div className="grid grid-cols-3 gap-3">
        <div
          onClick={() => setActiveTab('INCOMING')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center cursor-pointer hover:border-amber-400 transition-colors"
        >
          <p className="text-xs font-bold text-slate-500">Incoming</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {incomingList.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">In transit</p>
        </div>

        <div
          onClick={() => setActiveTab('INCOMING')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center cursor-pointer hover:border-cyan-400 transition-colors"
        >
          <p className="text-xs font-bold text-slate-500">Received</p>
          <p className="text-2xl font-black text-cyan-600 mt-1">
            {receivedList.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">At dock</p>
        </div>

        <div
          onClick={() => setActiveTab('COMPLETED')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center cursor-pointer hover:border-emerald-400 transition-colors"
        >
          <p className="text-xs font-bold text-slate-500">{t('completed', 'Completed')}</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {completedList.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{t('treatment', 'Treated')}</p>
        </div>
      </div>

      {/* Main Actions (Section 17) */}
      <div className="space-y-3">
        {/* SCAN WASTE */}
        <button
          onClick={() => onOpenScanner(incomingList[0] || store.pickupRequests[0])}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <QrCode className="w-5 h-5" />
          <span>📷 {t('scanWasteBag', 'SCAN WASTE')}</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          {/* INCOMING */}
          <button
            onClick={() => setActiveTab(activeTab === 'INCOMING' ? 'HOME' : 'INCOMING')}
            className={`py-3.5 px-4 font-bold text-sm rounded-2xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'INCOMING'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
            }`}
          >
            <span>📋 {t('pending', 'INCOMING')}</span>
          </button>

          {/* COMPLETED */}
          <button
            onClick={() => setActiveTab(activeTab === 'COMPLETED' ? 'HOME' : 'COMPLETED')}
            className={`py-3.5 px-4 font-bold text-sm rounded-2xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'COMPLETED'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
            }`}
          >
            <span>✅ {t('completed', 'COMPLETED')}</span>
          </button>
        </div>
      </div>

      {/* Consignment Queue Cards */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-slate-700 px-1">
          {activeTab === 'COMPLETED' ? 'Completed Consignments' : 'Active Intake Queue'}
        </h3>

        {(activeTab === 'COMPLETED' ? completedList : incomingList).map((req) => (
          <div
            key={req.requestId}
            onClick={() => handleOpenTreatment(req)}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between gap-4 cursor-pointer group"
          >
            <div>
              <span className="font-extrabold text-slate-900 text-sm block">
                🏥 {req.hospitalName}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                {req.totalWeightKg} kg &bull; {req.totalBagsCount} bags &bull;{' '}
                <span className="font-mono text-[11px] text-slate-600">
                  {req.consignmentId}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white rounded-xl text-xs font-bold text-slate-700 transition-colors">
                PROCESS
              </span>
            </div>
          </div>
        ))}

        {(activeTab === 'COMPLETED' ? completedList : incomingList).length === 0 && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center space-y-2">
            <span className="text-3xl">✅</span>
            <p className="text-sm font-bold text-slate-700">All clear</p>
            <p className="text-xs text-slate-400">No consignments waiting in this queue.</p>
          </div>
        )}
      </div>
    </div>
  );
};
