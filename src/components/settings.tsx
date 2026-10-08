'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DateTime } from 'luxon';
import {
  Sun,
  Moon,
  Monitor,
  Download,
  Upload,
  Mail,
  Smartphone,
  ArrowRight,
  Check,
  Bell,
  ShieldCheck,
  CalendarDays,
  LibraryBig,
  Settings2,
  CheckCircle2,
} from 'lucide-react';
import { useApp, applyTheme } from './provider';
import { PageHeader, Field, Confirm, Empty } from './ui';
import { ReminderFields } from './homework';
import { type Settings, label } from '@/lib/types';
export function NotificationPreferences({
  value,
  onChange,
}: {
  value: Settings;
  onChange: (s: Settings) => void;
}) {
  const { data } = useApp();
  return (
    <>
      <div className="channel-cards">
        <div className="channel-card">
          <span className="channel-icon">
            <Mail size={21} />
          </span>
          <div>
            <h3>Email reminders</h3>
            <span className={`provider-status ${data.providers.email ? 'available' : ''}`}>
              {data.providers.email ? 'Provider configured' : 'Provider not configured'}
            </span>
          </div>
        </div>
        <div className="channel-card">
          <span className="channel-icon">
            <Smartphone size={21} />
          </span>
          <div>
            <h3>SMS reminders</h3>
            <span className={`provider-status ${data.providers.sms ? 'available' : ''}`}>
              {data.providers.sms ? 'Provider configured' : 'Provider not configured'}
            </span>
          </div>
        </div>
      </div>
      <p className="muted small-text">
        {!data.providers.email || !data.providers.sms
          ? 'Unconfigured channels won’t send messages. Add the provider credentials on your server when you’re ready; see the README.'
          : 'Reminders are sent by your scheduled server job. Times follow your selected timezone.'}
      </p>
      <div className="form-grid">
        <Field label="Reminder email address">
          <input
            type="email"
            value={value.emailAddress}
            required={value.email}
            placeholder="you@example.com"
            onChange={(e) => onChange({ ...value, emailAddress: e.target.value })}
          />
        </Field>
        <Field label="Mobile number" hint="Include the country code, e.g. +447700900123.">
          <input
            type="tel"
            value={value.phone}
            required={value.sms}
            placeholder="+44…"
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
        </Field>
      </div>
      <h3 className="field-heading">Enable channels & default reminder times</h3>
      <ReminderFields value={value} onChange={(v) => onChange({ ...value, ...v })} />
      <p className="muted small-text">
        Individual homework can override these times. A channel must be enabled here before any
        reminders can use it.
      </p>
    </>
  );
}
export function SettingsPage() {
  const { data, mutate, toast } = useApp();
  const [settings, setSettings] = useState(data.settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [backup, setBackup] = useState<unknown>(null);
  const [exporting, setExporting] = useState(false);
  const zones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : [
          'Europe/London',
          'Europe/Paris',
          'America/New_York',
          'Asia/Tokyo',
          'Australia/Sydney',
          'UTC',
        ];
  return (
    <>
      <PageHeader
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your preferences."
        description="The little details that make this planner yours."
      />
      <form
        className="settings-layout"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await mutate('settings', 'PUT', { settings }, 'Your preferences are saved.');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <section className="panel settings-section">
          <div className="settings-heading">
            <Settings2 size={20} />
            <div>
              <h2>General</h2>
              <p>Set the rhythm for your day.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field
              label="Timezone"
              hint="Deadlines and timetable times use this timezone, including daylight saving."
            >
              <input
                list="timezones"
                value={settings.timezone}
                required
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              />
              <datalist id="timezones">
                {[...new Set(['Europe/London', 'UTC', ...zones])].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </datalist>
            </Field>
            <Field label="Date format">
              <select
                value={settings.dateFormat}
                onChange={(e) =>
                  setSettings({ ...settings, dateFormat: e.target.value as Settings['dateFormat'] })
                }
              >
                <option value="dd LLL yyyy">Day Month Year</option>
                <option value="LLL dd, yyyy">Month Day, Year</option>
              </select>
            </Field>
            <Field label="Time format">
              <select
                value={settings.timeFormat}
                onChange={(e) =>
                  setSettings({ ...settings, timeFormat: e.target.value as '12' | '24' })
                }
              >
                <option value="24">24-hour · 14:30</option>
                <option value="12">12-hour · 2:30 PM</option>
              </select>
            </Field>
          </div>
        </section>
        <section className="panel settings-section">
          <div className="settings-heading">
            <Sun size={20} />
            <div>
              <h2>Appearance</h2>
              <p>A comfortable view, morning or night.</p>
            </div>
          </div>
          <div className="theme-choices">
            {(
              [
                { key: 'light', name: 'Light', Icon: Sun },
                { key: 'dark', name: 'Dark', Icon: Moon },
                { key: 'system', name: 'System', Icon: Monitor },
              ] as const
            ).map((t) => (
              <button
                type="button"
                key={t.key}
                className={`theme-choice ${settings.theme === t.key ? 'selected' : ''}`}
                aria-pressed={settings.theme === t.key}
                onClick={() => {
                  setSettings({ ...settings, theme: t.key });
                  applyTheme(t.key);
                }}
              >
                <span className={`theme-preview theme-preview-${t.key}`}>
                  <i />
                  <span>
                    <b />
                    <b />
                    <b />
                  </span>
                </span>
                <span>
                  <t.Icon size={16} />
                  {t.name}
                  {settings.theme === t.key && <Check size={16} />}
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="panel settings-section">
          <div className="settings-heading">
            <Bell size={20} />
            <div>
              <h2>Notifications</h2>
              <p>A helpful nudge, on your terms.</p>
            </div>
          </div>
          <NotificationPreferences value={settings} onChange={setSettings} />
        </section>
        <section className="panel settings-section">
          <div className="settings-heading">
            <CalendarDays size={20} />
            <div>
              <h2>Timetable</h2>
              <p>Make a school week that fits your actual schedule.</p>
            </div>
          </div>
          <Link href="/timetable/setup" className="btn secondary">
            Configure timetable <ArrowRight size={16} />
          </Link>
        </section>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="settings-save">
          <span>Preferences are applied when you save.</span>
          <button className="btn primary" disabled={busy}>
            <Check size={16} />
            {busy ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </form>
      <section className="panel settings-section data-section">
        <div className="settings-heading">
          <ShieldCheck size={20} />
          <div>
            <h2>Your data, in your hands</h2>
            <p>Export your planner or restore a previous backup.</p>
          </div>
        </div>
        <div className="button-row">
          <button
            className="btn secondary"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const res = await fetch('/api/export');
                if (!res.ok) throw new Error('Could not export your data.');
                const blob = new Blob([JSON.stringify(await res.json(), null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `smm-planner-${DateTime.now().setZone(data.settings.timezone).toISODate()}.json`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                toast('Your planner has been exported.');
              } catch (e) {
                toast((e as Error).message, true);
              } finally {
                setExporting(false);
              }
            }}
          >
            <Download size={16} />
            {exporting ? 'Exporting…' : 'Export JSON'}
          </button>
          <label className="btn secondary import-label">
            <Upload size={16} />
            Restore backup
            <input
              type="file"
              accept=".json,application/json"
              aria-label="Choose backup file to restore"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  if (file.size > 5_000_000) throw new Error('Choose a backup smaller than 5 MB.');
                  setBackup(JSON.parse(await file.text()));
                } catch (e) {
                  toast((e as Error).message || 'This is not a valid JSON file.', true);
                }
              }}
            />
          </label>
        </div>
        <p className="muted small-text">
          Includes homework, subjects, timetable, study history and preferences. Passwords and
          provider credentials are never exported. Store backups privately.
        </p>
      </section>
      <Confirm
        open={backup !== null}
        onOpenChange={(open) => {
          if (!open) setBackup(null);
        }}
        title="Replace your planner with this backup?"
        description="This replaces your homework, subjects, timetable and study history. Export your current data first if you want to keep it. Reminder delivery will be turned off so you can review it safely."
        onConfirm={async () => {
          await mutate('import', 'POST', backup, 'Backup restored. Review your reminder settings.');
          setBackup(null);
          location.reload();
        }}
      />
    </>
  );
}
export function NotificationsPage() {
  const { data } = useApp();
  const [filter, setFilter] = useState('ALL');
  const reminders = data.reminders.filter((r) => filter === 'ALL' || r.status === filter);
  return (
    <>
      <PageHeader
        eyebrow="A HELPFUL HEADS-UP"
        title="Your reminders."
        description="Know what’s scheduled, what’s been sent and what needs attention."
        action={
          <Link href="/settings" className="btn secondary">
            <Settings2 size={16} />
            Reminder settings
          </Link>
        }
      />
      <div className="notification-overview">
        <section className="panel">
          <Mail size={22} />
          <div>
            <h3>Email reminders</h3>
            <p>
              {!data.providers.email
                ? 'Provider not configured'
                : data.settings.email
                  ? `Enabled · ${data.settings.emailAddress}`
                  : 'Configured · currently disabled'}
            </p>
          </div>
          <span
            className={`badge ${data.providers.email && data.settings.email ? 'status-progress' : ''}`}
          >
            {!data.providers.email ? 'Unavailable' : data.settings.email ? 'Enabled' : 'Off'}
          </span>
        </section>
        <section className="panel">
          <Smartphone size={22} />
          <div>
            <h3>SMS reminders</h3>
            <p>
              {!data.providers.sms
                ? 'Provider not configured'
                : data.settings.sms
                  ? 'Enabled for your saved number'
                  : 'Configured · currently disabled'}
            </p>
          </div>
          <span
            className={`badge ${data.providers.sms && data.settings.sms ? 'status-progress' : ''}`}
          >
            {!data.providers.sms ? 'Unavailable' : data.settings.sms ? 'Enabled' : 'Off'}
          </span>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Reminder history</h2>
          <select
            aria-label="Filter delivery status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {['ALL', 'PENDING', 'SENDING', 'SENT', 'FAILED', 'UNKNOWN', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All statuses' : label(s)}
              </option>
            ))}
          </select>
        </div>
        {reminders.length ? (
          reminders.map((r) => {
            const task = data.homework.find((h) => h.id === r.homeworkId);
            return (
              <div className="reminder-row" key={r.id}>
                <span className="session-icon">
                  {r.channel === 'EMAIL' ? <Mail size={18} /> : <Smartphone size={18} />}
                </span>
                <div>
                  <Link href={`/homework/${r.homeworkId}`}>
                    <strong>{task?.title || 'Homework'}</strong>
                  </Link>
                  <p>
                    {label(r.channel)} ·{' '}
                    {DateTime.fromISO(r.scheduledAt)
                      .setZone(data.settings.timezone)
                      .toFormat(
                        `${data.settings.dateFormat}, ${data.settings.timeFormat === '12' ? 'h:mm a' : 'HH:mm'}`,
                      )}
                  </p>
                  {r.error && <p className="text-danger">{r.error}</p>}
                  {r.sentAt && (
                    <p>
                      Accepted by provider{' '}
                      {DateTime.fromISO(r.sentAt)
                        .setZone(data.settings.timezone)
                        .toFormat('d LLL, HH:mm')}
                    </p>
                  )}
                </div>
                <span
                  className={`badge ${['FAILED', 'UNKNOWN'].includes(r.status) ? 'priority-urgent' : r.status === 'SENT' ? 'status-progress' : ''}`}
                >
                  {r.status === 'SENT' ? 'Sent to provider' : label(r.status)}
                </span>
              </div>
            );
          })
        ) : (
          <Empty
            title="A quiet moment."
            description="Your scheduled reminders and delivery history will appear here. Enable a channel and choose reminder times in Settings."
            action={
              <Link href="/settings" className="text-link">
                Set up reminders <ArrowRight size={15} />
              </Link>
            }
          />
        )}
      </section>
      <p className="muted small-text notification-footnote">
        Shows the latest 500 reminders. “Sent to provider” means the provider accepted the message;
        final inbox or handset delivery isn’t tracked. Failed or uncertain sends aren’t
        automatically retried to avoid duplicate messages.
      </p>
    </>
  );
}
export function SetupPage() {
  const { data, mutate } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState(data.settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const saved = Number(sessionStorage.getItem('smm-setup-step') || '0');
      if (Number.isInteger(saved) && saved >= 0 && saved <= 4) setStep(saved);
    } catch {}
  }, []);
  function goToStep(value: number) {
    setStep(value);
    try {
      sessionStorage.setItem('smm-setup-step', String(value));
    } catch {}
  }
  const steps = [
    'Your account',
    'Your timezone',
    'Your subjects',
    'Your timetable',
    'Your reminders',
  ];
  async function next() {
    setBusy(true);
    setError('');
    try {
      await mutate(
        'settings',
        'PUT',
        { settings, ...(step === 4 ? { onboarded: true } : {}) },
        step === 4 ? 'Your planner is ready. Make yourself at home.' : undefined,
      );
      if (step === 4) {
        try {
          sessionStorage.removeItem('smm-setup-step');
        } catch {}
        router.push('/');
      } else goToStep(step + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="A FRESH START"
        title="Let’s make this yours."
        description="A few small steps to a more organised day."
      />
      <div className="setup-layout">
        <ol className="setup-steps">
          {steps.map((s, i) => (
            <li className={i === step ? 'active' : i < step ? 'done' : ''} key={s}>
              <span>{i < step ? <Check size={16} /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <section className="panel setup-panel">
          {step === 0 ? (
            <>
              <ShieldCheck size={36} className="setup-icon" />
              <h2>Your own little workspace.</h2>
              <p>This planner belongs to one person: you.</p>
              <div className="account-confirmation">
                <CheckCircle2 size={20} />
                <span>
                  Owner account created
                  <br />
                  <strong>{data.ownerEmail}</strong>
                </span>
              </div>
              <p className="muted">
                Your account is protected by your password. There are no public profiles or shared
                classes.
              </p>
            </>
          ) : step === 1 ? (
            <>
              <ClockIcon />
              <h2>Let’s get the timing right.</h2>
              <p>Your homework deadlines, school day and reminders all follow this timezone.</p>
              <Field label="Timezone">
                <input
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  list="setup-zones"
                />
                <datalist id="setup-zones">
                  {[
                    'Europe/London',
                    'Europe/Paris',
                    'America/New_York',
                    'America/Los_Angeles',
                    'Asia/Kolkata',
                    'Asia/Tokyo',
                    'Australia/Sydney',
                    'UTC',
                  ].map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </datalist>
              </Field>
            </>
          ) : step === 2 ? (
            <>
              <LibraryBig size={36} className="setup-icon" />
              <h2>A place for every subject.</h2>
              <p>
                Create your subjects with names, colours and icons. You can add more whenever you
                need.
              </p>
              <p className="success-text">{data.subjects.length} subjects ready</p>
              <Link href="/subjects" className="btn secondary">
                Manage subjects <ArrowRight size={16} />
              </Link>
              <p className="muted small-text">
                Return to Getting started from the dashboard when you’re ready.
              </p>
            </>
          ) : step === 3 ? (
            <>
              <CalendarDays size={36} className="setup-icon" />
              <h2>A school week that fits.</h2>
              <p>
                Choose your school days, build your periods, and add lessons, lunch and breaks.
                Different days can have different structures.
              </p>
              <p className="success-text">
                {data.days.filter((d) => d.enabled).length} school days configured
              </p>
              <Link href="/timetable/setup" className="btn secondary">
                Build timetable <ArrowRight size={16} />
              </Link>
              <p className="muted small-text">You can also do this later.</p>
            </>
          ) : (
            <>
              <Bell size={36} className="setup-icon" />
              <h2>A reminder, when it helps.</h2>
              <p>Email and SMS are optional. Leave both off to skip this step.</p>
              <NotificationPreferences value={settings} onChange={setSettings} />
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            {step > 0 && (
              <button className="btn secondary" onClick={() => goToStep(step - 1)}>
                Back
              </button>
            )}
            <button className="btn primary" disabled={busy} onClick={next}>
              {busy ? 'Saving…' : step === 4 ? 'Finish setup' : 'Continue'}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
function ClockIcon() {
  return <Settings2 size={36} className="setup-icon" />;
}
