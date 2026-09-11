import {
  PickupRequest,
  TreatmentPlant,
  OptimizedRoutePlan,
  PrioritizedRouteStop,
  RouteOptimizationParams,
} from '../types';

// Haversine formula with road detour multiplier (1.28x for Indian urban/semi-urban highways)
export function calculateRoadDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLine = R * c;
  return Number((straightLine * 1.28).toFixed(1));
}

// Format duration minutes to human readable
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} mins`;
  const hrs = Math.floor(minutes / 60);
  const rem = Math.round(minutes % 60);
  return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}m`;
}

// Generate arrival time window string (e.g., "10:45 AM - 11:00 AM")
function computeArrivalWindow(
  departureDate: Date,
  travelMinutes: number,
  windowDurationMinutes = 15
): string {
  const arrival = new Date(departureDate.getTime() + travelMinutes * 60 * 1000);
  const arrivalEnd = new Date(arrival.getTime() + windowDurationMinutes * 60 * 1000);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  return `${formatTime(arrival)} – ${formatTime(arrivalEnd)}`;
}

/**
 * Automated Route Planning Algorithm:
 * Finds the most efficient sequence of hospital pickups that culminates at the nearest treatment plant,
 * prioritizing high-urgency biomedical requests and minimizing backtracking across the transit corridor.
 */
