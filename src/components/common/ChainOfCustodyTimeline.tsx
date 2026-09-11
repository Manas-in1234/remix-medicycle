import React from 'react';
import { PickupRequest, QrEvent } from '../../types';
import { formatISTTime } from '../../lib/dateUtils';
import {
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  Factory,
  AlertTriangle,
  QrCode,
  Flame,
  ShieldCheck,
} from 'lucide-react';

interface ChainOfCustodyTimelineProps {
  request: PickupRequest;
  events?: QrEvent[];
}

interface StepInfo {
  key: string;
  title: string;
  description: string;
  timestamp?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  icon: React.ReactNode;
}

export const ChainOfCustodyTimeline: React.FC<ChainOfCustodyTimelineProps> = ({
  request,
  events = [],
}) => {
  const statusOrder = [
    'REQUESTED',
    'DRIVER_ASSIGNED',
    'DRIVER_ACCEPTED',
    'PICKED_UP',
    'IN_TRANSIT',
    'PLANT_ARRIVED',
    'PLANT_RECEIVED',
    'UNDER_TREATMENT',
    'TREATED',
    'CLOSED',
  ];

  const currentIdx = statusOrder.indexOf(request.status);

  const steps: StepInfo[] = [
    {
      key: 'REQUESTED',
      title: 'Request Created',
      description: `${request.hospitalName} generated consignment manifest (${request.totalBagsCount} bags, ${request.totalWeightKg} kg).`,
      timestamp: request.requestedAt || request.createdAt,
      isCompleted: currentIdx >= 0,
      isCurrent: request.status === 'REQUESTED' || request.status === 'READY_FOR_ASSIGNMENT',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      key: 'DRIVER_ASSIGNED',
      title: 'Smart Driver Assigned',
      description: request.assignment
        ? `Algorithmic match: ${request.assignment.driverName} (${request.assignment.vehicleNumber}) score ${request.assignment.score}%.`
        : 'Awaiting driver allocation.',
      timestamp: request.assignedAt,
      isCompleted: currentIdx >= 1,
      isCurrent: request.status === 'DRIVER_ASSIGNED',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      key: 'DRIVER_ACCEPTED',
      title: 'Driver En Route',
      description: request.assignment
        ? `${request.assignment.driverName} accepted assignment and dispatched to healthcare facility.`
        : 'Pending driver response.',
      timestamp: request.acceptedAt,
      isCompleted: currentIdx >= 2,
      isCurrent: request.status === 'DRIVER_ACCEPTED' || request.status === 'PICKUP_IN_PROGRESS',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      key: 'PICKED_UP',
      title: 'Waste Collected & Custody Sealed',
      description: `QR code scanned at hospital. Custody handed to driver (${request.totalWeightKg} kg loaded).`,
      timestamp: request.pickedUpAt,
      isCompleted: currentIdx >= 3,
      isCurrent: request.status === 'PICKED_UP',
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      key: 'IN_TRANSIT',
      title: 'Corridor Transit to Treatment Plant',
      description: `Vehicle en route via NH-16 express corridor to ${request.plantName || 'Kondapalli Common Treatment Facility'}.`,
      timestamp: request.inTransitAt,
      isCompleted: currentIdx >= 4,
      isCurrent: request.status === 'IN_TRANSIT',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      key: 'PLANT_RECEIVED',
      title: 'Treatment Plant Gate & Weighbridge Intake',
      description: request.receivedWeightKg !== undefined
        ? `Weighed at plant: ${request.receivedWeightKg} kg (discrepancy: ${request.weightDiscrepancyKg} kg).`
        : 'Awaiting plant weighbridge intake.',
      timestamp: request.plantReceivedAt,
      isCompleted: currentIdx >= 6,
      isCurrent: request.status === 'PLANT_ARRIVED' || request.status === 'PLANT_RECEIVED',
      icon: <Factory className="w-4 h-4" />,
    },
    {
      key: 'UNDER_TREATMENT',
      title: 'Bio-Medical Treatment Active',
      description: request.treatmentMethod
        ? `Method: ${request.treatmentMethod.replace(/_/g, ' ')}.`
        : 'Awaiting treatment cycle initiation.',
      timestamp: request.treatmentStartedAt,
      isCompleted: currentIdx >= 7,
      isCurrent: request.status === 'UNDER_TREATMENT',
      icon: <Flame className="w-4 h-4" />,
    },
    {
      key: 'CLOSED',
      title: 'Disposed & Chain Closed',
      description: 'Zero hazardous residues. Official regulatory disposal certificate generated.',
      timestamp: request.closedAt || request.disposedAt,
      isCompleted: currentIdx >= 9,
      isCurrent: request.status === 'CLOSED',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Cryptographic Chain-of-Custody</h4>
          <p className="text-xs text-slate-500">Immutable lifecycle audit trail</p>
        </div>
        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          {request.status}
        </span>
      </div>

      {/* Weight Mismatch Warning Badge if flagged */}
      {request.weightMismatchAnomaly && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Audit Alert: Weight Discrepancy Flagged</span>
            <p className="mt-0.5 text-amber-800">
              Dispatched: {request.totalWeightKg} kg | Received: {request.receivedWeightKg} kg (Difference: {request.weightDiscrepancyKg} kg). Under verification.
            </p>
          </div>
        </div>
      )}

      {/* Steps List */}
      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {steps.map((step) => {
          let dotClass = 'bg-slate-200 text-slate-400 border-slate-300';
          if (step.isCompleted) {
            dotClass = 'bg-emerald-600 text-white border-emerald-600';
          } else if (step.isCurrent) {
            dotClass = 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100';
          }

          return (
            <div key={step.key} className="relative group">
              {/* Dot Icon */}
              <div
                className={`absolute -left-6 top-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-colors shadow-xs ${dotClass}`}
              >
                {step.icon}
              </div>

              {/* Step Content */}
              <div className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-bold ${
                      step.isCompleted ? 'text-slate-900' : step.isCurrent ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                  {step.timestamp && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatISTTime(step.timestamp)}
                    </span>
                  )}
                </div>
                <p className={`mt-0.5 leading-relaxed ${step.isCompleted || step.isCurrent ? 'text-slate-600' : 'text-slate-400'}`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
