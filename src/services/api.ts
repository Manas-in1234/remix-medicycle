import {
  AiClassificationResponse,
  AiWasteForecast,
  Driver,
  Vehicle,
  DriverAssignment,
  WasteCategoryCode,
  AiWeightEstimateRequest,
  AiWeightEstimateResponse,
} from '../types';

export async function classifyWasteImage(
  imageBase64: string,
  userSelectedCategory?: WasteCategoryCode,
  bagNotes?: string
): Promise<AiClassificationResponse> {
  const res = await fetch('/api/waste/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      userSelectedCategory,
      bagNotes,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to classify waste image from server.');
  }

  return res.json();
}

export async function calculateSmartDriverAssignment(
  hospitalLat: number,
  hospitalLng: number,
  totalWeightKg: number,
  categories: WasteCategoryCode[],
  drivers: Driver[],
  vehicles: Vehicle[],
  weights?: {
    distance: number;
    capacity: number;
    wasteCompatibility: number;
    availability: number;
    eta: number;
    urgency: number;
  }
): Promise<{ success: boolean; recommended: DriverAssignment | null; candidates: DriverAssignment[] }> {
  const res = await fetch('/api/dispatch/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospitalLat,
      hospitalLng,
      totalWeightKg,
      categories,
      drivers,
      vehicles,
      weights,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to compute driver assignment.');
  }

  return res.json();
}

export async function fetchAiWasteForecast(
  historicalData: any[],
  targetHospitalId?: string
): Promise<AiWasteForecast> {
  const res = await fetch('/api/analytics/forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      historicalData,
      targetHospitalId,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch AI waste forecast.');
  }

  return res.json();
}

export async function computeRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ distanceKm: number; etaMinutes: number; corridor: string }> {
  const res = await fetch('/api/routes/compute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originLat, originLng, destLat, destLng }),
  });

  if (!res.ok) {
    throw new Error('Failed to compute route.');
  }

  return res.json();
}

export async function estimateWasteWeight(
  params: AiWeightEstimateRequest
): Promise<AiWeightEstimateResponse> {
  const res = await fetch('/api/waste/estimate-weight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error('Failed to estimate waste weight from server.');
  }

  return res.json();
}
