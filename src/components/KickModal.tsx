import { useState, useEffect } from "react";

interface KickModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  participantName?: string;
  confirmLabel: string;
  reasonPlaceholder?: string;
  onSubmit: (reason: string) => void | Promise<void>;
  loading?: boolean;
}

export default function KickModal({
  open,
  onClose,
  title,
  participantName,
  confirmLabel,
  reasonPlaceholder = "Причина (необязательно)",
  onSubmit,
  loading = false,
}: KickModalProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(reason.trim());
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-soft-lg border border-slate-100 p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
        {participantName && (
          <p className="text-slate-600 text-sm mb-4">
            Участник: <span className="font-medium text-slate-800">{participantName}</span>
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="kick-reason" className="block text-sm font-medium text-slate-700 mb-1">
              Причина исключения
            </label>
            <textarea
              id="kick-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 focus:outline-none resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Студент увидит эту причину в разделе «Мои записи»
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
