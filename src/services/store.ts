import {
  PickupRequest,
  Driver,
  Vehicle,
  Hospital,
  TreatmentPlant,
  WasteCategory,
  QrEvent,
  NotificationItem,
  Anomaly,
  DailyWasteRecord,
  SystemSettings,
  WasteBag,
  PickupPriority,
  WasteCategoryCode,
  UserRole,
} from '../types';

import {
  SEED_HOSPITALS,
  SEED_DRIVERS,
  SEED_VEHICLES,
  SEED_TREATMENT_PLANTS,
  SEED_WASTE_CATEGORIES,
  INITIAL_PICKUP_REQUESTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ANOMALIES,
  generate90DaysWasteHistory,
} from '../lib/data/seedData';

import { auth, db, handleFirestoreError, OperationType, sanitizeForFirestore } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { calculateSmartDriverAssignment } from './api';

class MediCycleStore {
  hospitals: Hospital[] = [...SEED_HOSPITALS];
  drivers: Driver[] = [...SEED_DRIVERS];
  vehicles: Vehicle[] = [...SEED_VEHICLES];
  treatmentPlants: TreatmentPlant[] = [...SEED_TREATMENT_PLANTS];
  wasteCategories: WasteCategory[] = [...SEED_WASTE_CATEGORIES];
  pickupRequests: PickupRequest[] = [...INITIAL_PICKUP_REQUESTS];
  qrEvents: QrEvent[] = [];
  notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];
  anomalies: Anomaly[] = [...INITIAL_ANOMALIES];
  historicalWasteRecords: DailyWasteRecord[] = generate90DaysWasteHistory();

  settings: SystemSettings = {
    weights: {
      distance: 30,
      capacity: 20,
      wasteCompatibility: 15,
      availability: 15,
      eta: 10,
      urgency: 10,
    },
    weightMismatchThresholdPercent: 5,
    proximityWeight: 0.35,
    anomalyWeightDiffPercent: 5,
    aiConfidenceThreshold: 0.75,
    simulationMode: true,
    demoDataEnabled: true,
  };

  private listeners: (() => void)[] = [];

  constructor() {
    // Generate initial chain of custody events for seeded requests
    this.seedInitialQrEvents();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private seedInitialQrEvents() {
    for (const req of this.pickupRequests) {
      this.qrEvents.push({
        eventId: `evt-init-${req.requestId}-01`,
        consignmentId: req.consignmentId,
        requestId: req.requestId,
        action: 'CREATED',
        statusBefore: 'DRAFT',
        statusAfter: 'REQUESTED',
        userId: req.createdByUserId,
        userName: req.createdByName,
        role: 'HOSPITAL',
        latitude: req.hospitalLat,
        longitude: req.hospitalLng,
        timestamp: req.createdAt,
        deviceInfo: 'MEDICYCLE Hospital Terminal v1.0',
        remarks: `Pickup requested for ${req.totalBagsCount} bags (${req.totalWeightKg} kg)`,
      });

      if (req.assignment) {
        this.qrEvents.push({
          eventId: `evt-init-${req.requestId}-02`,
          consignmentId: req.consignmentId,
          requestId: req.requestId,
          action: 'ASSIGNED',
          statusBefore: 'READY_FOR_ASSIGNMENT',
          statusAfter: 'DRIVER_ASSIGNED',
          userId: 'sys-dispatch-engine',
          userName: 'Smart Dispatch Engine',
          role: 'ADMIN',
          timestamp: req.assignedAt || req.createdAt,
          deviceInfo: 'MEDICYCLE Algorithmic Dispatcher',
          remarks: `Assigned to ${req.assignment.driverName} (${req.assignment.vehicleNumber}) with score ${req.assignment.score}%`,
        });
      }

      if (req.pickedUpAt) {
        this.qrEvents.push({
          eventId: `evt-init-${req.requestId}-03`,
          consignmentId: req.consignmentId,
          requestId: req.requestId,
          action: 'COLLECTED',
          statusBefore: 'DRIVER_ACCEPTED',
          statusAfter: 'PICKED_UP',
          userId: req.assignment?.driverId || 'drv-01',
          userName: req.assignment?.driverName || 'Driver',
          role: 'DRIVER',
          latitude: req.hospitalLat,
          longitude: req.hospitalLng,
          timestamp: req.pickedUpAt,
          deviceInfo: 'Driver Mobile Scanner / Geotagged',
          remarks: 'QR verified & sealed container custody handed over',
        });
      }
    }
  }

  // Safe sync helper with Firestore
  private async syncDocument(collectionName: string, docId: string, data: any) {
    if (!auth.currentUser) {
      return;
    }
    try {
      const sanitized = sanitizeForFirestore(data);
      await setDoc(doc(db, collectionName, docId), sanitized, { merge: true });
    } catch (err) {
      // In development or if offline, log error per skill specification
      handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
    }
  }

  // Generate unique consignment ID: BMW-[CITY_CODE]-YYYYMMDD-[6_DIGITS]
  private generateConsignmentId(hospitalCity: string): string {
    const cityCode = hospitalCity.toUpperCase().includes('GUNTUR') ? 'GNT' : 'VJA';
    const d = new Date();
    const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const seq = Math.floor(100000 + Math.random() * 900000);
    return `BMW-${cityCode}-${datePart}-${seq}`;
  }

  // 1. CREATE PICKUP REQUEST
  async createPickupRequest(params: {
    hospitalId: string;
    hospitalName: string;
    hospitalAddress: string;
    hospitalLat: number;
    hospitalLng: number;
    hospitalPhone?: string;
    bags: WasteBag[];
    priority: PickupPriority;
    notes?: string;
    userId: string;
    userName: string;
  }): Promise<PickupRequest> {
    const consignmentId = this.generateConsignmentId(params.hospitalAddress);
    const requestId = `req-${Date.now()}`;
    const verificationToken = `tok-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const totalWeightKg = Number(params.bags.reduce((acc, b) => acc + (Number(b.weightKg) || 0), 0).toFixed(1));
    const totalBagsCount = params.bags.reduce((acc, b) => acc + (Number(b.bagCount) || 1), 0);

    const categoriesSet = new Set<WasteCategoryCode>();
    params.bags.forEach((b) => categoriesSet.add(b.confirmedCategory || b.category));
    const categories = Array.from(categoriesSet);

    // QR Payload encodes only opaque secure identifier, verification token, and consignment ID
    const qrPayload = JSON.stringify({
      consignmentId,
      token: verificationToken,
      version: '1.0',
      system: 'MEDICYCLE_AP',
      hospitalId: params.hospitalId,
      bagsCount: totalBagsCount,
      totalWeight: totalWeightKg,
      created: new Date().toISOString(),
    });

    const newRequest: PickupRequest = {
      requestId,
      consignmentId,
      hospitalId: params.hospitalId,
      hospitalName: params.hospitalName,
      hospitalAddress: params.hospitalAddress,
      hospitalLat: params.hospitalLat,
      hospitalLng: params.hospitalLng,
      hospitalContactPhone: params.hospitalPhone || '',
      bags: params.bags,
      totalWeightKg,
      totalBagsCount,
      categories,
      priority: params.priority,
      notes: params.notes || '',
      status: 'READY_FOR_ASSIGNMENT',
      verificationToken,
      qrPayload,
      createdAt: new Date().toISOString(),
      requestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: params.userId,
      createdByName: params.userName,
    };

    // Calculate smart driver assignment automatically
    try {
      const assignmentResult = await calculateSmartDriverAssignment(
        params.hospitalLat,
        params.hospitalLng,
        totalWeightKg,
        categories,
        this.drivers,
        this.vehicles,
        this.settings.weights
      );

      if (assignmentResult.success && assignmentResult.recommended) {
        newRequest.assignment = assignmentResult.recommended;
        newRequest.candidateAssignments = assignmentResult.candidates;
        newRequest.status = 'DRIVER_ASSIGNED';
        newRequest.assignedAt = new Date().toISOString();

        // Assign nearest treatment plant (Kondapalli or Guntur Autonagar)
        const plant = this.treatmentPlants[0] || SEED_TREATMENT_PLANTS[0];
        newRequest.plantId = plant.plantId;
        newRequest.plantName = plant.name;
        newRequest.plantAddress = plant.address;
        newRequest.plantLat = plant.latitude;
        newRequest.plantLng = plant.longitude;

        // Notification for assigned driver
        this.addNotification({
          recipientRole: 'DRIVER',
          recipientUserId: assignmentResult.recommended.driverId,
          title: 'New Pickup Assigned',
          message: `New consignment ${consignmentId} at ${params.hospitalName} (${totalBagsCount} bags, ${totalWeightKg} kg). Distance: ${assignmentResult.recommended.distanceKm} km.`,
          type: 'INFO',
          requestId,
          consignmentId,
        });
      }
    } catch (e) {
      console.warn('Smart assignment calculation fell back to local matcher:', e);
      // Local fallback assignment
      const fallbackDriver = this.drivers.find((d) => d.status === 'ACTIVE') || this.drivers[0] || SEED_DRIVERS[0];
      const fallbackVehicle = this.vehicles.find((v) => v.vehicleId === fallbackDriver.vehicleId) || this.vehicles[0] || SEED_VEHICLES[0];

      newRequest.assignment = {
        driverId: fallbackDriver.driverId,
        driverName: fallbackDriver.name,
        driverPhone: fallbackDriver.phone,
        vehicleId: fallbackVehicle.vehicleId,
        vehicleNumber: fallbackVehicle.vehicleNumber,
        score: 92.5,
        distanceKm: 3.2,
        etaMinutes: 12,
        availableCapacityKg: fallbackVehicle.capacityKg - fallbackVehicle.currentLoadKg,
        compatibility: true,
        reasons: ['Fleet availability match', 'Regional standby vehicle'],
        assignedAt: new Date().toISOString(),
      };
      newRequest.status = 'DRIVER_ASSIGNED';
      newRequest.assignedAt = new Date().toISOString();
    }

    // Add to state
    this.pickupRequests.unshift(newRequest);

    // Log in immutable audit events
    this.addQrEvent({
      consignmentId,
      requestId,
      action: 'CREATED',
      statusBefore: 'DRAFT',
      statusAfter: 'REQUESTED',
      userId: params.userId,
      userName: params.userName,
      role: 'HOSPITAL',
      latitude: params.hospitalLat,
      longitude: params.hospitalLng,
      deviceInfo: 'MEDICYCLE Hospital Web Terminal',
      remarks: `Booked ${totalBagsCount} bags (${totalWeightKg} kg) across categories [${categories.join(', ')}]`,
    });

    if (newRequest.assignment) {
      this.addQrEvent({
        consignmentId,
        requestId,
        action: 'ASSIGNED',
        statusBefore: 'READY_FOR_ASSIGNMENT',
        statusAfter: 'DRIVER_ASSIGNED',
        userId: 'sys-smart-dispatcher',
        userName: 'Algorithmic Dispatch Service',
        role: 'ADMIN',
        deviceInfo: 'Server Smart Dispatch Engine',
        remarks: `Assigned to ${newRequest.assignment.driverName} (${newRequest.assignment.vehicleNumber}) with ranking score ${newRequest.assignment.score}`,
      });
    }

    // Add hospital notification
    this.addNotification({
      recipientRole: 'HOSPITAL',
      recipientUserId: params.userId,
      title: 'Pickup Request Created',
      message: `Consignment ${consignmentId} is generated and driver ${newRequest.assignment?.driverName || 'fleet'} has been dispatched.`,
      type: 'SUCCESS',
      requestId,
      consignmentId,
    });

    this.syncDocument('pickupRequests', requestId, newRequest).catch(() => {});
    this.notify();
    return newRequest;
  }

  // 2. DRIVER ACCEPTS PICKUP
  acceptPickup(requestId: string, driverId: string, userName: string) {
    const req = this.pickupRequests.find((r) => r.requestId === requestId);
    if (!req) throw new Error('Pickup request not found.');

    req.status = 'DRIVER_ACCEPTED';
    req.acceptedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();

    const driver = this.drivers.find((d) => d.driverId === driverId);
    if (driver) {
      driver.activeRequestId = requestId;
    }

    this.addQrEvent({
      consignmentId: req.consignmentId,
      requestId: req.requestId,
      action: 'ACCEPTED',
      statusBefore: 'DRIVER_ASSIGNED',
      statusAfter: 'DRIVER_ACCEPTED',
      userId: driverId,
      userName,
      role: 'DRIVER',
      deviceInfo: 'Driver Mobile App v1.0',
      remarks: `Driver accepted job. En route to ${req.hospitalName}`,
    });

    this.addNotification({
      recipientRole: 'HOSPITAL',
      title: 'Driver Accepted Pickup',
      message: `${req.assignment?.driverName || 'Driver'} accepted consignment ${req.consignmentId} and is navigating to your hospital.`,
      type: 'INFO',
      requestId: req.requestId,
      consignmentId: req.consignmentId,
    });

    this.syncDocument('pickupRequests', requestId, req).catch(() => {});
    this.notify();
  }

  // 3. DRIVER ARRIVES AT HOSPITAL / STARTS PICKUP
  startPickup(requestId: string, driverId: string, userName: string) {
    const req = this.pickupRequests.find((r) => r.requestId === requestId);
    if (!req) throw new Error('Pickup request not found.');

    req.status = 'PICKUP_IN_PROGRESS';
    req.updatedAt = new Date().toISOString();

    this.syncDocument('pickupRequests', requestId, req).catch(() => {});
    this.notify();
  }

  // 4. VERIFY QR AND CONFIRM COLLECTION (At Hospital)
  verifyAndCollectWaste(requestId: string, scannedTokenOrPayload: string, driverId: string, userName: string) {
    const req = this.pickupRequests.find((r) => r.requestId === requestId);
    if (!req) throw new Error('Consignment request not found.');

    // Security Verification: Token or JSON verification
    let isValid = false;
    if (scannedTokenOrPayload === req.verificationToken || scannedTokenOrPayload.includes(req.consignmentId)) {
      isValid = true;
    } else {
      try {
        const parsed = JSON.parse(scannedTokenOrPayload);
        if (parsed.consignmentId === req.consignmentId) isValid = true;
      } catch (e) {
        // Not JSON
      }
    }

    if (!isValid) {
      this.addAnomaly({
        type: 'INVALID_QR',
        severity: 'HIGH',
        requestId: req.requestId,
        consignmentId: req.consignmentId,
        description: `Invalid or mismatched QR code scanned by driver at ${req.hospitalName}.`,
      });
      throw new Error('QR code verification failed! Token does not match this consignment.');
    }

    if (req.status === 'PICKED_UP' || req.status === 'IN_TRANSIT' || req.status === 'CLOSED') {
      this.addAnomaly({
        type: 'DUPLICATE_QR_SCAN',
        severity: 'MEDIUM',
        requestId: req.requestId,
        consignmentId: req.consignmentId,
        description: `Duplicate pickup collection scan attempted for already collected consignment ${req.consignmentId}.`,
      });
      throw new Error('Consignment has already been collected.');
    }

    req.status = 'PICKED_UP';
    req.pickedUpAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();

    // Update vehicle load
    if (req.assignment?.vehicleId) {
      const veh = this.vehicles.find((v) => v.vehicleId === req.assignment?.vehicleId);
      if (veh) {
        veh.currentLoadKg = Number(((veh.currentLoadKg || 0) + req.totalWeightKg).toFixed(1));
        veh.status = 'IN_TRANSIT';
      }
    }

    this.addQrEvent({
      consignmentId: req.consignmentId,
      requestId: req.requestId,
      action: 'COLLECTED',
      statusBefore: 'DRIVER_ACCEPTED',
      statusAfter: 'PICKED_UP',
      userId: driverId,
      userName,
      role: 'DRIVER',
      latitude: req.hospitalLat,
      longitude: req.hospitalLng,
      deviceInfo: 'Driver Camera Scanner / GPS Active',
      remarks: `Waste verified & custody transferred: ${req.totalBagsCount} bags, ${req.totalWeightKg} kg`,
    });

    this.addNotification({
      recipientRole: 'HOSPITAL',
      title: 'Waste Collected by Driver',
      message: `Driver ${req.assignment?.driverName} has verified and loaded consignment ${req.consignmentId} (${req.totalWeightKg} kg).`,
      type: 'SUCCESS',
      requestId: req.requestId,
      consignmentId: req.consignmentId,
    });

    this.addNotification({
      recipientRole: 'PLANT',
      title: 'Incoming Waste Consignment',
      message: `Vehicle ${req.assignment?.vehicleNumber} loaded ${req.totalWeightKg} kg from ${req.hospitalName} and is preparing transit.`,
      type: 'INFO',
      requestId: req.requestId,
      consignmentId: req.consignmentId,
    });

    this.syncDocument('pickupRequests', requestId, req).catch(() => {});
    this.notify();
    return req;
  }

  // 5. NAVIGATE TO TREATMENT PLANT (IN_TRANSIT)
  startTransitToPlant(requestId: string, driverId: string, userName: string) {
    const req = this.pickupRequests.find((r) => r.requestId === requestId);
    if (!req) throw new Error('Consignment request not found.');

    req.status = 'IN_TRANSIT';
    req.inTransitAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();

    // Set intermediate simulation GPS
    req.currentSimulatedLat = Number(((req.hospitalLat + (req.plantLat || 16.62)) / 2).toFixed(4));
    req.currentSimulatedLng = Number(((req.hospitalLng + (req.plantLng || 80.535)) / 2).toFixed(4));

    this.addQrEvent({
      consignmentId: req.consignmentId,
      requestId: req.requestId,
      action: 'IN_TRANSIT',
      statusBefore: 'PICKED_UP',
      statusAfter: 'IN_TRANSIT',
      userId: driverId,
      userName,
      role: 'DRIVER',
      latitude: req.currentSimulatedLat,
      longitude: req.currentSimulatedLng,
      deviceInfo: 'Vehicle Telematics Unit',
      remarks: `Vehicle en route to ${req.plantName || 'Treatment Plant'}`,
    });

    this.syncDocument('pickupRequests', requestId, req).catch(() => {});
    this.notify();
  }

  // 6. ARRIVE AT TREATMENT PLANT
  arriveAtPlant(requestId: string, driverId: string, userName: string) {
    const req = this.pickupRequests.find((r) => r.requestId === requestId);
    if (!req) throw new Error('Consignment request not found.');

    req.status = 'PLANT_ARRIVED';
    req.plantArrivedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();

    this.addQrEvent({
      consignmentId: req.consignmentId,
      requestId: req.requestId,
      action: 'ARRIVED',
      statusBefore: 'IN_TRANSIT',
      statusAfter: 'PLANT_ARRIVED',
      userId: driverId,
      userName,
      role: 'DRIVER',
      latitude: req.plantLat,
      longitude: req.plantLng,
      deviceInfo: 'Gate RFID / Driver Check-in',
      remarks: `Arrived at ${req.plantName}. Awaiting weighbridge intake scan.`,
    });

    this.addNotification({
      recipientRole: 'PLANT',
      title: 'Vehicle Arrived at Gate',
      message: `Driver ${req.assignment?.driverName} (${req.assignment?.vehicleNumber}) has arrived with consignment ${req.consignmentId}. Ready for scan.`,
      type: 'INFO',
      requestId: req.requestId,
      consignmentId: req.consignmentId,
    });

    this.syncDocument('pickupRequests', requestId, req).catch(() => {});
    this.notify();
  }

  // 7. TREATMENT PLANT RECEIVES & WEIGHS WASTE
  receiveWasteAtPlant(
    requestId: string,
    receivedWeightKg: number,
    operatorId: string,
    operatorName: string,
    remarks?: string
  ) {
    const req = this.pickupRequests.find((r) => r.requestId === requestId);
    if (!req) throw new Error('Consignment request not found.');

    const discrepancy = Number((receivedWeightKg - req.totalWeightKg).toFixed(1));
    const discrepancyPercent = Math.abs((discrepancy / req.totalWeightKg) * 100);

    req.receivedWeightKg = receivedWeightKg;
    req.weightDiscrepancyKg = discrepancy;
    req.status = 'PLANT_RECEIVED';
    req.plantReceivedAt = new Date().toISOString();
    req.operatorId = operatorId;
    req.operatorRemarks = remarks;
    req.updatedAt = new Date().toISOString();

    // Check weight discrepancy anomaly threshold
    if (discrepancyPercent > this.settings.weightMismatchThresholdPercent) {
      req.weightMismatchAnomaly = true;
      this.addAnomaly({
        type: 'WEIGHT_MISMATCH',
        severity: discrepancyPercent > 10 ? 'HIGH' : 'MEDIUM',
        requestId: req.requestId,
        consignmentId: req.consignmentId,
        description: `Weight mismatch of ${discrepancy >= 0 ? '+' : ''}${discrepancy} kg (${discrepancyPercent.toFixed(1)}%) detected at plant weighbridge. Dispatched: ${req.totalWeightKg} kg, Received: ${receivedWeightKg} kg.`,
      });
    }

    this.addQrEvent({
      consignmentId: req.consignmentId,
      requestId: req.requestId,
      action: 'RECEIVED',
      statusBefore: 'PLANT_ARRIVED',
      statusAfter: 'PLANT_RECEIVED',
      userId: operatorId,
      userName: operatorName,
      role: 'PLANT',
      latitude: req.plantLat,
      longitude: req.plantLng,
      deviceInfo: 'Plant Industrial Weighbridge Scale #1',
      remarks: `Received & verified. Scale reading: ${receivedWeightKg} kg (Expected: ${req.totalWeightKg} kg). Discrepancy: ${discrepancy} kg`,
    });

    this.addNotification({
      recipientRole: 'DRIVER',
      recipientUserId: req.assignment?.driverId,
      title: 'Plant Delivery Confirmed',
      message: `Treatment plant confirmed intake of consignment ${req.consignmentId}. Received weight: ${receivedWeightKg} kg.`,
      type: 'SUCCESS',
      requestId: req.requestId,
      consignmentId: req.consignmentId,
    });

    this.syncDocument('pickupRequests', requestId, req).catch(() => {});
    this.notify();
    return req;
  }

  // 8. START TREATMENT
  startTreatment(
    requestId: string,
    method: 'HIGH_TEMP_INCINERATION' | 'AUTOCLAVING_SHREDDING' | 'CHEMICAL_DISINFECTION' | 'ENCAPSULATION_SANITARY_LANDFILL',
    operatorId: string,
    operatorName: string
  ) {
    const req = this.pickupRequests.find((r) => r.requestId === requestId);
    if (!req) throw new Error('Consignment request not found.');

    req.status = 'UNDER_TREATMENT';
    req.treatmentMethod = method;
    req.treatmentStartedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();

    this.addQrEvent({
      consignmentId: req.consignmentId,
      requestId: req.requestId,
      action: 'TREATMENT_STARTED',
      statusBefore: 'PLANT_RECEIVED',
      statusAfter: 'UNDER_TREATMENT',
      userId: operatorId,
      userName: operatorName,
      role: 'PLANT',
      deviceInfo: `Treatment Facility Unit [${method}]`,
      remarks: `Commenced treatment method: ${method.replace(/_/g, ' ')}`,
    });

    this.syncDocument('pickupRequests', requestId, req).catch(() => {});
    this.notify();
  }

  // 9. COMPLETE TREATMENT
  completeTreatment(requestId: string, operatorId: string, operatorName: string) {
    const req = this.pickupRequests.find((r) => r.requestId === requestId);
    if (!req) throw new Error('Consignment request not found.');

    req.status = 'TREATED';
    req.treatmentCompletedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();

    this.addQrEvent({
      consignmentId: req.consignmentId,
      requestId: req.requestId,
      action: 'TREATMENT_COMPLETED',
      statusBefore: 'UNDER_TREATMENT',
      statusAfter: 'TREATED',
      userId: operatorId,
      userName: operatorName,
      role: 'PLANT',
      deviceInfo: 'Plant Supervisory Control System',
      remarks: 'Thermal / mechanical treatment process cycle completed with zero biological residue indicators.',
    });

    this.syncDocument('pickupRequests', requestId, req).catch(() => {});
    this.notify();
  }

  // 10. DISPOSE / PROCESS & CLOSE CONSIGNMENT
  disposeAndCloseConsignment(requestId: string, operatorId: string, operatorName: string, remarks?: string) {
    const req = this.pickupRequests.find((r) => r.requestId === requestId);
    if (!req) throw new Error('Consignment request not found.');

    req.status = 'CLOSED';
    req.disposedAt = new Date().toISOString();
    req.closedAt = new Date().toISOString();
    req.operatorRemarks = remarks || req.operatorRemarks;
    req.updatedAt = new Date().toISOString();

    // Release driver and vehicle load
    if (req.assignment?.driverId) {
      const driver = this.drivers.find((d) => d.driverId === req.assignment?.driverId);
      if (driver && driver.activeRequestId === requestId) {
        driver.activeRequestId = undefined;
        driver.totalPickups = (driver.totalPickups || 0) + 1;
      }
    }

    if (req.assignment?.vehicleId) {
      const veh = this.vehicles.find((v) => v.vehicleId === req.assignment?.vehicleId);
      if (veh) {
        veh.currentLoadKg = Math.max(0, Number(((veh.currentLoadKg || 0) - req.totalWeightKg).toFixed(1)));
        veh.status = 'AVAILABLE';
      }
    }

    this.addQrEvent({
      consignmentId: req.consignmentId,
      requestId: req.requestId,
      action: 'CLOSED',
      statusBefore: 'TREATED',
      statusAfter: 'CLOSED',
      userId: operatorId,
      userName: operatorName,
      role: 'PLANT',
      deviceInfo: 'Central Regulatory Ledger',
      remarks: 'Consignment chain of custody closed. Secure disposal manifest issued.',
    });

    // Notify Hospital & Admin
    this.addNotification({
      recipientRole: 'HOSPITAL',
      recipientUserId: req.createdByUserId,
      title: 'Waste Treatment Completed',
      message: `Consignment ${req.consignmentId} (${req.totalWeightKg} kg) from ${req.hospitalName} has been fully treated and disposed in compliance with CPCB norms.`,
      type: 'SUCCESS',
      requestId: req.requestId,
      consignmentId: req.consignmentId,
    });

    this.addNotification({
      recipientRole: 'ADMIN',
      title: 'Consignment Closed',
      message: `Full chain of custody closed for ${req.consignmentId}. Treatment: ${req.treatmentMethod?.replace(/_/g, ' ')}.`,
      type: 'SUCCESS',
      requestId: req.requestId,
      consignmentId: req.consignmentId,
    });

    this.syncDocument('pickupRequests', requestId, req).catch(() => {});
    this.notify();
  }

  // Audit Events
  addQrEvent(event: Omit<QrEvent, 'eventId' | 'timestamp'>) {
    const fullEvent: QrEvent = {
      ...event,
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.qrEvents.unshift(fullEvent);
    this.syncDocument('qrEvents', fullEvent.eventId, fullEvent).catch(() => {});
    this.notify();
  }

  // Notifications
  addNotification(notif: Omit<NotificationItem, 'notificationId' | 'read' | 'createdAt'>) {
    const fullNotif: NotificationItem = {
      ...notif,
      notificationId: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(fullNotif);
    this.syncDocument('notifications', fullNotif.notificationId, fullNotif).catch(() => {});
    this.notify();
  }

  markNotificationAsRead(id: string) {
    const n = this.notifications.find((item) => item.notificationId === id);
    if (n) {
      n.read = true;
      this.syncDocument('notifications', id, { read: true }).catch(() => {});
      this.notify();
    }
  }

  markAllNotificationsAsRead() {
    this.notifications.forEach((n) => (n.read = true));
    this.notify();
  }

  // Anomalies
  addAnomaly(anomaly: Omit<Anomaly, 'anomalyId' | 'detectedAt' | 'status'>) {
    const fullAnomaly: Anomaly = {
      ...anomaly,
      anomalyId: `anom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'OPEN',
      detectedAt: new Date().toISOString(),
    };
    this.anomalies.unshift(fullAnomaly);
    this.syncDocument('anomalies', fullAnomaly.anomalyId, fullAnomaly).catch(() => {});
    this.notify();
  }

  resolveAnomaly(anomalyId: string, resolution: string, assignedTo: string) {
    const a = this.anomalies.find((item) => item.anomalyId === anomalyId);
    if (a) {
      a.status = 'RESOLVED';
      a.resolution = resolution;
      a.assignedTo = assignedTo;
      a.resolvedAt = new Date().toISOString();
      this.syncDocument('anomalies', anomalyId, a).catch(() => {});
      this.notify();
    }
  }

  // Seed / Reset
  resetToDemoSeed() {
    this.hospitals = [...SEED_HOSPITALS];
    this.drivers = [...SEED_DRIVERS];
    this.vehicles = [...SEED_VEHICLES];
    this.treatmentPlants = [...SEED_TREATMENT_PLANTS];
    this.wasteCategories = [...SEED_WASTE_CATEGORIES];
    this.pickupRequests = [...INITIAL_PICKUP_REQUESTS];
    this.qrEvents = [];
    this.seedInitialQrEvents();
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.anomalies = [...INITIAL_ANOMALIES];
    this.historicalWasteRecords = generate90DaysWasteHistory();
    this.notify();
  }
}

export const store = new MediCycleStore();
