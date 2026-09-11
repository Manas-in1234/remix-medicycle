/**
 * MEDICYCLE — Smart Biomedical Waste Segregation & Tracking System
 * Core Data Models & TypeScript Interfaces
 */

export type UserRole = 'HOSPITAL' | 'DRIVER' | 'PLANT' | 'ADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export type LanguageCode =
  | 'en'
  | 'hi'
  | 'te'
  | 'ta'
  | 'kn'
  | 'ml'
  | 'mr'
  | 'bn'
  | 'gu'
  | 'pa'
  | 'or'
  | 'as'
  | 'ur';

export interface LanguageOption {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
  name: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', name: 'English' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', name: 'Hindi' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', name: 'Telugu' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', name: 'Tamil' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', name: 'Kannada' },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', name: 'Malayalam' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', name: 'Marathi' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', name: 'Bengali' },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati', name: 'Gujarati' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', name: 'Punjabi' },
  { code: 'or', nativeName: 'ଓଡ଼ିଆ', englishName: 'Odia', name: 'Odia' },
  { code: 'as', nativeName: 'অসমীয়া', englishName: 'Assamese', name: 'Assamese' },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', name: 'Urdu' },
];

export interface UserProfile {
  uid: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
  organizationType?: 'HOSPITAL' | 'LOGISTICS' | 'TREATMENT_PLANT' | 'GOVERNMENT';
  status: UserStatus;
  photoUrl?: string;
  language?: LanguageCode;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export type WasteCategoryCode = 'YELLOW' | 'RED' | 'WHITE' | 'BLUE' | 'UNKNOWN';

export interface WasteCategory {
  categoryId: string;
  code: WasteCategoryCode;
  name: string;
  colorHex: string;
  bgHex: string;
  borderHex: string;
  description: string;
  examples: string[];
  handlingRules: string;
  allowedVehicleTypes: string[];
  active: boolean;
  version: string;
  updatedAt: string;
}

export interface WasteBag {
  bagId: string;
  category: WasteCategoryCode;
  weightKg: number;
  bagCount: number;
  notes?: string;
  imageUrl?: string;
  aiClassification?: {
    suggestedCategory: WasteCategoryCode;
    confidence: number;
    explanation: string;
    possibleAlternatives: WasteCategoryCode[];
    safetyWarning?: string | null;
    requiresManualReview: boolean;
    isDemoMode?: boolean;
    analyzedAt: string;
  };
  confirmedCategory: WasteCategoryCode;
}

export type PickupStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'AI_REVIEW'
  | 'READY_FOR_ASSIGNMENT'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ACCEPTED'
  | 'PICKUP_IN_PROGRESS'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'PLANT_ARRIVED'
  | 'PLANT_RECEIVED'
  | 'UNDER_TREATMENT'
  | 'TREATED'
  | 'DISPOSED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXCEPTION';

export type PickupPriority = 'NORMAL' | 'HIGH' | 'EMERGENCY' | 'CRITICAL';

export interface DriverAssignment {
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleId: string;
  vehicleNumber: string;
  score: number;
  distanceKm: number;
  etaMinutes: number;
  availableCapacityKg: number;
  compatibility: boolean;
  reasons: string[];
  assignedAt: string;
}

export interface PickupRequest {
  requestId: string;
  consignmentId: string;
  hospitalId: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalLat: number;
  hospitalLng: number;
  hospitalContactPhone?: string;

  bags: WasteBag[];
  totalWeightKg: number;
  totalBagsCount: number;
  categories: WasteCategoryCode[];
  priority: PickupPriority;
  notes?: string;
  status: PickupStatus;

  // Security & QR
  verificationToken: string;
  qrPayload: string;

  // Smart Assignment
  assignment?: DriverAssignment;
  candidateAssignments?: DriverAssignment[];

  // Route & Transit
  routeDistanceKm?: number;
  estimatedTransitMinutes?: number;
  currentSimulatedLat?: number;
  currentSimulatedLng?: number;

