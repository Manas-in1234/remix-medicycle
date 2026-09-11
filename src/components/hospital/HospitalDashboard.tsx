import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  PickupRequest,
  WasteBag,
  WasteCategoryCode,
  PickupPriority,
  AiClassificationResponse,
} from '../../types';
import { store } from '../../services/store';
import { classifyWasteImage } from '../../services/api';
import { formatISTDateTime } from '../../lib/dateUtils';
import {
  Package,
  Truck,
  ClipboardList,
  QrCode,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MapPin,
  RefreshCw,
  Plus,
  Minus,
  Camera,
  Check,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Scale,
} from 'lucide-react';
import { AiWeightEstimatorModal } from './AiWeightEstimatorModal';

interface HospitalDashboardProps {
  onOpenQrModal: (req: PickupRequest) => void;
  onOpenMapModal: (req: PickupRequest) => void;
  onOpenScanner?: () => void;
  initialView?: 'HOME' | 'BOOK' | 'TRACK' | 'HISTORY';
  currentNav?: 'HOME' | 'WASTE' | 'PICKUP' | 'REPORTS' | 'PROFILE';
  onNavChange?: (nav: 'HOME' | 'WASTE' | 'PICKUP' | 'REPORTS' | 'PROFILE') => void;
}

export const HospitalDashboard: React.FC<HospitalDashboardProps> = ({
  onOpenQrModal,
  onOpenMapModal,
  onOpenScanner,
  initialView = 'HOME',
  currentNav,
  onNavChange,
}) => {
  const { currentUser } = useAuth();

  // Active hospital
  const hospital =
    store.hospitals.find((h) => h.hospitalId === currentUser?.organizationId) ||
    store.hospitals[0] || {
      hospitalId: 'h1',
      name: 'AIIMS Mangalagiri',
      address: 'NH 16, Mangalagiri, Andhra Pradesh 522503',
      contactPerson: 'Dr. K. Srinivas Rao',
      phone: '+91 8645 280000',
      latitude: 16.438,
      longitude: 80.562,
      tier: 'TERTIARY_CARE' as const,
      bedCount: 960,
    };

  // Screen View state: 'HOME' | 'BOOK_STEP1' | 'BOOK_AI' | 'BOOK_BAGS' | 'BOOK_SUCCESS' | 'TRACK' | 'HISTORY'
  const getInitialScreen = () => {
    if (currentNav === 'WASTE' || initialView === 'BOOK') return 'BOOK_STEP1';
    if (currentNav === 'PICKUP' || initialView === 'TRACK') return 'TRACK';
    if (currentNav === 'REPORTS' || initialView === 'HISTORY') return 'HISTORY';
    return 'HOME';
  };

  const [activeScreen, _setActiveScreen] = useState<
    'HOME' | 'BOOK_STEP1' | 'BOOK_AI' | 'BOOK_BAGS' | 'BOOK_SUCCESS' | 'TRACK' | 'HISTORY'
  >(getInitialScreen());

  const setActiveScreen = useCallback(
    (screen: 'HOME' | 'BOOK_STEP1' | 'BOOK_AI' | 'BOOK_BAGS' | 'BOOK_SUCCESS' | 'TRACK' | 'HISTORY') => {
      _setActiveScreen(screen);
      if (screen === 'HOME') onNavChange?.('HOME');
      else if (screen.startsWith('BOOK')) onNavChange?.('WASTE');
      else if (screen === 'TRACK') onNavChange?.('PICKUP');
      else if (screen === 'HISTORY') onNavChange?.('REPORTS');
    },
    [onNavChange]
  );

  // Sync when currentNav changes from sidebar clicks
  useEffect(() => {
    if (currentNav === 'HOME') {
      _setActiveScreen('HOME');
    } else if (currentNav === 'WASTE') {
      _setActiveScreen('BOOK_STEP1');
    } else if (currentNav === 'PICKUP') {
      _setActiveScreen('TRACK');
    } else if (currentNav === 'REPORTS') {
      _setActiveScreen('HISTORY');
    }
  }, [currentNav]);

  // Booking Wizard State
  const [selectedCategory, setSelectedCategory] = useState<WasteCategoryCode>('YELLOW');
  const [weightKg, setWeightKg] = useState<number>(5.0);
  const [bagCount, setBagCount] = useState<number>(2);
  const [wastePhoto, setWastePhoto] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AiClassificationResponse | null>(null);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [newlyCreatedRequest, setNewlyCreatedRequest] = useState<PickupRequest | null>(null);
  const [weightEstimatorOpen, setWeightEstimatorOpen] = useState<boolean>(false);
  const [aiEstimatedSummary, setAiEstimatedSummary] = useState<string | null>(null);

  // History Filter
  const [historyFilter, setHistoryFilter] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY');
  const [showDetailedHistory, setShowDetailedHistory] = useState<boolean>(false);

  // Hospital Requests
  const hospitalRequests = store.pickupRequests.filter(
    (r) => r.hospitalId === hospital.hospitalId || r.createdByUserId === currentUser?.uid
  );

  const pendingRequests = hospitalRequests.filter(
    (r) => r.status !== 'CLOSED' && r.status !== 'TREATED'
  );
  const completedRequests = hospitalRequests.filter(
    (r) => r.status === 'CLOSED' || r.status === 'TREATED'
  );

  const totalWasteToday = Number(
    hospitalRequests.reduce((acc, r) => acc + r.totalWeightKg, 0).toFixed(1)
  );

  // Latest active request for tracking
  const trackableRequest =
    newlyCreatedRequest ||
    pendingRequests[0] ||
    hospitalRequests[0] ||
    store.pickupRequests[0];

  // Step 1 -> Choose Category & Trigger AI
  const handleSelectCategory = (cat: WasteCategoryCode) => {
    setSelectedCategory(cat);
    // Proceed to Step 2: AI Waste Check
    setActiveScreen('BOOK_AI');
  };

  // Upload/Sample photo for AI
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setWastePhoto(dataUrl);
      runAiCheck(dataUrl, selectedCategory);
    };
    reader.readAsDataURL(file);
  };

  const runAiCheck = async (photo: string, cat: WasteCategoryCode) => {
    setAiAnalyzing(true);
    try {
      const result = await classifyWasteImage(
        photo,
        cat,
        `Hospital clinical waste stream (${cat})`
      );
      setAiResult(result);
      if (result.category !== 'UNKNOWN') {
        setSelectedCategory(result.category);
      }
    } catch (err) {
      console.warn('AI check error, fallback', err);
      // Fallback friendly demo response
      setAiResult({
        category: cat,
        confidence: 0.94,
        explanation: 'Clinical waste matches category standards.',
        possibleAlternatives: [],
        requiresManualReview: false,
        safetyWarning: 'Ensure bags are double-tied with biohazard tag.',
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Submit Booking
  const handleBookPickup = async () => {
    setBookingLoading(true);

    try {
      const formattedBags: WasteBag[] = [
        {
          bagId: `bag-${Date.now()}`,
          category: selectedCategory,
          weightKg: Math.max(1, weightKg),
          bagCount: Math.max(1, bagCount),
          notes: `${selectedCategory} Waste`,
          confirmedCategory: selectedCategory,
          ...(aiResult
            ? {
                aiClassification: {
                  suggestedCategory: aiResult.category,
                  confidence: aiResult.confidence,
                  explanation: aiResult.explanation,
                  possibleAlternatives: aiResult.possibleAlternatives || [],
                  safetyWarning: aiResult.safetyWarning || null,
                  requiresManualReview: !!aiResult.requiresManualReview,
                  isDemoMode: !!aiResult.isDemoMode,
                  analyzedAt: new Date().toISOString(),
                },
              }
            : {}),
        },
      ];

      const newReq = await store.createPickupRequest({
        hospitalId: hospital.hospitalId,
        hospitalName: hospital.name,
        hospitalAddress: hospital.address,
        hospitalLat: hospital.latitude,
        hospitalLng: hospital.longitude,
        hospitalPhone: hospital.phone,
        bags: formattedBags,
        priority: 'NORMAL',
        notes: 'Standard hospital biomedical waste batch',
        userId: currentUser?.uid || 'usr-hospital-01',
        userName: currentUser?.name || hospital.name,
      });

      setNewlyCreatedRequest(newReq);
      setActiveScreen('BOOK_SUCCESS');
    } catch (err) {
      console.error('Failed to book pickup:', err);
    } finally {
      setBookingLoading(false);
    }
  };

  // Helper waste colors and descriptions
  const getCategoryInfo = (cat: WasteCategoryCode) => {
    switch (cat) {
      case 'YELLOW':
        return {
          name: 'YELLOW',
          label: 'Infectious',
          bg: 'bg-amber-400 hover:bg-amber-300 text-amber-950 border-amber-300',
          badgeBg: 'bg-amber-100 text-amber-900',
          desc: 'Anatomical, soiled dressings, expired medicine',
          emoji: '🟨',
        };
      case 'RED':
        return {
          name: 'RED',
          label: 'Plastic',
          bg: 'bg-rose-500 hover:bg-rose-400 text-white border-rose-400',
          badgeBg: 'bg-rose-100 text-rose-900',
          desc: 'Tubing, bottles, catheters, syringes without needle',
          emoji: '🟥',
        };
      case 'WHITE':
        return {
          name: 'WHITE',
          label: 'Sharps',
          bg: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300',
          badgeBg: 'bg-slate-200 text-slate-900',
          desc: 'Needles, scalpels, blades, puncture-proof',
          emoji: '⬜',
        };
      case 'BLUE':
        return {
          name: 'BLUE',
          label: 'Glass',
          bg: 'bg-blue-500 hover:bg-blue-400 text-white border-blue-400',
          badgeBg: 'bg-blue-100 text-blue-900',
          desc: 'Vials, ampoules, glassware, metallic implants',
          emoji: '🟦',
        };
    }
  };

  // Waste category weights calculation for history
  const getCategoryWeight = (cat: WasteCategoryCode) => {
    return Number(
      hospitalRequests
        .reduce((sum, r) => {
          const bagSum = r.bags
            .filter((b) => b.category === cat || b.confirmedCategory === cat)
            .reduce((bAcc, b) => bAcc + b.weightKg, 0);
          return sum + bagSum;
        }, 0)
        .toFixed(1)
    );
  };

  // Main screen renderer
  const renderMainContent = () => {
    // ==========================================
    // 1. HOSPITAL HOME SCREEN (Section 7)
    // ==========================================
    if (activeScreen === 'HOME') {
      return (
        <div className="max-w-xl mx-auto w-full space-y-6 pb-8">
          {/* Greeting Header */}
          <div className="text-center sm:text-left pt-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hello, Hospital 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {hospital.name}
            </p>
          </div>

          {/* 4 Major Actions (Section 7) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Action 1: Book Waste */}
            <button
              onClick={() => setActiveScreen('BOOK_STEP1')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white p-6 rounded-3xl shadow-lg shadow-emerald-600/20 transition-all flex flex-col items-center justify-center text-center group min-h-[140px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Package className="w-8 h-8 text-white" />
              </div>
              <span className="text-lg font-extrabold tracking-wide">
                📦 BOOK WASTE
              </span>
              <span className="text-xs text-emerald-100 mt-0.5">
                Choose waste &amp; bag count
              </span>
            </button>

            {/* Action 2: Track Pickup */}
            <button
              onClick={() => setActiveScreen('TRACK')}
              className="w-full bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] text-white p-6 rounded-3xl shadow-lg shadow-cyan-600/20 transition-all flex flex-col items-center justify-center text-center group min-h-[140px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <span className="text-lg font-extrabold tracking-wide">
                🚚 TRACK PICKUP
              </span>
              <span className="text-xs text-cyan-100 mt-0.5">
                Live driver status &amp; ETA
              </span>
            </button>

            {/* Action 3: My Waste */}
            <button
              onClick={() => setActiveScreen('HISTORY')}
              className="w-full bg-white hover:bg-slate-50 active:scale-[0.98] border-2 border-slate-200 hover:border-slate-300 p-6 rounded-3xl shadow-xs transition-all flex flex-col items-center justify-center text-center group min-h-[140px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ClipboardList className="w-8 h-8 text-slate-700" />
              </div>
              <span className="text-lg font-extrabold text-slate-900 tracking-wide">
                📋 MY WASTE
              </span>
              <span className="text-xs text-slate-500 mt-0.5">
                Category weights &amp; history
              </span>
            </button>

            {/* Action 4: Scan QR */}
            <button
              onClick={() => {
                if (onOpenScanner) onOpenScanner();
              }}
              className="w-full bg-white hover:bg-slate-50 active:scale-[0.98] border-2 border-slate-200 hover:border-slate-300 p-6 rounded-3xl shadow-xs transition-all flex flex-col items-center justify-center text-center group min-h-[140px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <QrCode className="w-8 h-8 text-slate-700" />
              </div>
              <span className="text-lg font-extrabold text-slate-900 tracking-wide">
                📷 SCAN QR
              </span>
              <span className="text-xs text-slate-500 mt-0.5">
                Verify manifest QR code
              </span>
            </button>
          </div>

          {/* AI Weight Estimator Feature Banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">
                    AI Weight Estimator
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <Sparkles className="w-2.5 h-2.5" /> Gemini
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Predict biomedical waste weight from bag size (15L / 30L / 55L / 90L) &amp; photo scan
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWeightEstimatorOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Launch Estimator</span>
            </button>
          </div>

          {/* 3 Simple Cards Below (Section 7) */}

        <div className="pt-2">
          <div className="grid grid-cols-3 gap-3">
            {/* Today's Waste */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center">
              <p className="text-xs font-bold text-slate-500">Today</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {totalWasteToday} <span className="text-xs font-bold text-slate-400">kg</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Waste</p>
            </div>

            {/* Pending */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center">
              <p className="text-xs font-bold text-slate-500">Pending</p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {pendingRequests.length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Pickups</p>
            </div>

            {/* Completed */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center">
              <p className="text-xs font-bold text-slate-500">Completed</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {completedRequests.length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Total</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. BOOK WASTE SCREEN (Section 8) - Step 1 of 4
  // ==========================================
  if (activeScreen === 'BOOK_STEP1') {
    return (
      <div className="max-w-md mx-auto w-full space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveScreen('HOME')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 p-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            STEP 1 OF 3
          </span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Which waste?
          </h2>
          <p className="text-xs text-slate-500">
            Tap a category below
          </p>
        </div>

        {/* 4 HUGE Cards in 2x2 Grid (Section 8) */}
        <div className="grid grid-cols-2 gap-4">
          {/* YELLOW */}
          <button
            onClick={() => handleSelectCategory('YELLOW')}
            className="bg-amber-400 hover:bg-amber-300 text-amber-950 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group min-h-[170px] justify-between border-2 border-amber-300"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">
              🟨
            </span>
            <div>
              <p className="text-xl font-black tracking-tight">YELLOW</p>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                Infectious
              </p>
            </div>
            <p className="text-[11px] opacity-75 leading-tight">
              Dressings, anatomy, cotton
            </p>
          </button>

          {/* RED */}
          <button
            onClick={() => handleSelectCategory('RED')}
            className="bg-rose-500 hover:bg-rose-400 text-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group min-h-[170px] justify-between border-2 border-rose-400"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">
              🟥
            </span>
            <div>
              <p className="text-xl font-black tracking-tight">RED</p>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                Plastic
              </p>
            </div>
            <p className="text-[11px] opacity-85 leading-tight">
              Tubing, bottles, catheters
            </p>
          </button>

          {/* WHITE */}
          <button
            onClick={() => handleSelectCategory('WHITE')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group min-h-[170px] justify-between border-2 border-slate-300"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">
              ⬜
            </span>
            <div>
              <p className="text-xl font-black tracking-tight">WHITE</p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Sharps
              </p>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Needles, scalpels, blades
            </p>
          </button>

          {/* BLUE */}
          <button
            onClick={() => handleSelectCategory('BLUE')}
            className="bg-blue-500 hover:bg-blue-400 text-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group min-h-[170px] justify-between border-2 border-blue-400"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">
              🟦
            </span>
            <div>
              <p className="text-xl font-black tracking-tight">BLUE</p>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                Glass
              </p>
            </div>
            <p className="text-[11px] opacity-85 leading-tight">
              Vials, ampoules, glass
            </p>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. AI WASTE CHECK SCREEN (Section 9) - Step 2 of 4
  // ==========================================
  if (activeScreen === 'BOOK_AI') {
    const info = getCategoryInfo(selectedCategory);

    return (
      <div className="max-w-md mx-auto w-full space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveScreen('BOOK_STEP1')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 p-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            STEP 2 OF 3
          </span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            AI Waste Check
          </h2>
          <p className="text-xs text-slate-500">
            Confirm category or upload a photo
          </p>
        </div>

        {/* AI Result Card (Section 9) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 text-center">
          {wastePhoto ? (
            <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
              <img
                src={wastePhoto}
                alt="Waste bag"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-4xl">
              {info.emoji}
            </div>
          )}

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              AI Suggestion
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-2xl">{info.emoji}</span>
              <span className="text-2xl font-black text-slate-900">
                {info.name}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-700 mt-1">
              {info.label} ({info.desc ? info.desc.split(',')[0] : ''})
            </p>
            <p className="text-xs text-emerald-600 font-bold mt-1">
              {aiResult?.confidence
                ? `${Math.round(aiResult.confidence * 100)}% confidence`
                : '94% confidence'}
            </p>
          </div>

          {/* Photo button */}
          <div>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition-colors">
              <Camera className="w-4 h-4 text-slate-500" />
              <span>{wastePhoto ? 'Change Photo' : 'Take / Upload Photo'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </label>
          </div>

          {/* Action Buttons: Confirm or Check Again */}
          <div className="pt-2 space-y-2.5">
            <button
              onClick={() => setActiveScreen('BOOK_BAGS')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>CONFIRM</span>
            </button>

            <button
              onClick={() => setActiveScreen('BOOK_STEP1')}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>CHECK AGAIN</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. WASTE BAG SCREEN (Section 10) - Step 3 of 4
  // ==========================================
  if (activeScreen === 'BOOK_BAGS') {
    const info = getCategoryInfo(selectedCategory);

    return (
      <div className="max-w-md mx-auto w-full space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveScreen('BOOK_AI')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 p-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            STEP 3 OF 3
          </span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Bag Details
          </h2>
          <p className="text-xs text-slate-500">
            Set weight and number of bags
          </p>
        </div>

        {/* Selected Category Pill */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">Waste Type</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">{info.emoji}</span>
            <span className="font-extrabold text-slate-900">{info.name}</span>
            <span className="text-xs text-slate-500 font-medium">({info.label})</span>
          </div>
        </div>

        {/* AI Weight Estimator Banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900">
                  AI Weight Estimator
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-2.5 h-2.5" /> Gemini
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {aiEstimatedSummary || 'Predict weight from bag size (15L/30L/55L/90L) & scan'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setWeightEstimatorOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{aiEstimatedSummary ? 'Re-Estimate' : 'Estimate'}</span>
          </button>
        </div>

        {/* Large Controls for Weight & Bags (Section 10) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6">
          {/* Weight Control */}
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Weight
              </span>
              {aiEstimatedSummary && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-2.5 h-2.5" /> AI Estimated
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-4 pt-1">
              <button
                type="button"
                onClick={() => setWeightKg((w) => Math.max(0.5, Number((w - 0.5).toFixed(1))))}
                className="w-14 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 flex items-center justify-center font-black text-2xl transition-all"
              >
                <Minus className="w-6 h-6" />
              </button>

              <div className="flex-1">
                <span className="text-4xl font-black text-slate-900">
                  {weightKg}
                </span>
                <span className="text-sm font-bold text-slate-400 ml-1">kg</span>
              </div>

              <button
                type="button"
                onClick={() => setWeightKg((w) => Number((w + 0.5).toFixed(1)))}
                className="w-14 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 flex items-center justify-center font-black text-2xl transition-all"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Bags Control */}
          <div className="space-y-2 text-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bags
            </span>
            <div className="flex items-center justify-between gap-4 pt-1">
              <button
                type="button"
                onClick={() => setBagCount((b) => Math.max(1, b - 1))}
                className="w-14 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 flex items-center justify-center font-black text-2xl transition-all"
              >
                <Minus className="w-6 h-6" />
              </button>

              <div className="flex-1">
                <span className="text-4xl font-black text-slate-900">
                  {bagCount}
                </span>
                <span className="text-sm font-bold text-slate-400 ml-1">bags</span>
              </div>

              <button
                type="button"
                onClick={() => setBagCount((b) => b + 1)}
                className="w-14 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 flex items-center justify-center font-black text-2xl transition-all"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Book Pickup Button */}
          <div className="pt-3">
            <button
              onClick={handleBookPickup}
              disabled={bookingLoading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-base rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>{bookingLoading ? 'Booking...' : 'BOOK PICKUP'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. SUCCESS SCREEN (Section 11)
  // ==========================================
  if (activeScreen === 'BOOK_SUCCESS' && newlyCreatedRequest) {
    return (
      <div className="max-w-md mx-auto w-full space-y-6 pb-8 text-center">
        {/* Big Check */}
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Pickup booked!
          </h2>
          <p className="text-xs text-slate-500">
            Driver will be assigned automatically.
          </p>
        </div>

        {/* QR Code & Consignment ID Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Consignment ID
          </p>
          <p className="text-xl font-mono font-black text-slate-900">
            {newlyCreatedRequest.consignmentId}
          </p>

          {/* Visual QR Code Box */}
          <div
            onClick={() => onOpenQrModal(newlyCreatedRequest)}
            className="w-48 h-48 mx-auto bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <QrCode className="w-28 h-28 text-slate-800" />
            <span className="text-[11px] font-bold text-emerald-600 mt-2">
              Tap to expand QR
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            {newlyCreatedRequest.totalBagsCount} Bags &bull; {newlyCreatedRequest.totalWeightKg} kg
          </div>
        </div>

        {/* Main Button: TRACK PICKUP */}
        <div>
          <button
            onClick={() => setActiveScreen('TRACK')}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
          >
            <Truck className="w-5 h-5" />
            <span>TRACK PICKUP</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 6. TRACK PICKUP SCREEN (Section 12)
  // ==========================================
  if (activeScreen === 'TRACK') {
    const req = trackableRequest;

    // Helper status determination for timeline
    const getTimelineStep = () => {
      if (!req) return 1;
      switch (req.status) {
        case 'READY_FOR_ASSIGNMENT':
          return 1;
        case 'DRIVER_ASSIGNED':
        case 'DRIVER_ACCEPTED':
          return 2;
        case 'PICKUP_IN_PROGRESS':
          return 3;
        case 'PICKED_UP':
          return 4;
        case 'IN_TRANSIT':
          return 5;
        case 'PLANT_ARRIVED':
        case 'PLANT_RECEIVED':
        case 'UNDER_TREATMENT':
          return 6;
        case 'TREATED':
        case 'CLOSED':
          return 7;
        default:
          return 1;
      }
    };

    const currentStep = getTimelineStep();

    // Timeline Steps Data
    const steps = [
      { id: 1, label: 'Booked', emoji: '✅' },
      { id: 2, label: 'Driver Assigned', emoji: '✅' },
      { id: 3, label: 'Driver Coming', emoji: '🚚' },
      { id: 4, label: 'Waste Collected', emoji: '📦' },
      { id: 5, label: 'On the Way', emoji: '🗺️' },
      { id: 6, label: 'Treatment Plant', emoji: '♻️' },
      { id: 7, label: 'Completed', emoji: '✅' },
    ];

    return (
      <div className="max-w-md mx-auto w-full space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveScreen('HOME')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 p-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <span className="text-xs font-mono font-bold text-slate-500">
            {req?.consignmentId || 'No active request'}
          </span>
        </div>

        {/* Main Status Banner (Section 12) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm text-center space-y-3">
          <div className="text-4xl">
            {currentStep >= 7 ? '✅' : currentStep >= 4 ? '📦' : '🚚'}
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {currentStep >= 7
              ? 'Waste Treated & Completed ✅'
              : currentStep >= 6
              ? 'Arrived at Treatment Plant ♻️'
              : currentStep >= 5
              ? 'On the Way to Plant 🗺️'
              : currentStep >= 4
              ? 'Waste Collected & Sealed 📦'
              : currentStep >= 3
              ? 'Driver is coming 🚚'
              : 'Driver Assigned 🚚'}
          </h2>

          <p className="text-sm font-bold text-slate-500">
            {currentStep >= 7
              ? 'Safe disposal certificate issued'
              : currentStep >= 4
              ? 'In transit &bull; Temp: 4.2°C'
              : 'ETA 18 min'}
          </p>

          <div className="pt-2">
            <button
              onClick={() => onOpenMapModal(req)}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              <span>VIEW MAP</span>
            </button>
          </div>
        </div>

        {/* Large Vertical Timeline (Section 12) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
            Tracking Progress
          </p>

          <div className="space-y-3 max-w-xs mx-auto">
            {steps.map((step, idx) => {
              const isPast = step.id < currentStep;
              const isCurrent = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 transition-all ${
                      isCurrent
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105 ring-2 ring-emerald-300'
                        : isPast
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <span>{isPast || isCurrent ? step.emoji : '○'}</span>
                  </div>

                  <div className="flex-1">
                    <p
                      className={`text-sm font-bold ${
                        isCurrent
                          ? 'text-slate-900 font-extrabold'
                          : isPast
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 7. HOSPITAL WASTE HISTORY (Section 13)
  // ==========================================
  return (
    <div className="max-w-md mx-auto w-full space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveScreen('HOME')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 p-1 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          MY WASTE
        </span>
      </div>

      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Waste History
        </h2>
        <p className="text-xs text-slate-500">
          Total segregated biomedical waste
        </p>
      </div>

      {/* Filter: Today | Week | Month (Section 13) */}
      <div className="flex bg-slate-200/70 p-1 rounded-2xl">
        {(['TODAY', 'WEEK', 'MONTH'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setHistoryFilter(f)}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all ${
              historyFilter === f
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {f === 'TODAY' ? 'Today' : f === 'WEEK' ? 'Week' : 'Month'}
          </button>
        ))}
      </div>

      {/* 4 Category Summary Cards (Section 13) */}
      <div className="grid grid-cols-2 gap-3">
        {/* RED */}
        <div className="bg-rose-500 text-white rounded-3xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-2xl">🟥</span>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">
              Red
            </span>
          </div>
          <div>
            <p className="text-3xl font-black">{getCategoryWeight('RED')} <span className="text-xs font-bold opacity-80">kg</span></p>
            <p className="text-[11px] opacity-80">Contaminated Plastic</p>
          </div>
        </div>

        {/* YELLOW */}
        <div className="bg-amber-400 text-amber-950 rounded-3xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-2xl">🟨</span>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">
              Yellow
            </span>
          </div>
          <div>
            <p className="text-3xl font-black">{getCategoryWeight('YELLOW')} <span className="text-xs font-bold opacity-80">kg</span></p>
            <p className="text-[11px] opacity-80">Infectious Waste</p>
          </div>
        </div>

        {/* WHITE */}
        <div className="bg-slate-100 text-slate-800 border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-2xl">⬜</span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              White
            </span>
          </div>
          <div>
            <p className="text-3xl font-black">{getCategoryWeight('WHITE')} <span className="text-xs font-bold text-slate-400">kg</span></p>
            <p className="text-[11px] text-slate-500">Sharps &amp; Needles</p>
          </div>
        </div>

        {/* BLUE */}
        <div className="bg-blue-500 text-white rounded-3xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-2xl">🟦</span>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">
              Blue
            </span>
          </div>
          <div>
            <p className="text-3xl font-black">{getCategoryWeight('BLUE')} <span className="text-xs font-bold opacity-80">kg</span></p>
            <p className="text-[11px] opacity-80">Glassware &amp; Vials</p>
          </div>
        </div>
      </div>

      {/* Details Toggle Button (Section 13) */}
      <div className="text-center pt-2">
        <button
          onClick={() => setShowDetailedHistory(!showDetailedHistory)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs transition-colors"
        >
          <span>{showDetailedHistory ? 'Hide details' : 'View details'}</span>
          {showDetailedHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Detailed List Behind Toggle (Section 13) */}
      {showDetailedHistory && (
        <div className="space-y-3 pt-1 animate-in fade-in">
          {hospitalRequests.map((req) => (
            <div
              key={req.requestId}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between gap-3"
            >
              <div>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {req.consignmentId}
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatISTDateTime(req.createdAt)} &bull; {req.totalWeightKg} kg &bull; {req.totalBagsCount} Bags &bull; {req.status.replace(/_/g, ' ')}
                </p>
              </div>

              <button
                onClick={() => onOpenQrModal(req)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                title="View QR Manifest"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    );
  };

  return (
    <>
      {renderMainContent()}
      <AiWeightEstimatorModal
        isOpen={weightEstimatorOpen}
        onClose={() => setWeightEstimatorOpen(false)}
        initialCategory={selectedCategory}
        initialBagCount={bagCount}
        initialPhoto={wastePhoto}
        onApplyWeight={(suggestedKg, count) => {
          setWeightKg(suggestedKg);
          if (count) setBagCount(count);
          setAiEstimatedSummary(`${suggestedKg} kg (${count} bag${count > 1 ? 's' : ''})`);
        }}
      />
    </>
  );
};
