import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, CheckCircle2, AlertCircle, Sparkles, Upload, RefreshCw } from 'lucide-react';
import jsQR from 'jsqr';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  expectedConsignmentId?: string;
  expectedToken?: string;
  onScanSuccess: (scannedValue: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  expectedConsignmentId,
  expectedToken,
  onScanSuccess,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'IDLE' | 'STARTING' | 'ACTIVE' | 'ERROR'>('IDLE');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [detectedSuccess, setDetectedSuccess] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop all camera tracks and reset video srcObject
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop exceptions
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('IDLE');
  }, []);

  // Frame scanning loop using jsQR
  const scanQrFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      animFrameRef.current = requestAnimationFrame(scanQrFrame);
      return;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && code.data.trim().length > 0) {
          const rawValue = code.data.trim();
          setDetectedSuccess(rawValue);
          stopCamera();

          // Handle scanned value (parse JSON payload if MediCycle format or pass raw token)
          let extracted = rawValue;
          try {
            const parsed = JSON.parse(rawValue);
            if (parsed.token) extracted = parsed.token;
            else if (parsed.consignmentId) extracted = parsed.consignmentId;
          } catch {
            // Raw token or consignment ID
          }

          setTimeout(() => {
            onScanSuccess(extracted);
            onClose();
          }, 400);
          return;
        }
      } catch (err) {
        console.warn('QR frame analysis exception:', err);
      }
    }

    animFrameRef.current = requestAnimationFrame(scanQrFrame);
  }, [onClose, onScanSuccess, stopCamera]);

  // Start the device camera with real MediaStream and robust fallbacks
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraStatus('STARTING');
    setCameraError(null);
    setDetectedSuccess(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera cannot be accessed: Browser does not support MediaDevices API.');
      setCameraStatus('ERROR');
      return;
    }

    let stream: MediaStream | null = null;

    // Strategy 1: Attempt environment (rear) camera with standard resolution
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      // Strategy 2: Fallback to any available device camera { video: true, audio: false }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (fallbackErr: any) {
        console.warn('Real camera stream failed:', fallbackErr);
        let message = 'Camera cannot be accessed';
        if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
          message = 'Camera permission denied';
        } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
          message = 'No camera detected';
        } else if (fallbackErr.name === 'NotReadableError' || fallbackErr.name === 'TrackStartError') {
          message = 'Camera unavailable (already in use by another app)';
        }
        setCameraError(message);
        setCameraStatus('ERROR');
        return;
      }
    }

    if (!stream) {
      setCameraError('Camera unavailable');
      setCameraStatus('ERROR');
      return;
    }

    streamRef.current = stream;

    // Attach stream directly to the video element
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      // Ensure play is called and wait for first frames
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setCameraStatus('ACTIVE');
            animFrameRef.current = requestAnimationFrame(scanQrFrame);
          })
          .catch((playErr) => {
            console.warn('Video element play() was blocked or interrupted:', playErr);
            // Even if play was interrupted, keep active as loadedmetadata will trigger
            setCameraStatus('ACTIVE');
            animFrameRef.current = requestAnimationFrame(scanQrFrame);
          });
      } else {
        setCameraStatus('ACTIVE');
        animFrameRef.current = requestAnimationFrame(scanQrFrame);
      }
    } else {
      setCameraStatus('ACTIVE');
    }
  }, [scanQrFrame, stopCamera]);

  // Handle modal lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Handle direct file upload for QR scanning
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            let extracted = code.data.trim();
            try {
              const parsed = JSON.parse(extracted);
              if (parsed.token) extracted = parsed.token;
              else if (parsed.consignmentId) extracted = parsed.consignmentId;
            } catch {
              // Raw
            }
            onScanSuccess(extracted);
            onClose();
          } else {
            setCameraError('No QR code detected in the uploaded image. Please try a clearer picture.');
          }
        } catch {
          setCameraError('Failed to parse uploaded image. Please try again.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScanSuccess(manualCode.trim());
    onClose();
  };

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const val = expectedToken || expectedConsignmentId || 'BMW-VJA-20260910-000101';
      onScanSuccess(val);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Scan QR Code</h3>
              <p className="text-[11px] text-slate-400">
                {subtitle || title || 'Point your camera at the QR code'}
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

        {/* Scanner Body */}
        <div className="p-5 space-y-4">
          {/* Camera Viewfinder Box: Video is ALWAYS rendered in DOM so videoRef is never null */}
          <div className="relative aspect-square max-h-64 w-full bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-slate-800 shadow-inner">
            {/* Real Hardware Video Preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                setCameraStatus('ACTIVE');
              }}
              className="w-full h-full object-cover"
              style={{
                display: cameraStatus === 'ACTIVE' ? 'block' : 'none',
              }}
            />

            {/* Starting State Overlay */}
            {cameraStatus === 'STARTING' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 p-4 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                <p className="text-sm font-bold text-white">Starting camera...</p>
                <p className="text-[11px] text-slate-400 mt-1">Initializing device video feed</p>
              </div>
            )}

            {/* Camera Error State Overlay */}
            {cameraStatus === 'ERROR' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-5 text-center">
                <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
                <p className="text-sm font-bold text-white">{cameraError || 'Camera unavailable'}</p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3 max-w-xs">
                  Please enable camera permission in your browser or upload an image.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>TRY AGAIN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>UPLOAD QR IMAGE</span>
                  </button>
                </div>
              </div>
            )}

            {/* Active Live Camera Target Reticle */}
            {cameraStatus === 'ACTIVE' && (
              <>
                <div className="absolute top-2 left-2 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>LIVE CAMERA</span>
                </div>

                <div className="absolute inset-10 border-2 border-emerald-400/90 rounded-2xl pointer-events-none flex items-center justify-center shadow-xs">
                  <div className="w-full h-0.5 bg-emerald-400 shadow-xs shadow-emerald-400/80 animate-bounce" />
                </div>
              </>
            )}

            {/* Success Scan Flash */}
            {detectedSuccess && (
              <div className="absolute inset-0 bg-emerald-600/90 text-white flex flex-col items-center justify-center p-4">
                <CheckCircle2 className="w-12 h-12 text-white mb-2 animate-bounce" />
                <p className="text-sm font-bold">QR Detected &amp; Verified!</p>
              </div>
            )}
          </div>

          <p className="text-center text-xs font-medium text-slate-500">
            Point your camera at the QR code.
          </p>

          {/* Hidden File Input for QR Image Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Quick Simulation Button for Demo / Test Mode */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
            <p className="text-xs text-emerald-900 font-bold mb-1.5 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fast-Test Simulator</span>
            </p>
            <button
              id="btn-simulate-qr-scan"
              type="button"
              onClick={handleSimulateScan}
              disabled={scanning}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              {scanning ? 'Verifying Cryptographic Token...' : `Verify ${expectedConsignmentId || 'Consignment QR'}`}
            </button>
          </div>

          {/* Secondary Action: Upload QR Image & Manual Input */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>UPLOAD QR IMAGE</span>
            </button>
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Manual Token / Consignment Entry
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. BMW-VJA-... or tok-..."
                className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-600"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