  // Plant & Treatment
  plantId?: string;
  plantName?: string;
  plantAddress?: string;
  plantLat?: number;
  plantLng?: number;
  receivedWeightKg?: number;
  weightDiscrepancyKg?: number;
  weightMismatchAnomaly?: boolean;
  treatmentMethod?: 'HIGH_TEMP_INCINERATION' | 'AUTOCLAVING_SHREDDING' | 'CHEMICAL_DISINFECTION' | 'ENCAPSULATION_SANITARY_LANDFILL';
  treatmentStartedAt?: string;
  treatmentCompletedAt?: string;
  disposedAt?: string;
  closedAt?: string;
  operatorId?: string;
  operatorRemarks?: string;

  // Timestamps
  createdAt: string;
  requestedAt: string;
  assignedAt?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  plantArrivedAt?: string;
  plantReceivedAt?: string;
  updatedAt: string;

  // Metadata
  createdByUserId: string;
  createdByName: string;
}

export interface Hospital {
  hospitalId: string;
  name: string;
  code: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  contactPerson: string;
  phone: string;
  email: string;
  isRealHospital: boolean;
  dataSource: string;
  dataType: 'REFERENCE_HOSPITAL_DATA';
  verificationRequired: boolean;
  active: boolean;
  bedCapacity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  driverId: string;
  name: string;
  phone: string;
  email: string;
  vehicleId: string;
  vehicleNumber: string;
  status: 'ACTIVE' | 'BUSY' | 'OFFLINE' | 'SUSPENDED';
  currentLatitude: number;
  currentLongitude: number;
  lastGpsUpdate: string;
  licenseNumber: string;
  rating: number;
  totalPickups: number;
  activeRequestId?: string;
  dataType: 'SYNTHETIC_DEMO_DRIVER_DATA';
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  capacityKg: number;
  currentLoadKg: number;
  supportedWasteCategories: WasteCategoryCode[];
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE' | 'OFF_DUTY';
  driverId?: string;
  driverName?: string;
  gps: {
    lat: number;
    lng: number;
  };
  lastGpsUpdate: string;
  insuranceStatus: 'VALID' | 'PENDING_RENEWAL' | 'EXPIRED';
  permitStatus: 'VALID' | 'UNDER_REVIEW' | 'EXPIRED';
  fitnessStatus: 'CERTIFIED' | 'DUE_SOON' | 'FAIL';
  dataType: 'SYNTHETIC_DEMO_VEHICLE_DATA';
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentPlant {
  plantId: string;
  name: string;
  code: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  authorizedCategories: WasteCategoryCode[];
  capacityKgPerDay: number;
  currentDailyIntakeKg: number;
  active: boolean;
  verificationRequired: boolean;
  contactPhone: string;
  createdAt: string;
}

export type QrAction =
  | 'CREATED'
  | 'AI_CHECKED'
  | 'CONFIRMED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'RECEIVED'
  | 'TREATMENT_STARTED'
  | 'TREATMENT_COMPLETED'
  | 'DISPOSED'
  | 'CLOSED'
  | 'EXCEPTION_FLAGGED';

export interface QrEvent {
  eventId: string;
  consignmentId: string;
  requestId: string;
  action: QrAction;
  statusBefore: PickupStatus;
  statusAfter: PickupStatus;
  userId: string;
  userName: string;
  role: UserRole;
  organizationId?: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  deviceInfo: string;
  remarks?: string;
}

export interface NotificationItem {
  notificationId: string;
  recipientRole: UserRole | 'ALL';
  recipientUserId?: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  requestId?: string;
  consignmentId?: string;
  read: boolean;
  createdAt: string;
}

export type AnomalyType =
  | 'WEIGHT_MISMATCH'
  | 'WRONG_CATEGORY'
  | 'LOW_AI_CONFIDENCE'
  | 'ROUTE_DEVIATION'
  | 'PICKUP_DELAY'
  | 'DRIVER_INACTIVITY'
  | 'DUPLICATE_QR_SCAN'
  | 'INVALID_QR'
  | 'UNEXPECTED_PLANT'
  | 'OVER_CAPACITY_ASSIGNMENT';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Anomaly {
  anomalyId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  requestId: string;
  consignmentId: string;
  description: string;
  detectedAt: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: string;
}

export interface DailyWasteRecord {
  recordId: string;
  hospitalId: string;
  hospitalName: string;
  date: string;
  yellowKg: number;
  redKg: number;
  whiteKg: number;
  blueKg: number;
  totalKg: number;
  dataType: 'SYNTHETIC_DEMO_WASTE_DATA';
}

export interface SystemSettings {
  weights: {
    distance: number;
    capacity: number;
    wasteCompatibility: number;
    availability: number;
    eta: number;
    urgency: number;
  };
  weightMismatchThresholdPercent: number; // e.g. 5%
  proximityWeight?: number;
  anomalyWeightDiffPercent?: number;
  aiConfidenceThreshold: number; // e.g. 0.75
  simulationMode: boolean;
  demoDataEnabled: boolean;
}

export interface AiClassificationResponse {
  category: WasteCategoryCode;
  confidence: number;
  explanation: string;
  possibleAlternatives: WasteCategoryCode[];
  safetyWarning: string | null;
  requiresManualReview: boolean;
  isDemoMode?: boolean;
  modelUsed?: string;
  analyzedAt?: string;
}

export interface AiWasteForecast {
  generatedAt: string;
  period: 'TOMORROW' | 'NEXT_7_DAYS';
  forecastDays: {
    date: string;
    yellowKg: number;
    redKg: number;
    whiteKg: number;
    blueKg: number;
    totalKg: number;
    confidenceIntervalPercent: number;
  }[];
  summary: {
    totalEstimatedKg: number;
    peakDay: string;
    primaryCategory: WasteCategoryCode;
  };
  predictedTotalVolumeKg?: number;
  insights?: string[];
  disclaimer: string;
}

export type BagSizeCode =
  | 'SMALL_15L'
  | 'MEDIUM_30L'
  | 'LARGE_55L'
  | 'JUMBO_90L'
  | 'SHARPS_5L'
  | 'CUSTOM';

export interface AiWeightEstimateRequest {
  category: WasteCategoryCode;
  bagSize: BagSizeCode;
  customVolumeLitres?: number;
  fillLevelPercent?: number;
  department?: string;
  bagCount?: number;
  imageBase64?: string;
  notes?: string;
}

export interface AiWeightEstimateResponse {
  suggestedWeightKg: number;
  perBagWeightKg: number;
  weightRange: {
    minKg: number;
    maxKg: number;
  };
  estimatedVolumeLitres: number;
  densityKgPerLitre: number;
  fillLevelPercent: number;
  category: WasteCategoryCode;
  bagSizeLabel: string;
  confidence: number;
  reasoning: string;
  handlingPrecautions: string[];
  cpcbComplianceNote: string;
  isDemoMode: boolean;
  modelUsed?: string;
  estimatedAt: string;
}

export interface PrioritizedRouteStop {
  stopSequence: number;
  requestId: string;
  consignmentId: string;
  hospitalId: string;
  hospitalName: string;
  hospitalAddress: string;
  city: string;
  hospitalLat: number;
  hospitalLng: number;
  hospitalPhone?: string;
  weightKg: number;
  bagsCount: number;
  categories: WasteCategoryCode[];
  priority: PickupPriority;
  status: PickupStatus;
  
