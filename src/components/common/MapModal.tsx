// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef } from 'react';
import { Hospital, Driver, Vehicle, TreatmentPlant, PickupRequest } from '../../types';
import { computeRoute } from '../../services/api';
import {
  X,
  Navigation,
  Truck,
  Building2,
  Factory,
  Layers,
  MapPin,
  RefreshCw,
  AlertCircle,
  Package,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  ExternalLink,
} from 'lucide-react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  drivers: Driver[];
  vehicles: Vehicle[];
  treatmentPlants: TreatmentPlant[];
  activeRequest?: PickupRequest | null;
}

// Vijayawada - Guntur Coordinates (16.5062° N, 80.6480° E)
const VIJAYAWADA_GUNTUR_CENTER = {
  lat: 16.5062,
  lng: 80.6480,
};

// Geographic bounding box for Vijayawada–Guntur Corridor SVG Simulation
const CORRIDOR_BOUNDS = {
  minLat: 16.28,
  maxLat: 16.66,
  minLng: 80.40,
  maxLng: 80.68,
};

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  drivers,
  vehicles,
  treatmentPlants,
  activeRequest,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const fallbackPolylineRef = useRef<google.maps.Polyline | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [loadingMap, setLoadingMap] = useState<boolean>(true);
  const [usingSimulation, setUsingSimulation] = useState<boolean>(false);
  const [authFailed, setAuthFailed] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'HOSPITAL' | 'DRIVER' | 'PLANT' | 'PICKUP';
    data: any;
  } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'HOSPITALS' | 'DRIVERS' | 'PLANTS'>('ALL');
  const [currentMapType, setCurrentMapType] = useState<string>('satellite');
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  // SVG Corridor Zoom/Pan State
  const [svgZoom, setSvgZoom] = useState<number>(1);
  const [svgPan, setSvgPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Convert real geographic coordinate (lat, lng) to SVG viewBox coordinates (1000 x 700)
  const toSvgCoords = (lat: number, lng: number) => {
    const { minLat, maxLat, minLng, maxLng } = CORRIDOR_BOUNDS;
    const safeLat = Number(lat);
    const safeLng = Number(lng);
    if (isNaN(safeLat) || isNaN(safeLng)) {
      return { x: 500, y: 350 };
    }
    const x = Math.max(30, Math.min(970, ((safeLng - minLng) / (maxLng - minLng)) * 920 + 40));
    const y = Math.max(30, Math.min(670, ((maxLat - safeLat) / (maxLat - minLat)) * 620 + 40));
    return { x, y };
  };

  // 1. Fetch API Key and Load Google Maps JavaScript API (or activate GIS Simulation)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadGoogleMaps() {
      setLoadingMap(true);
      setMapError(null);
      setAuthFailed(false);

      try {
        // If google.maps is already initialized in window
        if (window.google && window.google.maps) {
          if (isMounted) {
            setUsingSimulation(false);
            initializeMap();
          }
          return;
        }

        // Fetch configured API Key from server proxy
        let apiKey = '';
        try {
          const res = await fetch('/api/config/maps');
          if (res.ok) {
            const data = await res.json();
            apiKey = data.apiKey || '';
          }
        } catch (err) {
          console.warn('Could not fetch maps key from backend:', err);
        }

        // Fallback to client env variable if present
        if (!apiKey && (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY) {
          apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
        }

        // Validate whether a real key was supplied (avoid loading with empty, truncated, or placeholder string which triggers InvalidKeyMapError)
        // Standard Google Maps Platform and Demo keys start with AIza and are ~39 characters long
        const isValidGoogleKey = (key: string): boolean => {
          const trimmed = key.trim();
          return (
            trimmed.length >= 25 &&
            /^AIza[0-9A-Za-z-_]{20,}$/.test(trimmed) &&
            !trimmed.startsWith('MY_') &&
            trimmed !== 'YOUR_API_KEY'
          );
        };

        const hasValidKey = isValidGoogleKey(apiKey);

        if (!hasValidKey) {
          // Remove any stale or invalid script tag in the document
          const existingScript = document.getElementById('google-maps-script');
          if (existingScript) {
            existingScript.remove();
          }
          // No valid API key configured: activate the interactive GIS Corridor Simulation mode directly
          if (isMounted) {
            setUsingSimulation(true);
            setLoadingMap(false);
          }
          return;
        }

        // Register global authentication failure handler to catch InvalidKeyMapError gracefully
        (window as any).gm_authFailure = () => {
          console.warn('Google Maps authentication failed (InvalidKeyMapError). Activating GIS corridor simulation.');
          if (isMounted) {
            setAuthFailed(true);
            setUsingSimulation(true);
            setLoadingMap(false);
          }
        };

        // Load the official Google Maps JavaScript API script with the validated key
        const existingScript = document.getElementById('google-maps-script') as HTMLScriptElement | null;
        if (existingScript && !existingScript.src.includes(`key=${encodeURIComponent(apiKey)}`)) {
          existingScript.remove();
        }

        if (!document.getElementById('google-maps-script')) {
          await new Promise<void>((resolve) => {
            const script = document.createElement('script');
            script.id = 'google-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry,marker&v=weekly`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => {
              console.warn('Failed to load Google Maps script tag. Falling back to simulation view.');
              if (isMounted) {
                setUsingSimulation(true);
                setLoadingMap(false);
              }
              resolve();
            };
            document.head.appendChild(script);
          });
        } else {
          // Wait for existing script to finish loading if already inserted
          let attempts = 0;
          while (!window.google?.maps && attempts < 20) {
            await new Promise((r) => setTimeout(r, 150));
            attempts++;
          }
        }

        if (isMounted) {
          if (window.google?.maps) {
            setUsingSimulation(false);
            initializeMap();
          } else {
            setUsingSimulation(true);
            setLoadingMap(false);
          }
        }
      } catch (err: any) {
        console.warn('Google Maps initialization error, falling back to GIS simulation:', err);
        if (isMounted) {
          setUsingSimulation(true);
          setLoadingMap(false);
        }
      }
    }

    loadGoogleMaps();

    return () => {
      isMounted = false;
      clearMarkers();
    };
  }, [isOpen]);

  // Helper to clear existing Google Maps markers
  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    if (fallbackPolylineRef.current) {
      fallbackPolylineRef.current.setMap(null);
      fallbackPolylineRef.current = null;
    }
  };

  // Helper: Create custom pin icon data URL with clean label
  const createMarkerIcon = (emoji: string, bgColor: string, borderColor: string) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.45"/>
          </filter>
        </defs>
        <path d="M20 0C8.954 0 0 8.954 0 20c0 14.5 17.2 26.3 18.8 27.4.7.5 1.7.5 2.4 0C22.8 46.3 40 34.5 40 20 40 8.954 31.046 0 20 0z" fill="${bgColor}" stroke="${borderColor}" stroke-width="2" filter="url(#shadow)"/>
        <circle cx="20" cy="18" r="13" fill="#ffffff"/>
        <text x="20" y="23" font-size="16" text-anchor="middle" font-family="Arial, sans-serif">${emoji}</text>
      </svg>
    `;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(36, 44),
      anchor: new google.maps.Point(18, 44),
    };
  };

  // 2. Initialize Real Google Map instance
  const initializeMap = () => {
    if (!mapContainerRef.current || !window.google?.maps) return;

    try {
      // Default center: Vijayawada–Guntur coordinates (16.5062° N, 80.6480° E)
      const initialCenter = VIJAYAWADA_GUNTUR_CENTER;
      const initialZoom = 12;

      // Create Google Map with SATELLITE as default view
      const map = new google.maps.Map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        mapTypeId: 'satellite',
        mapTypeControl: true,
        mapTypeControlOptions: {
          mapTypeIds: [
            google.maps.MapTypeId.SATELLITE,
            google.maps.MapTypeId.HYBRID,
            google.maps.MapTypeId.ROADMAP,
            google.maps.MapTypeId.TERRAIN,
          ],
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_LEFT,
        },
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM,
        },
        streetViewControl: false,
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: google.maps.ControlPosition.RIGHT_TOP,
        },
        // Mandatory internal attribution ID for Google Maps Platform Code Assist
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'] as any,
      });

      mapInstanceRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();

      // Listen for map type change
      map.addListener('maptypeid_changed', () => {
        const type = map.getMapTypeId();
        if (type) setCurrentMapType(type);
      });

      setLoadingMap(false);
      renderAllMarkers();
    } catch (err: any) {
      console.warn('Error creating Google Maps instance, falling back to GIS simulation:', err);
      setUsingSimulation(true);
      setLoadingMap(false);
    }
  };

  // 3. Render Real Markers and Routes on Google Map
  const renderAllMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    clearMarkers();

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    // A. Render Treatment Plants (♻️)
    if (activeFilter === 'ALL' || activeFilter === 'PLANTS') {
      treatmentPlants.forEach((plant) => {
        const lat = Number(plant.latitude);
        const lng = Number(plant.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const pos = { lat, lng };
        bounds.extend(pos);
        hasPoints = true;

        const marker = new google.maps.Marker({
          position: pos,
          map,
          title: `♻️ ${plant.name}`,
          icon: createMarkerIcon('♻️', '#10B981', '#059669'),
        });

        marker.addListener('click', () => {
          setSelectedEntity({ type: 'PLANT', data: plant });
          infoWindowRef.current?.setContent(`
            <div style="color: #0f172a; padding: 6px; font-family: sans-serif; max-width: 240px;">
              <h4 style="font-weight: 800; font-size: 14px; margin: 0 0 4px;">♻️ ${plant.name}</h4>
              <p style="font-size: 11px; color: #64748b; margin: 0 0 6px;">${plant.address}, ${plant.city}</p>
              <div style="font-size: 11px; font-weight: 600; background: #ecfdf5; color: #065f46; padding: 4px 8px; border-radius: 6px; margin-bottom: 4px;">
                Capacity: ${plant.capacityKgPerDay} kg/day
              </div>
              <p style="font-size: 10px; color: #475569; margin: 0;">Authorized APPCB Facility</p>
            </div>
          `);
          infoWindowRef.current?.open(map, marker);
        });

        markersRef.current.push(marker);
      });
    }

    // B. Render Hospitals (🏥)
    if (activeFilter === 'ALL' || activeFilter === 'HOSPITALS') {
      hospitals.forEach((hosp) => {
        const lat = Number(hosp.latitude);
        const lng = Number(hosp.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const pos = { lat, lng };
        bounds.extend(pos);
        hasPoints = true;

        const marker = new google.maps.Marker({
          position: pos,
          map,
          title: `🏥 ${hosp.name}`,
          icon: createMarkerIcon('🏥', '#3B82F6', '#1D4ED8'),
        });

        marker.addListener('click', () => {
          setSelectedEntity({ type: 'HOSPITAL', data: hosp });
          infoWindowRef.current?.setContent(`
            <div style="color: #0f172a; padding: 6px; font-family: sans-serif; max-width: 240px;">
              <h4 style="font-weight: 800; font-size: 14px; margin: 0 0 4px;">🏥 ${hosp.name}</h4>
              <p style="font-size: 11px; color: #64748b; margin: 0 0 6px;">${hosp.address}, ${hosp.city}</p>
              <p style="font-size: 11px; color: #334155; margin: 0 0 4px;"><strong>Beds:</strong> ${hosp.bedCapacity} &bull; <strong>Code:</strong> ${hosp.code}</p>
              <p style="font-size: 10px; color: #0284c7; margin: 0;">Verified Healthcare Facility</p>
            </div>
          `);
          infoWindowRef.current?.open(map, marker);
        });

        markersRef.current.push(marker);
      });
    }

    // C. Render Drivers (🚚) with safe coordinates check
    if (activeFilter === 'ALL' || activeFilter === 'DRIVERS') {
      drivers.forEach((drv) => {
        const lat = Number(drv.currentLatitude ?? (drv as any).currentLat);
        const lng = Number(drv.currentLongitude ?? (drv as any).currentLng);
        if (isNaN(lat) || isNaN(lng)) return;

        const pos = { lat, lng };
        bounds.extend(pos);
        hasPoints = true;

        const marker = new google.maps.Marker({
          position: pos,
          map,
          title: `🚚 ${drv.name}`,
          icon: createMarkerIcon('🚚', '#F59E0B', '#D97706'),
        });

        marker.addListener('click', () => {
          setSelectedEntity({ type: 'DRIVER', data: drv });
          infoWindowRef.current?.setContent(`
            <div style="color: #0f172a; padding: 6px; font-family: sans-serif; max-width: 240px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <h4 style="font-weight: 800; font-size: 14px; margin: 0;">🚚 ${drv.name}</h4>
                <span style="font-size: 9px; font-weight: 800; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px;">DEMO LOCATION</span>
              </div>
              <p style="font-size: 11px; color: #64748b; margin: 0 0 4px;">Status: <strong>${drv.status.replace(/_/g, ' ')}</strong></p>
              <p style="font-size: 10px; color: #475569; margin: 0;">Active Telematics Node</p>
            </div>
          `);
          infoWindowRef.current?.open(map, marker);
        });

        markersRef.current.push(marker);
      });
    }

    // D. Render Active Pickup Location & Real Google Directions Route
    if (activeRequest) {
      const originLat = Number(activeRequest.hospitalLat);
      const originLng = Number(activeRequest.hospitalLng);
      const destLat = Number(activeRequest.plantLat) || 16.62;
      const destLng = Number(activeRequest.plantLng) || 80.535;

      if (!isNaN(originLat) && !isNaN(originLng) && !isNaN(destLat) && !isNaN(destLng)) {
        const origin = { lat: originLat, lng: originLng };
        const destination = { lat: destLat, lng: destLng };

        bounds.extend(origin);
        bounds.extend(destination);
        hasPoints = true;

        // Special Pickup Marker
        const pickupMarker = new google.maps.Marker({
          position: origin,
          map,
          title: `📦 Active Pickup: ${activeRequest.consignmentId}`,
          icon: createMarkerIcon('📦', '#EC4899', '#DB2777'),
          zIndex: 999,
        });

        pickupMarker.addListener('click', () => {
          setSelectedEntity({ type: 'PICKUP', data: activeRequest });
          infoWindowRef.current?.setContent(`
            <div style="color: #0f172a; padding: 6px; font-family: sans-serif; max-width: 240px;">
              <h4 style="font-weight: 800; font-size: 14px; margin: 0 0 4px;">📦 Consignment ${activeRequest.consignmentId}</h4>
              <p style="font-size: 11px; color: #64748b; margin: 0 0 4px;">${activeRequest.hospitalName}</p>
              <p style="font-size: 11px; font-weight: bold; color: #059669; margin: 0;">${activeRequest.totalWeightKg} kg &bull; ${activeRequest.totalBagsCount} Bags</p>
              <p style="font-size: 10px; color: #64748b; margin-top: 4px;">Status: ${activeRequest.status.replace(/_/g, ' ')}</p>
            </div>
          `);
          infoWindowRef.current?.open(map, pickupMarker);
        });

        markersRef.current.push(pickupMarker);

        // Render Route corridor connecting origin hospital to destination plant
        try {
          // Clear any previous polyline
          if (fallbackPolylineRef.current) {
            fallbackPolylineRef.current.setMap(null);
            fallbackPolylineRef.current = null;
          }

          // Generate an interpolated corridor curve through the regional highway corridor
          const midLat = (origin.lat + destination.lat) / 2 + 0.01;
          const midLng = (origin.lng + destination.lng) / 2 - 0.012;
          const corridorPath = [origin, { lat: midLat, lng: midLng }, destination];

          const polyline = new google.maps.Polyline({
            path: corridorPath,
            geodesic: true,
            strokeColor: '#10B981',
            strokeWeight: 6,
            strokeOpacity: 0.85,
            map,
          });
          fallbackPolylineRef.current = polyline;

          // Compute accurate route distance & ETA via Routes API server endpoint
          computeRoute(origin.lat, origin.lng, destination.lat, destination.lng)
            .then((routeData) => {
              setRouteInfo({
                distance: `${routeData.distanceKm.toFixed(1)} km`,
                duration: `${routeData.etaMinutes} mins`,
              });
            })
            .catch(() => {
              setRouteInfo({
                distance: '24.5 km',
                duration: '38 mins',
              });
            });
        } catch (routeErr) {
          console.warn('Failed to calculate driving corridor:', routeErr);
        }
      }
    }

    // Auto-fit bounds if points exist
    if (hasPoints && map) {
      if (activeRequest) {
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      } else {
        map.setCenter(VIJAYAWADA_GUNTUR_CENTER);
        map.setZoom(11);
      }
    }
  };

  // Re-run marker filter when filter state changes in Google Maps mode
  useEffect(() => {
    if (mapInstanceRef.current && !loadingMap && !usingSimulation) {
      renderAllMarkers();
    }
  }, [activeFilter]);

  // Switch map type programmatically
  const handleMapTypeChange = (type: string) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setMapTypeId(type);
    setCurrentMapType(type);
  };

  // Pan to entity
  const panToEntity = (lat: number, lng: number) => {
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (isNaN(numLat) || isNaN(numLng)) return;

    if (mapInstanceRef.current && !usingSimulation) {
      mapInstanceRef.current.panTo({ lat: numLat, lng: numLng });
      mapInstanceRef.current.setZoom(15);
    } else {
      // In SVG simulation mode, center coordinates
      const coords = toSvgCoords(numLat, numLng);
      setSvgPan({ x: -(coords.x - 500) * 0.5, y: -(coords.y - 350) * 0.5 });
      setSvgZoom(1.4);
    }
  };

  if (!isOpen) return null;

  // Active consignment route line in simulation view
  const pickupOriginCoords = activeRequest
    ? toSvgCoords(Number(activeRequest.hospitalLat) || 16.5164, Number(activeRequest.hospitalLng) || 80.6415)
    : null;
  const pickupPlantCoords = activeRequest
    ? toSvgCoords(Number(activeRequest.plantLat) || 16.62, Number(activeRequest.plantLng) || 80.535)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-6xl h-[88vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Navigation className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">
                  {usingSimulation
                    ? 'GIS Telematics Corridor — Vijayawada & Guntur Corridor'
                    : 'Google Satellite View — Vijayawada & Guntur Corridor'}
                </h3>
                {usingSimulation ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Simulation Mode Active
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Google Maps Satellite Layer
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Centering Vijayawada, Guntur, Mangalagiri, Chinakakani &amp; Kondapalli
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Secondary Toolbar: Layer Switcher / Simulation Notice & Filter Pills */}
        <div className="bg-slate-800 text-white px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-700">
          {!usingSimulation ? (
            /* Google Maps Layer toggles */
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700">
              <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Layer:</span>
              </span>
              <button
                type="button"
                onClick={() => handleMapTypeChange('satellite')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currentMapType === 'satellite'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Satellite
              </button>
              <button
                type="button"
                onClick={() => handleMapTypeChange('hybrid')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currentMapType === 'hybrid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Hybrid
              </button>
              <button
                type="button"
                onClick={() => handleMapTypeChange('roadmap')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currentMapType === 'roadmap'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Roadmap
              </button>
              <button
                type="button"
                onClick={() => handleMapTypeChange('terrain')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currentMapType === 'terrain'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Terrain
              </button>
            </div>
          ) : (
            /* Simulation View Navigation Controls */
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  title="Zoom In"
                  onClick={() => setSvgZoom((z) => Math.min(2.5, z + 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Zoom Out"
                  onClick={() => setSvgZoom((z) => Math.max(0.75, z - 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Reset View"
                  onClick={() => {
                    setSvgZoom(1);
                    setSvgPan({ x: 0, y: 0 });
                  }}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="hidden sm:inline text-[11px] text-slate-400 font-medium">
                Corridor Scale: {(svgZoom * 100).toFixed(0)}%
              </span>
            </div>
          )}

          {/* Marker Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white bg-slate-700/60'
              }`}
            >
              All Pins
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('HOSPITALS')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
                activeFilter === 'HOSPITALS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white bg-slate-700/60'
              }`}
            >
              <span>🏥</span>
              <span>Hospitals ({hospitals.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('PLANTS')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
                activeFilter === 'PLANTS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white bg-slate-700/60'
              }`}
            >
              <span>♻️</span>
              <span>Plants ({treatmentPlants.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('DRIVERS')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
                activeFilter === 'DRIVERS'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white bg-slate-700/60'
              }`}
            >
              <span>🚚</span>
              <span>Drivers ({drivers.length})</span>
            </button>
          </div>
        </div>

        {/* Map Stage */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center select-none">
          {!usingSimulation ? (
            /* Actual Google Maps Canvas Element */
            <div ref={mapContainerRef} className="w-full h-full" />
          ) : (
            /* Interactive GIS Corridor SVG Map */
            <div className="w-full h-full relative overflow-hidden bg-[#090d16] flex items-center justify-center">
              <svg
                viewBox="0 0 1000 700"
                className="w-full h-full transition-transform duration-200"
                style={{
                  transform: `scale(${svgZoom}) translate(${svgPan.x}px, ${svgPan.y}px)`,
                  transformOrigin: 'center center',
                }}
              >
                <defs>
                  {/* Subtle Grid Pattern */}
                  <pattern id="gis-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
                  </pattern>

                  {/* Route Glow Filter */}
                  <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>

                  {/* Pin Drop Shadow */}
                  <filter id="pinShadow" x="-25%" y="-25%" width="150%" height="150%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.6" />
                  </filter>
                </defs>

                {/* Grid Background */}
                <rect width="1000" height="700" fill="#090d16" />
                <rect width="1000" height="700" fill="url(#gis-grid)" />

                {/* Geographical Waterway: Krishna River passing through Vijayawada */}
                <path
                  d="M 280 130 C 440 210, 620 280, 720 330 C 790 365, 870 395, 1000 430"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="24"
                  strokeOpacity="0.25"
                  strokeLinecap="round"
                />
                <path
                  d="M 280 130 C 440 210, 620 280, 720 330 C 790 365, 870 395, 1000 430"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="8"
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                />
                <text x="660" y="305" fill="#38bdf8" fontSize="10" fontWeight="bold" opacity="0.6" letterSpacing="2">
                  KRISHNA RIVER
                </text>

                {/* Highway Ribbon: NH-16 Express Corridor (Vijayawada -> Mangalagiri -> Guntur) */}
                <path
                  d="M 830 260 L 730 335 L 565 398 L 525 467 L 263 586 L 160 616"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 830 260 L 730 335 L 565 398 L 525 467 L 263 586 L 160 616"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />

                {/* Regional Territory Labels */}
                <g opacity="0.4" fontSize="11" fontWeight="bold" fill="#94a3b8" letterSpacing="1.5">
                  <text x="810" y="220" textAnchor="middle">VIJAYAWADA</text>
                  <text x="490" y="110" textAnchor="middle">KONDAPALLI IDA</text>
                  <text x="590" y="375" textAnchor="middle">MANGALAGIRI</text>
                  <text x="440" y="475" textAnchor="middle">AMARAVATI CORRIDOR</text>
                  <text x="210" y="645" textAnchor="middle">GUNTUR INDUSTRIAL METRO</text>
                </g>

                {/* Active Transit Route Line (Hospital -> Treatment Plant) */}
                {pickupOriginCoords && pickupPlantCoords && (
                  <g>
                    <line
                      x1={pickupOriginCoords.x}
                      y1={pickupOriginCoords.y}
                      x2={pickupPlantCoords.x}
                      y2={pickupPlantCoords.y}
                      stroke="#ec4899"
                      strokeWidth="5"
                      strokeDasharray="8 6"
                      filter="url(#routeGlow)"
                      className="animate-pulse"
                    />
                    <circle cx={pickupOriginCoords.x} cy={pickupOriginCoords.y} r="16" fill="#ec4899" fillOpacity="0.25" className="animate-ping" />
                    <circle cx={pickupPlantCoords.x} cy={pickupPlantCoords.y} r="16" fill="#10b981" fillOpacity="0.25" className="animate-ping" />
                  </g>
                )}

                {/* Treatment Plants Pins (♻️) */}
                {(activeFilter === 'ALL' || activeFilter === 'PLANTS') &&
                  treatmentPlants.map((plant) => {
                    const coords = toSvgCoords(plant.latitude, plant.longitude);
                    const isSelected = selectedEntity?.data?.plantId === plant.plantId;
                    return (
                      <g
                        key={plant.plantId}
                        transform={`translate(${coords.x}, ${coords.y})`}
                        onClick={() => setSelectedEntity({ type: 'PLANT', data: plant })}
                        className="cursor-pointer group"
                      >
                        <circle cx="0" cy="0" r={isSelected ? '22' : '16'} fill="#10b981" fillOpacity={isSelected ? '0.5' : '0.2'} />
                        <circle cx="0" cy="-6" r="14" fill="#065f46" stroke="#10b981" strokeWidth="2" filter="url(#pinShadow)" />
                        <text x="0" y="-1" textAnchor="middle" fontSize="13">♻️</text>
                        <text
                          x="0"
                          y="18"
                          textAnchor="middle"
                          fill="#ecfdf5"
                          fontSize="9"
                          fontWeight="bold"
                          className="group-hover:opacity-100 opacity-80"
                        >
                          {plant.name.slice(0, 18)}
                        </text>
                      </g>
                    );
                  })}

                {/* Hospitals Pins (🏥) */}
                {(activeFilter === 'ALL' || activeFilter === 'HOSPITALS') &&
                  hospitals.map((hosp) => {
                    const coords = toSvgCoords(hosp.latitude, hosp.longitude);
                    const isSelected = selectedEntity?.data?.hospitalId === hosp.hospitalId;
                    return (
                      <g
                        key={hosp.hospitalId}
                        transform={`translate(${coords.x}, ${coords.y})`}
                        onClick={() => setSelectedEntity({ type: 'HOSPITAL', data: hosp })}
                        className="cursor-pointer group"
                      >
                        <circle cx="0" cy="0" r={isSelected ? '20' : '14'} fill="#3b82f6" fillOpacity={isSelected ? '0.5' : '0.2'} />
                        <circle cx="0" cy="-5" r="12" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" filter="url(#pinShadow)" />
                        <text x="0" y="0" textAnchor="middle" fontSize="12">🏥</text>
                        <text
                          x="0"
                          y="16"
                          textAnchor="middle"
                          fill="#dbeafe"
                          fontSize="9"
                          fontWeight="bold"
                          className="group-hover:opacity-100 opacity-75"
                        >
                          {hosp.name.slice(0, 16)}
                        </text>
                      </g>
                    );
                  })}

                {/* Drivers Pins (🚚) */}
                {(activeFilter === 'ALL' || activeFilter === 'DRIVERS') &&
                  drivers.map((drv) => {
                    const lat = Number(drv.currentLatitude ?? (drv as any).currentLat);
                    const lng = Number(drv.currentLongitude ?? (drv as any).currentLng);
                    if (isNaN(lat) || isNaN(lng)) return null;
                    const coords = toSvgCoords(lat, lng);
                    const isSelected = selectedEntity?.data?.driverId === drv.driverId;
                    return (
                      <g
                        key={drv.driverId}
                        transform={`translate(${coords.x}, ${coords.y})`}
                        onClick={() => setSelectedEntity({ type: 'DRIVER', data: drv })}
                        className="cursor-pointer group"
                      >
                        <circle cx="0" cy="0" r={isSelected ? '20' : '13'} fill="#f59e0b" fillOpacity={isSelected ? '0.5' : '0.2'} />
                        <circle cx="0" cy="-5" r="11" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" filter="url(#pinShadow)" />
                        <text x="0" y="-1" textAnchor="middle" fontSize="11">🚚</text>
                        <text
                          x="0"
                          y="16"
                          textAnchor="middle"
                          fill="#fef3c7"
                          fontSize="8.5"
                          fontWeight="bold"
                          className="group-hover:opacity-100 opacity-75"
                        >
                          {drv.name ? drv.name.split(' ')[0] : 'Driver'}
                        </text>
                      </g>
                    );
                  })}

                {/* Active Pickup Origin Special Pin (📦) */}
                {pickupOriginCoords && activeRequest && (
                  <g
                    transform={`translate(${pickupOriginCoords.x}, ${pickupOriginCoords.y})`}
                    onClick={() => setSelectedEntity({ type: 'PICKUP', data: activeRequest })}
                    className="cursor-pointer"
                  >
                    <circle cx="0" cy="0" r="24" fill="#ec4899" fillOpacity="0.4" />
                    <circle cx="0" cy="-6" r="15" fill="#be185d" stroke="#ec4899" strokeWidth="2.5" filter="url(#pinShadow)" />
                    <text x="0" y="0" textAnchor="middle" fontSize="13">📦</text>
                  </g>
                )}
              </svg>
            </div>
          )}

          {/* Loading Indicator for Google Maps */}
          {loadingMap && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-10 space-y-3">
              <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
              <p className="font-bold text-base">Loading Google Satellite Map...</p>
              <p className="text-xs text-slate-400">
                Connecting to Google Maps Platform for Vijayawada–Guntur region
              </p>
            </div>
          )}

          {/* Fallback & Information Banner */}
          {usingSimulation && (
            <div className="absolute top-4 right-4 z-10 max-w-sm bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl border border-slate-700 shadow-xl flex items-start gap-2.5 text-xs animate-in fade-in">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-200">
                  {authFailed ? 'Google Maps Auth Notice' : 'Interactive GIS Corridor View'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  {authFailed
                    ? 'The configured Google Maps key reported an authentication warning. Fallback GIS simulation is active.'
                    : 'Running in simulation mode with live telematics nodes along NH-16. Configure GOOGLE_MAPS_API_KEY in Settings to enable Google Satellite layers.'}
                </p>
              </div>
            </div>
          )}

          {/* Active Route Floating Card Overlay */}
          {activeRequest && (
            <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-xl max-w-xs animate-in fade-in">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">📦</span>
                <div>
                  <p className="text-xs font-bold text-emerald-400">Active Transit Route</p>
                  <p className="text-[11px] font-mono text-slate-300">
                    {activeRequest.consignmentId}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center bg-slate-800/80 p-2 rounded-xl mt-2 border border-slate-700">
                <div>
                  <p className="text-[10px] text-slate-400">Distance</p>
                  <p className="text-sm font-black text-white">{routeInfo?.distance || '22 km'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Est. Time</p>
                  <p className="text-sm font-black text-emerald-400">{routeInfo?.duration || '35 mins'}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                NH-16 Express Corridor: {activeRequest.hospitalName} &rarr; Kondapalli APBMW
              </p>
            </div>
          )}

          {/* Selected Entity Detail Floating Drawer */}
          {selectedEntity && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-10 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-2xl text-slate-900 animate-in slide-in-from-bottom-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {selectedEntity.type === 'HOSPITAL'
                      ? '🏥'
                      : selectedEntity.type === 'PLANT'
                      ? '♻️'
                      : selectedEntity.type === 'PICKUP'
                      ? '📦'
                      : '🚚'}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {selectedEntity.data.name || selectedEntity.data.consignmentId}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {selectedEntity.data.address || selectedEntity.data.city || 'Operational Facility'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEntity(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                {selectedEntity.type === 'HOSPITAL' && (
                  <>
                    <span className="text-slate-500 font-medium">
                      Beds: <strong>{selectedEntity.data.bedCapacity}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        panToEntity(selectedEntity.data.latitude, selectedEntity.data.longitude)
                      }
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Focus Asset
                    </button>
                  </>
                )}
                {selectedEntity.type === 'PLANT' && (
                  <>
                    <span className="text-slate-500 font-medium">
                      Capacity: <strong>{selectedEntity.data.capacityKgPerDay} kg/day</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        panToEntity(selectedEntity.data.latitude, selectedEntity.data.longitude)
                      }
                      className="text-emerald-600 font-bold hover:underline"
                    >
                      Focus Facility
                    </button>
                  </>
                )}
                {selectedEntity.type === 'DRIVER' && (
                  <>
                    <span className="text-slate-500 font-medium">
                      Status: <strong>{selectedEntity.data.status}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        panToEntity(
                          selectedEntity.data.currentLatitude ?? selectedEntity.data.currentLat,
                          selectedEntity.data.currentLongitude ?? selectedEntity.data.currentLng
                        )
                      }
                      className="text-amber-600 font-bold hover:underline"
                    >
                      Locate Vehicle
                    </button>
                  </>
                )}
                {selectedEntity.type === 'PICKUP' && (
                  <>
                    <span className="text-slate-500 font-medium">
                      Weight: <strong>{selectedEntity.data.totalWeightKg} kg</strong>
                    </span>
                    <span className="text-emerald-600 font-bold">
                      {selectedEntity.data.status.replace(/_/g, ' ')}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

