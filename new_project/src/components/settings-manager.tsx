"use client";

import { useEffect, useState } from 'react';

type SettingsState = {
  fullName: string;
  companyName: string;
  timezone: string;
  defaultJurisdiction: 'UK' | 'NY' | 'CA';
  reminderSubjectTemplate: string;
  reminderBodyTemplate: string;
};

type StripeState = {
  connected: boolean;
  accountId: string | null;
  onboarded: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

const initialSettings: SettingsState = {
  fullName: '',
  companyName: '',
  timezone: 'UTC',
  defaultJurisdiction: 'UK',
  reminderSubjectTemplate: '',
  reminderBodyTemplate: ''
};

export function SettingsManager() {
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [stripe, setStripe] = useState<StripeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [settingsRes, stripeRes] = await Promise.all([
          fetch('/api/settings', { cache: 'no-store' }),
          fetch('/api/stripe/connect/status', { cache: 'no-store' })
        ]);

        const settingsJson = await settingsRes.json();
        const stripeJson = await stripeRes.json();

        if (!settingsRes.ok) throw new Error(settingsJson.error ?? 'Could not load settings');
        if (!stripeRes.ok) throw new Error(stripeJson.error ?? 'Could not load Stripe status');

        setSettings({
          fullName: settingsJson.data.fullName ?? '',
          companyName: settingsJson.data.companyName ?? '',
          timezone: settingsJson.data.timezone ?? 'UTC',
          defaultJurisdiction: settingsJson.data.defaultJurisdiction ?? 'UK',
          reminderSubjectTemplate: settingsJson.data.reminderSubjectTemplate ?? '',
          reminderBodyTemplate: settingsJson.data.reminderBodyTemplate ?? ''
        });
        setStripe(stripeJson);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? 'Could not save settings');
      return;
    }
  }

  async function startOnboarding() {
    setError(null);
    const res = await fetch('/api/stripe/connect/onboarding', { method: 'POST' });
    const json = await res.json();
    if (!res.ok || !json.url) {
      setError(json.error ?? 'Could not start Stripe onboarding');
      return;
    }
    window.location.href = json.url;
  }

  if (loading) return <div className="card">Loading settings…</div>;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="card">
        <strong>Stripe Connect</strong>
        {stripe ? (
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            <span className="subtle">Connected: {stripe.connected ? 'Yes' : 'No'}</span>
            <span className="subtle">Onboarded: {stripe.onboarded ? 'Yes' : 'No'}</span>
            {stripe.accountId ? <span className="subtle">Account: {stripe.accountId}</span> : null}
            <button type="button" onClick={startOnboarding}>
              {stripe.connected ? 'Continue onboarding' : 'Connect Stripe'}
            </button>
          </div>
        ) : null}
      </div>

      <form onSubmit={saveSettings} className="card" style={{ display: 'grid', gap: 8 }}>
        <strong>Business settings</strong>
        <input
          placeholder="Full name"
          value={settings.fullName}
          onChange={(e) => setSettings((s) => ({ ...s, fullName: e.target.value }))}
        />
        <input
          placeholder="Company name"
          value={settings.companyName}
          onChange={(e) => setSettings((s) => ({ ...s, companyName: e.target.value }))}
        />
        <input
          placeholder="Timezone"
          value={settings.timezone}
          onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
        />
        <select
          value={settings.defaultJurisdiction}
          onChange={(e) =>
            setSettings((s) => ({ ...s, defaultJurisdiction: e.target.value as SettingsState['defaultJurisdiction'] }))
          }
        >
          <option value="UK">UK</option>
          <option value="NY">NY</option>
          <option value="CA">CA</option>
        </select>

        <strong style={{ marginTop: 8 }}>Reminder template defaults</strong>
        <input
          placeholder="Reminder subject"
          value={settings.reminderSubjectTemplate}
          onChange={(e) => setSettings((s) => ({ ...s, reminderSubjectTemplate: e.target.value }))}
        />
        <textarea
          placeholder="Reminder body"
          value={settings.reminderBodyTemplate}
          onChange={(e) => setSettings((s) => ({ ...s, reminderBodyTemplate: e.target.value }))}
          rows={6}
        />

        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        {error ? <span style={{ color: '#ef4444' }}>{error}</span> : null}
      </form>
    </div>
  );
}