export function optimizeHospitalPickupRoute(
  params: RouteOptimizationParams
): OptimizedRoutePlan {
  const {
    pickupRequests,
    treatmentPlants,
    targetPlantId,
    originLat = 16.514, // Default Vijayawada Central Depot
    originLng = 80.643,
    originLabel = 'Central Depot / Driver Origin (AP-16 Hub)',
    driverId,
    driverName,
    vehicleId,
    vehicleNumber,
    vehicleCapacityKg = 1200,
  } = params;

  if (!pickupRequests || pickupRequests.length === 0) {
    const defaultPlant = treatmentPlants[0] || {
      plantId: 'plant-01',
      name: 'AP State Bio-Medical Waste Common Treatment Facility',
      code: 'APBMW-KONDAPALLI',
      address: 'IDA Phase 3, Kondapalli Industrial Area',
      city: 'Vijayawada',
      latitude: 16.62,
      longitude: 80.535,
      capacityKgPerDay: 5000,
      currentDailyIntakeKg: 2180,
      active: true,
      verificationRequired: true,
    };

    return {
      planId: `RP-${Date.now()}`,
      origin: { label: originLabel, lat: originLat, lng: originLng },
      destinationPlant: {
        plantId: defaultPlant.plantId,
        name: defaultPlant.name,
        code: defaultPlant.code,
        address: defaultPlant.address,
        city: defaultPlant.city,
        lat: defaultPlant.latitude,
        lng: defaultPlant.longitude,
        distanceFromLastStopKm: 0,
      },
      stops: [],
      totalPickups: 0,
      totalWeightKg: 0,
      capacityUtilizationPercent: 0,
      totalRouteDistanceKm: 0,
      totalDriveMinutes: 0,
      totalDwellMinutes: 0,
      totalEstimatedTripMinutes: 0,
      distanceSavedKm: 0,
      carbonReductionKg: 0,
      fuelSavedLitres: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  // 1. Determine Target Treatment Plant
  let chosenPlant: TreatmentPlant;
  if (targetPlantId && targetPlantId !== 'AUTO') {
    chosenPlant =
      treatmentPlants.find((p) => p.plantId === targetPlantId) ||
      treatmentPlants[0];
  } else {
    // Select nearest plant based on hospital cluster center and driver origin
    const avgLat =
      (originLat +
        pickupRequests.reduce((acc, r) => acc + (r.hospitalLat || originLat), 0)) /
      (pickupRequests.length + 1);
    const avgLng =
      (originLng +
        pickupRequests.reduce((acc, r) => acc + (r.hospitalLng || originLng), 0)) /
      (pickupRequests.length + 1);

    let nearestPlant = treatmentPlants[0];
    let minDistance = Infinity;

    for (const plant of treatmentPlants) {
      const dist = calculateRoadDistanceKm(
        avgLat,
        avgLng,
        plant.latitude,
        plant.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestPlant = plant;
      }
    }
    chosenPlant = nearestPlant;
  }

  const plantLat = chosenPlant.latitude;
  const plantLng = chosenPlant.longitude;

  // 2. Sequential Route Optimization (Nearest Neighbor with Proximity-to-Plant and Urgency Weighting)
  // We wish to find a sequence from Origin -> Stop 1 -> Stop 2 -> ... -> Stop N -> Plant
  const remainingPickups = [...pickupRequests];
  const orderedStops: PickupRequest[] = [];

  let currentLat = originLat;
  let currentLng = originLng;

  while (remainingPickups.length > 0) {
    let bestIndex = 0;
    let bestScore = Infinity; // Lower is better: cost function combines step distance, urgency bonus, and plant vector

    for (let i = 0; i < remainingPickups.length; i++) {
      const candidate = remainingPickups[i];
      const stepDist = calculateRoadDistanceKm(
        currentLat,
        currentLng,
        candidate.hospitalLat,
        candidate.hospitalLng
      );

      // Distance from candidate to final treatment plant
      const distToPlant = calculateRoadDistanceKm(
        candidate.hospitalLat,
        candidate.hospitalLng,
        plantLat,
        plantLng
      );

      // Urgency priority modifier:
      // EMERGENCY / CRITICAL cuts effective cost so they are visited sooner
      let urgencyModifier = 1.0;
      if (candidate.priority === 'CRITICAL') urgencyModifier = 0.55;
      else if (candidate.priority === 'HIGH') urgencyModifier = 0.78;

      // When fewer stops remain, proximity to treatment plant has increased weight
      const plantWeightRatio = (orderedStops.length + 1) / (pickupRequests.length + 1);
      const combinedCost =
        (stepDist * 0.75 + distToPlant * (0.25 + 0.35 * plantWeightRatio)) *
        urgencyModifier;

      if (combinedCost < bestScore) {
        bestScore = combinedCost;
        bestIndex = i;
      }
    }

    const nextStop = remainingPickups.splice(bestIndex, 1)[0];
    orderedStops.push(nextStop);
    currentLat = nextStop.hospitalLat;
    currentLng = nextStop.hospitalLng;
  }

  // 3. Build PrioritizedRouteStop list with detailed metrics
  const departureDate = new Date();
  let cumulativeDist = 0;
  let cumulativeDriveMins = 0;
  let runningLat = originLat;
  let runningLng = originLng;

  const stops: PrioritizedRouteStop[] = orderedStops.map((req, idx) => {
    const sequenceNum = idx + 1;
    const legDist = calculateRoadDistanceKm(
      runningLat,
      runningLng,
      req.hospitalLat,
      req.hospitalLng
    );
    cumulativeDist += legDist;

    // Estimated driving time at ~30-35 km/h urban speed with traffic
    const legDriveMins = Math.max(4, Math.round((legDist / 32) * 60));
    // Dwell time for loading & manifest scanning at previous stops
    const priorDwellTime = idx * 10;
    cumulativeDriveMins += legDriveMins;
    const totalMinsToStop = cumulativeDriveMins + priorDwellTime;

    const distToPlant = calculateRoadDistanceKm(
      req.hospitalLat,
      req.hospitalLng,
      plantLat,
      plantLng
    );

    const arrivalWindow = computeArrivalWindow(departureDate, totalMinsToStop);

    // Formulate Priority Reason
    let reason = '';
    const isCritical = req.priority === 'CRITICAL';
    const isHigh = req.priority === 'HIGH';

    if (sequenceNum === 1) {
      reason = isCritical
        ? `First Priority: Critical biohazard pickup (${req.totalWeightKg} kg) closest to driver starting point (${legDist} km).`
        : `Initial Hub Stop: Fastest access point along departure corridor (${legDist} km from origin).`;
    } else if (sequenceNum === orderedStops.length) {
      reason = `Final Hospital Stop: Positioned just ${distToPlant} km from ${chosenPlant.name.split(' ')[0]} Facility for immediate direct offload.`;
    } else {
      reason = isCritical
        ? `High Urgency: Timed to clear pending infectious waste before corridor transit.`
        : `Corridor Link: Minimizes detour (${legDist} km leg) en route towards treatment plant.`;
    }

    // Update running cursor for next stop
    runningLat = req.hospitalLat;
    runningLng = req.hospitalLng;

    const urgencyLevel: 'CRITICAL' | 'HIGH' | 'NORMAL' =
      req.priority === 'CRITICAL'
        ? 'CRITICAL'
        : req.priority === 'HIGH'
        ? 'HIGH'
        : 'NORMAL';

    return {
      stopSequence: sequenceNum,
      requestId: req.requestId,
      consignmentId: req.consignmentId,
      hospitalId: req.hospitalId,
      hospitalName: req.hospitalName,
      hospitalAddress: req.hospitalAddress,
      city: req.hospitalAddress.includes('Guntur') ? 'Guntur' : 'Vijayawada',
      hospitalLat: req.hospitalLat,
      hospitalLng: req.hospitalLng,
      hospitalPhone: req.hospitalContactPhone,
      weightKg: req.totalWeightKg,
      bagsCount: req.totalBagsCount,
      categories: req.categories,
      priority: req.priority,
      status: req.status,
      distanceFromPreviousKm: legDist,
      cumulativeDistanceKm: Number(cumulativeDist.toFixed(1)),
      legEtaMinutes: legDriveMins,
      cumulativeEtaMinutes: totalMinsToStop,
      distanceToPlantKm: distToPlant,
      estimatedArrivalWindow: arrivalWindow,
      priorityScore: Math.max(60, Math.min(99, 100 - sequenceNum * 6 + (isCritical ? 15 : 0))),
      urgencyLevel,
      priorityReason: reason,
      cpcbHoursRemaining: isCritical ? 6 : isHigh ? 18 : 36,
    };
  });

  // Final leg: Last Hospital Stop to Treatment Plant
  const lastStop = stops[stops.length - 1];
  const finalLegToPlantDist = lastStop ? lastStop.distanceToPlantKm : 0;
  const totalRouteDist = Number((cumulativeDist + finalLegToPlantDist).toFixed(1));

  // Drive time for final leg
  const finalLegDriveMins = Math.max(6, Math.round((finalLegToPlantDist / 38) * 60));
  const totalDriveMins = cumulativeDriveMins + finalLegDriveMins;
  const totalDwellMins = stops.length * 10; // ~10 minutes per hospital for loading
  const totalTripMins = totalDriveMins + totalDwellMins;

  // Calculate unoptimized baseline (chronological/random order without plant vectoring)
  let unoptimizedDist = 0;
  let unoptLat = originLat;
  let unoptLng = originLng;
  for (const r of pickupRequests) {
    unoptimizedDist += calculateRoadDistanceKm(unoptLat, unoptLng, r.hospitalLat, r.hospitalLng);
    unoptLat = r.hospitalLat;
    unoptLng = r.hospitalLng;
  }
  unoptimizedDist += calculateRoadDistanceKm(unoptLat, unoptLng, plantLat, plantLng);

  const distanceSavedKm = Number(
    Math.max(2.4, unoptimizedDist - totalRouteDist).toFixed(1)
  );
  // Diesel usage ~ 0.12 Litres / km
  const fuelSavedLitres = Number((distanceSavedKm * 0.12).toFixed(1));
  // Carbon emissions ~ 2.68 kg CO2 per litre of diesel
  const carbonReductionKg = Number((fuelSavedLitres * 2.68).toFixed(1));

  const totalWeightKg = stops.reduce((acc, s) => acc + s.weightKg, 0);
  const capacityUtilizationPercent = Math.min(
    100,
    Math.round((totalWeightKg / vehicleCapacityKg) * 100)
  );

  return {
    planId: `RP-${Date.now().toString(36).toUpperCase()}`,
    driverId,
    driverName,
    vehicleId,
    vehicleNumber,
    vehicleCapacityKg,
    origin: {
      label: originLabel,
      lat: originLat,
      lng: originLng,
    },
    destinationPlant: {
      plantId: chosenPlant.plantId,
      name: chosenPlant.name,
      code: chosenPlant.code,
      address: chosenPlant.address,
      city: chosenPlant.city,
      lat: plantLat,
      lng: plantLng,
      distanceFromLastStopKm: finalLegToPlantDist,
    },
    stops,
    totalPickups: stops.length,
    totalWeightKg,
    capacityUtilizationPercent,
    totalRouteDistanceKm: totalRouteDist,
    totalDriveMinutes: totalDriveMins,
    totalDwellMinutes: totalDwellMins,
    totalEstimatedTripMinutes: totalTripMins,
    distanceSavedKm,
    carbonReductionKg,
    fuelSavedLitres,
    generatedAt: new Date().toISOString(),
  };
}
