import React, { useState, useEffect } from 'react';
import {
  Scale,
  Sparkles,
  Camera,
  X,
  Check,
  AlertTriangle,
  Info,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Building2,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  WasteCategoryCode,
  BagSizeCode,
  AiWeightEstimateResponse,
} from '../../types';
import { estimateWasteWeight } from '../../services/api';

interface AiWeightEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: WasteCategoryCode;
  initialBagCount?: number;
  initialPhoto?: string | null;
  onApplyWeight: (weightKg: number, bagCount: number) => void;
}

const BAG_SIZE_OPTIONS: {
  code: BagSizeCode;
  name: string;
  volume: number;
  dimensions: string;
  commonUse: string;
}[] = [
  {
    code: 'SMALL_15L',
    name: 'Small (15L)',
    volume: 15,
    dimensions: '18" × 22"',
    commonUse: 'OPD, Dressing, Minor Clinic',
  },
  {
    code: 'MEDIUM_30L',
    name: 'Medium (30L)',
    volume: 30,
    dimensions: '25" × 30"',
    commonUse: 'Standard Ward, Pathology, ICU',
  },
  {
    code: 'LARGE_55L',
    name: 'Large (55L)',
    volume: 55,
    dimensions: '30" × 36"',
    commonUse: 'OT Hamper, Labor Ward, Trauma',
  },
  {
    code: 'JUMBO_90L',
    name: 'Jumbo (90L)',
    volume: 90,
    dimensions: '38" × 48"',
    commonUse: 'Central Storage Heavy Waste',
  },
  {
    code: 'SHARPS_5L',
    name: 'Sharps Box (5L)',
    volume: 5,
    dimensions: 'Rigid Puncture Box',
    commonUse: 'Needles, Scalpels, Blades',
  },
];

const DEPARTMENTS = [
  'General Inpatient Ward',
  'Operation Theatre / Surgery',
  'ICU / Critical Care',
  'Emergency & Trauma',
  'Pathology & Lab',
  'Outpatient Dept (OPD)',
  'Dialysis Unit',
];

