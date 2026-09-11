import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { PickupRequest } from '../../types';
import { formatISTDateTime } from '../../lib/dateUtils';
import { X, Printer, Copy, Check, ShieldCheck, QrCode } from 'lucide-react';

interface QrCodeModalProps {
  request: PickupRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ request, isOpen, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (request && isOpen) {
      QRCode.toDataURL(
        request.qrPayload || request.verificationToken,
        {
          width: 320,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err, url) => {
          if (!err && url) {
            setQrUrl(url);
          }
        }
      );
    }
  }, [request, isOpen]);

  if (!isOpen || !request) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(request.consignmentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base">Official Biomedical Waste Consignment Manifest</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 space-y-5" id="printable-manifest">
          {/* Top Info Bar */}
          <div className="border-b border-dashed border-slate-200 pb-4 text-center">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
              State Pollution Control Board Authorized Manifest
            </p>
            <p className="font-mono text-xl font-extrabold text-slate-900 mt-1 tracking-tight">
              {request.consignmentId}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued: {formatISTDateTime(request.createdAt)}
            </p>
          </div>

          {/* QR Code Presentation */}
          <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Consignment QR"
                className="w-56 h-56 rounded-lg shadow-xs bg-white p-2 border border-slate-200"
              />
            ) : (
              <div className="w-56 h-56 bg-slate-200 animate-pulse rounded-lg flex items-center justify-center text-slate-400 text-xs">
                Generating QR...
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-3 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Tamper-Resistant Cryptographic Chain Token</span>
            </div>
            <p className="font-mono text-[11px] text-slate-500 mt-1">
              Token: {request.verificationToken}
            </p>
          </div>

          {/* Consignment Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold">Origin Healthcare Facility</p>
              <p className="font-semibold text-slate-900 mt-0.5">{request.hospitalName}</p>
              <p className="text-slate-500 text-[11px]">{request.hospitalAddress}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold">Authorized Treatment Plant</p>
              <p className="font-semibold text-slate-900 mt-0.5">{request.plantName || 'Kondapalli Facility'}</p>
              <p className="text-slate-500 text-[11px]">IDA Phase 3, Ibrahimpatnam</p>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-slate-500 text-[10px] uppercase font-bold">Total Weight &amp; Bags</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {request.totalWeightKg} kg <span className="text-xs text-slate-500 font-normal">({request.totalBagsCount} sealed units)</span>
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-slate-500 text-[10px] uppercase font-bold">Segregated Categories</p>
              <div className="flex items-center gap-1.5 mt-1">
                {request.categories.map((c) => {
                  const colors: Record<string, string> = {
                    YELLOW: 'bg-amber-100 text-amber-800 border-amber-300',
                    RED: 'bg-red-100 text-red-800 border-red-300',
                    WHITE: 'bg-slate-200 text-slate-800 border-slate-400',
                    BLUE: 'bg-blue-100 text-blue-800 border-blue-300',
                  };
                  return (
                    <span
                      key={c}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        colors[c] || 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {c}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied ID' : 'Copy ID'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Label</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
