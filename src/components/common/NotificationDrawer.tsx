import React from 'react';
import { NotificationItem } from '../../types';
import { formatISTTime } from '../../lib/dateUtils';
import { store } from '../../services/store';
import { X, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onSelectConsignment?: (consignmentId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onSelectConsignment,
}) => {
  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    store.markAllNotificationsAsRead();
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'ALERT':
        return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Notifications &amp; Alerts</h3>
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              {notifications.filter((n) => !n.read).length} Unread
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 p-1 hover:bg-emerald-50 rounded"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Read all</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No alerts right now</p>
              <p className="text-xs text-slate-400 mt-1">Live chain-of-custody alerts will appear here.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.notificationId}
                onClick={() => {
                  store.markNotificationAsRead(n.notificationId);
                  if (n.consignmentId && onSelectConsignment) {
                    onSelectConsignment(n.consignmentId);
                    onClose();
                  }
                }}
                className={`pt-3 first:pt-0 cursor-pointer transition-colors p-3 rounded-xl ${
                  n.read ? 'bg-white opacity-80' : 'bg-emerald-50/60 border border-emerald-100/80 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatISTTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                    {n.consignmentId && (
                      <span className="inline-block mt-2 text-[10px] font-mono font-medium text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                        {n.consignmentId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