  // Distances and timing
  distanceFromPreviousKm: number;
  cumulativeDistanceKm: number;
  legEtaMinutes: number;
  cumulativeEtaMinutes: number;
  distanceToPlantKm: number;
  estimatedArrivalWindow: string;

  // Logistics & Sequencing Rationale
  priorityScore: number;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'NORMAL';
  priorityReason: string;
  cpcbHoursRemaining?: number;
}

export interface OptimizedRoutePlan {
  planId: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleNumber?: string;
  vehicleCapacityKg?: number;
  
  origin: {
    label: string;
    lat: number;
    lng: number;
  };
  destinationPlant: {
    plantId: string;
    name: string;
    code: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
    distanceFromLastStopKm: number;
  };
  
  stops: PrioritizedRouteStop[];
  
  // Aggregated route statistics
  totalPickups: number;
  totalWeightKg: number;
  capacityUtilizationPercent: number;
  totalRouteDistanceKm: number;
  totalDriveMinutes: number;
  totalDwellMinutes: number;
  totalEstimatedTripMinutes: number;
  distanceSavedKm: number;
  carbonReductionKg: number;
  fuelSavedLitres: number;
  
  generatedAt: string;
}

export interface RouteOptimizationParams {
  pickupRequests: PickupRequest[];
  treatmentPlants: TreatmentPlant[];
  targetPlantId?: string;
  originLat?: number;
  originLng?: number;
  originLabel?: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleNumber?: string;
  vehicleCapacityKg?: number;
}
