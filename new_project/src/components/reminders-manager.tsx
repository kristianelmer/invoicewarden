"use client";

import { useEffect, useMemo, useState } from 'react';

type Reminder = {
  id: string;
  invoice_id: string;
  scheduled_for: string;
  state: 'scheduled' | 'sent' | 'skipped' | 'failed' | 'canceled';
  sent_at: string | null;
  skip_reason: string | null;
  failure_reason: string | null;
  created_at: string;
  invoices: { invoice_number: string } | null;
};

export function RemindersManager() {
  const [rows, setRows] = useState<Reminder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/reminders', { cache: 'no-store' });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? 'Could not load reminders');
      return;
    }
    setRows(json.data ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const grouped = useMemo(() => {
    return {
      scheduled: rows.filter((r) => r.state === 'scheduled'),
      sent: rows.filter((r) => r.state === 'sent'),
      failed: rows.filter((r) => r.state === 'failed')
    };
  }, [rows]);

  async function retryReminder(id: string) {
    setRetrying((prev) => ({ ...prev, [id]: true }));
    const res = await fetch(`/api/reminders/${id}/retry`, { method: 'POST' });
    const json = await res.json();
    setRetrying((prev) => ({ ...prev, [id]: false }));
    if (!res.ok) {
      setError(json.error ?? 'Retry failed');
      return;
    }
    await load();
  }

  function renderList(list: Reminder[], showRetry = false) {
    if (list.length === 0) return <p className="subtle">None</p>;

    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {list.map((r) => (
          <li key={r.id} style={{ border: '1px solid #2a2a2a', borderRadius: 10, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <strong>Invoice {r.invoices?.invoice_number ?? '—'}</strong>
              <span className="subtle">{new Date(r.scheduled_for).toLocaleString()}</span>
            </div>
            {r.failure_reason ? <div style={{ color: '#ef4444', marginTop: 6 }}>Failure: {r.failure_reason}</div> : null}
            {r.skip_reason ? <div className="subtle" style={{ marginTop: 6 }}>Skipped: {r.skip_reason}</div> : null}
            {showRetry ? (
              <button style={{ marginTop: 8 }} onClick={() => retryReminder(r.id)} disabled={Boolean(retrying[r.id])}>
                {retrying[r.id] ? 'Retrying…' : 'Retry'}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {loading ? <div className="card">Loading reminders…</div> : null}
      {error ? <div className="card" style={{ color: '#ef4444' }}>{error}</div> : null}

      {!loading ? (
        <>
          <div className="card">
            <strong>Scheduled</strong>
            <div style={{ marginTop: 8 }}>{renderList(grouped.scheduled)}</div>
          </div>
          <div className="card">
            <strong>Failed</strong>
            <div style={{ marginTop: 8 }}>{renderList(grouped.failed, true)}</div>
          </div>
          <div className="card">
            <strong>Sent</strong>
            <div style={{ marginTop: 8 }}>{renderList(grouped.sent)}</div>
          </div>
        </>
      ) : null}
    </div>
  );
}