export const AiWeightEstimatorModal: React.FC<AiWeightEstimatorModalProps> = ({
  isOpen,
  onClose,
  initialCategory,
  initialBagCount = 1,
  initialPhoto = null,
  onApplyWeight,
}) => {
  const [category, setCategory] = useState<WasteCategoryCode>(initialCategory);
  const [bagSize, setBagSize] = useState<BagSizeCode>('MEDIUM_30L');
  const [customVolume, setCustomVolume] = useState<number>(30);
  const [fillLevelPercent, setFillLevelPercent] = useState<number>(75);
  const [department, setDepartment] = useState<string>('General Inpatient Ward');
  const [bagCount, setBagCount] = useState<number>(initialBagCount);
  const [bagPhoto, setBagPhoto] = useState<string | null>(initialPhoto);
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [estimate, setEstimate] = useState<AiWeightEstimateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setBagCount(Math.max(1, initialBagCount));
      setBagPhoto(initialPhoto);
      // Pick sensible default bag size based on category
      if (initialCategory === 'WHITE') {
        setBagSize('SHARPS_5L');
      } else {
        setBagSize('MEDIUM_30L');
      }
    }
  }, [isOpen, initialCategory, initialBagCount, initialPhoto]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBagPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleEstimate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await estimateWasteWeight({
        category,
        bagSize,
        customVolumeLitres: bagSize === 'CUSTOM' ? customVolume : undefined,
        fillLevelPercent,
        department,
        bagCount,
        imageBase64: bagPhoto || undefined,
        notes: notes.trim() || undefined,
      });
      setEstimate(res);
    } catch (err: any) {
      console.error('Failed to estimate weight:', err);
      setError(err?.message || 'Unable to connect to Gemini weight estimation service.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (estimate) {
      onApplyWeight(estimate.suggestedWeightKg, bagCount);
      onClose();
    }
  };

  const getCategoryColorStyles = (cat: WasteCategoryCode) => {
    switch (cat) {
      case 'YELLOW':
        return {
          badge: 'bg-amber-100 text-amber-900 border-amber-300',
          accent: 'text-amber-600',
          dot: 'bg-amber-400',
        };
      case 'RED':
        return {
          badge: 'bg-red-100 text-red-900 border-red-300',
          accent: 'text-red-600',
          dot: 'bg-red-500',
        };
      case 'WHITE':
        return {
          badge: 'bg-slate-100 text-slate-800 border-slate-300',
          accent: 'text-slate-600',
          dot: 'bg-slate-400',
        };
      case 'BLUE':
        return {
          badge: 'bg-blue-100 text-blue-900 border-blue-300',
          accent: 'text-blue-600',
          dot: 'bg-blue-500',
        };
    }
  };

  const currentCatStyles = getCategoryColorStyles(category);

  return (
    <div
      id="ai-weight-estimator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                  AI Weight Estimator
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-3 h-3" />
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Predicts category weight from bag size, fill volume &amp; scan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Top Section: Category & Scanned Photo Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Waste Category Stream
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['YELLOW', 'RED', 'WHITE', 'BLUE'] as WasteCategoryCode[]).map((cat) => {
                  const isSelected = category === cat;
                  const catStyle = getCategoryColorStyles(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${
                        isSelected
                          ? `${catStyle.badge} ring-2 ring-emerald-500/40 shadow-xs`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${catStyle.dot}`} />
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bag Scan / Photo Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Scanned Bag Image (Optional)
                </label>
                {bagPhoto && (
                  <button
                    type="button"
                    onClick={() => setBagPhoto(null)}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700"
                  >
                    Remove
                  </button>
                )}
              </div>

              {bagPhoto ? (
                <div className="relative h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                  <img
                    src={bagPhoto}
                    alt="Scanned bag"
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent flex items-end p-2.5 justify-between">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Visual density active
                    </span>
                    <label className="text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-md cursor-pointer transition-colors backdrop-blur-xs">
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="h-24 border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 rounded-2xl flex flex-col items-center justify-center text-center p-2 cursor-pointer transition-colors">
                  <Camera className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700">
                    Snap or upload bag photo
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Gemini verifies visual volume &amp; slump
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Bag Size Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Standard Bag Size / Container
              </label>
              <span className="text-[11px] text-slate-400">
                CPCB Schedule I Bin Guidelines
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {BAG_SIZE_OPTIONS.map((opt) => {
                const isSelected = bagSize === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setBagSize(opt.code)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-900">
                        {opt.name}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {opt.volume}L
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {opt.dimensions}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {opt.commonUse}
                    </p>
                  </button>
                );
              })}

              {/* Custom option */}
              <button
                type="button"
                onClick={() => setBagSize('CUSTOM')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  bagSize === 'CUSTOM'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs text-slate-900">
                    Custom Vol
                  </span>
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-500">Non-standard size</p>
                <p className="text-[10px] text-slate-400">Specify litres</p>
              </button>
            </div>

            {/* Custom volume input if CUSTOM is selected */}
            {bagSize === 'CUSTOM' && (
              <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">
                  Custom Volume:
                </span>
                <input
                  type="number"
                  min="2"
                  max="300"
                  value={customVolume}
                  onChange={(e) => setCustomVolume(Math.max(1, Number(e.target.value)))}
                  className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 text-center"
                />
                <span className="text-xs text-slate-500 font-bold">Litres</span>
              </div>
            )}
          </div>

          {/* Fill Level & Bag Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fill Level Slider */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  Bag Fill Level
                </span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    fillLevelPercent > 80
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {fillLevelPercent}% full
                </span>
              </div>

              <input
                type="range"
                min="25"
                max="100"
                step="5"
                value={fillLevelPercent}
                onChange={(e) => setFillLevelPercent(Number(e.target.value))}
                className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-400">
                <span>1/4 Full (25%)</span>
                <span className="font-bold text-emerald-700">CPCB Limit (75%)</span>
                <span>Full (100%)</span>
              </div>
            </div>

            {/* Bag Count & Department */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  Total Bags
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBagCount((b) => Math.max(1, b - 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-black text-sm flex items-center justify-center hover:bg-slate-100"
                  >
                    -
                  </button>
                  <span className="text-sm font-black text-slate-900 w-6 text-center">
                    {bagCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBagCount((b) => b + 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-black text-sm flex items-center justify-center hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Department / Ward Origin
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 text-slate-800"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Button to Calculate */}
          <div>
            <button
              type="button"
              onClick={handleEstimate}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gemini AI Estimating Weight...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {estimate ? 'Re-Calculate Weight with Gemini' : 'Calculate Estimated Weight'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {estimate && (
            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/70 to-white p-5 space-y-4 shadow-sm animate-in fade-in duration-300">
              {/* Primary Weight Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                      Suggested Weight
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                      {Math.round(estimate.confidence * 100)}% Confidence
                    </span>
                    {estimate.isDemoMode && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Physics Matrix Mode
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-black text-slate-900">
                      {estimate.suggestedWeightKg}
                    </span>
                    <span className="text-base font-bold text-slate-500">kg</span>
                    {bagCount > 1 && (
                      <span className="text-xs font-semibold text-slate-500 ml-1">
                        (~{estimate.perBagWeightKg} kg / bag)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right bg-white/80 p-3 rounded-2xl border border-emerald-100">
                  <p className="text-[11px] font-bold text-slate-500">Expected Range</p>
                  <p className="text-sm font-extrabold text-slate-800">
                    {estimate.weightRange.minKg} – {estimate.weightRange.maxKg} kg
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Density: {estimate.densityKgPerLitre.toFixed(2)} kg/L
                  </p>
                </div>
              </div>

              {/* Scientific Reasoning */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  Gemini Clinical Waste Rationale
                </span>
                <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                  {estimate.reasoning}
                </p>
              </div>

              {/* CPCB Compliance Note */}
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                  estimate.fillLevelPercent > 80
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">CPCB Compliance Assessment</p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    {estimate.cpcbComplianceNote}
                  </p>
                </div>
              </div>

              {/* Handling Precautions */}
              {estimate.handlingPrecautions && estimate.handlingPrecautions.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Safety &amp; Handling Guidelines
                  </span>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    {estimate.handlingPrecautions.map((precaution, idx) => (
                      <li key={idx} className="leading-tight">
                        {precaution}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Apply Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleApply}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Estimated {estimate.suggestedWeightKg} kg to Booking</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Biomedical Waste (Management &amp; Handling) Rules</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
