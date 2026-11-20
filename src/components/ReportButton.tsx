import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { ReportTargetType } from '@/lib/types';
import { Flag, X } from 'lucide-react';
import { Spinner } from '@/lib/ui';

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  targetName: string;
  children?: React.ReactNode;
}

const REASONS = [
  { value: 'spam', label: 'Spam or scam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'fake', label: 'Fake or misleading' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'other', label: 'Other' },
];

export default function ReportButton({ targetType, targetId, targetName, children }: Props) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  async function submit() {
    setSubmitting(true);
    setError(null);
    const { error: e } = await supabase.from('reports').insert({
      reporter_id: profile!.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details,
    });
    setSubmitting(false);
    if (e) { setError(e.message); return; }
    setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); setDetails(''); }, 2000);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={children ? '' : 'flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-red-600'}
      >
        {children ?? <><Flag className="h-4 w-4" /> Report</>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <Flag className="h-5 w-5 text-red-500" /> Report {targetType === 'restaurant' ? 'restaurant' : 'user'}
              </h3>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5 text-stone-400" /></button>
            </div>

            {done ? (
              <div className="mt-6 rounded-xl bg-green-50 px-4 py-4 text-center text-sm font-medium text-green-700">
                Report submitted. An admin will review it shortly.
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-stone-500">
                  You're reporting <span className="font-semibold text-stone-700">{targetName}</span>. Our admin team will review your report.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="label">Reason</label>
                    <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                      {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Details (optional)</label>
                    <textarea className="input min-h-[80px]" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell us what happened…" />
                  </div>
                </div>

                {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

                <div className="mt-5 flex gap-3">
                  <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={submit} disabled={submitting} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">
                    {submitting ? <Spinner className="h-4 w-4" /> : 'Submit report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
