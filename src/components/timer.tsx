'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { DateTime } from 'luxon';
import { Play, Pause, RotateCcw, Check, Timer, Clock3, Leaf } from 'lucide-react';
import { useApp } from './provider';
import { PageHeader, Field, Confirm, Empty, SubjectBadge } from './ui';
import { elapsedMs, duration, type TimerState } from '@/lib/logic';
const storageKey = 'smm-study-timer-v1';
function blank(): TimerState {
  return {
    id: crypto.randomUUID(),
    mode: 'COUNTDOWN',
    targetSeconds: 1500,
    accumulatedMs: 0,
    runningSince: null,
    startedAt: null,
    homeworkId: '',
    subjectId: '',
  };
}
function readTimer(): TimerState {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (
      value &&
      typeof value.id === 'string' &&
      ['COUNTDOWN', 'STOPWATCH'].includes(value.mode) &&
      Number.isFinite(value.accumulatedMs) &&
      value.accumulatedMs >= 0 &&
      Number.isFinite(value.targetSeconds) &&
      value.targetSeconds > 0 &&
      (value.runningSince === null || Number.isFinite(value.runningSince))
    )
      return value;
  } catch {}
  return blank();
}
export function TimerPage() {
  const { data, now, mutate, toast } = useApp();
  const params = useSearchParams();
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [record, setRecord] = useState(true);
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<string | null>(null);
  const notified = useRef(false);
  useEffect(() => {
    const saved = readTimer();
    const task = params.get('task');
    if (task && !saved.startedAt) {
      saved.homeworkId = task;
      saved.subjectId = data.homework.find((h) => h.id === task)?.subjectId || '';
    }
    setTimer(saved);
    const interval = setInterval(() => setTick(Date.now()), 250);
    const sync = (e: StorageEvent) => {
      if (e.key === storageKey) { setTimer(readTimer()); setCustomMinutes(null); }
    };
    window.addEventListener('storage', sync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', sync);
    };
  }, []); // Load once; a running session takes precedence over URL selection.
  useEffect(() => {
    if (timer) localStorage.setItem(storageKey, JSON.stringify(timer));
  }, [timer]);
  const elapsed = timer ? elapsedMs(timer, tick) : 0;
  const ended = !!timer && timer.mode === 'COUNTDOWN' && elapsed >= timer.targetSeconds * 1000;
  useEffect(() => {
    if (ended && !notified.current) {
      notified.current = true;
      toast('Your focus session is complete. Take a breath, then save your session.');
    }
    if (!ended) notified.current = false;
  }, [ended, toast]);
  if (!timer) return <div className="skeleton" role="status" aria-label="Loading saved timer" />;
  const displaySeconds = Math.max(
    0,
    Math.floor(timer.mode === 'COUNTDOWN' ? timer.targetSeconds - elapsed / 1000 : elapsed / 1000),
  );
  const hours = Math.floor(displaySeconds / 3600);
  const minutes = Math.floor(displaySeconds / 60) % 60;
  const seconds = displaySeconds % 60;
  const time = `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const running = timer.runningSince !== null && !ended;
  const started = !!timer.startedAt;
  const customValid = customMinutes === null || customMinutes === '' || (Number.isInteger(Number(customMinutes)) && Number(customMinutes) >= 1 && Number(customMinutes) <= 10080);
  const update = (partial: Partial<TimerState>) => setTimer({ ...timer, ...partial });
  const week = DateTime.fromJSDate(now, { zone: data.settings.timezone }).startOf('week');
  const weekSessions = data.sessions.filter((s) => DateTime.fromISO(s.startTime) >= week);
  return (
    <>
      <PageHeader
        eyebrow="ONE THING AT A TIME"
        title="A little time to focus."
        description="Choose what matters right now. Let the rest wait."
      />
      <div className="timer-layout">
        <section className="panel timer-panel">
          <div className="segmented timer-mode">
            <button
              disabled={started}
              className={timer.mode === 'COUNTDOWN' ? 'active' : ''}
              onClick={() => update({ mode: 'COUNTDOWN' })}
            >
              Countdown
            </button>
            <button
              disabled={started}
              className={timer.mode === 'STOPWATCH' ? 'active' : ''}
              onClick={() => update({ mode: 'STOPWATCH' })}
            >
              Stopwatch
            </button>
          </div>
          <div
            className={`timer-face ${running ? 'timer-running' : ''}`}
            style={
              {
                '--timer-progress': `${timer.mode === 'COUNTDOWN' ? (elapsed / (timer.targetSeconds * 1000)) * 100 : 0}%`,
              } as React.CSSProperties
            }
          >
            <div>
              <Leaf size={24} />
              <span
                className="timer-numbers"
                role="timer"
                aria-label={`${time} ${timer.mode === 'COUNTDOWN' ? 'remaining' : 'elapsed'}`}
              >
                {time}
              </span>
              <span className="timer-caption">
                {ended
                  ? 'A little progress, made.'
                  : running
                    ? 'Just you and this moment.'
                    : started
                      ? 'Take a breath. You’re doing fine.'
                      : 'Ready when you are.'}
              </span>
            </div>
          </div>
          {timer.mode === 'COUNTDOWN' && (
            <div className="timer-presets">
              {[15, 25, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  disabled={started}
                  aria-pressed={timer.targetSeconds === m * 60}
                  className={timer.targetSeconds === m * 60 ? 'active' : ''}
                  onClick={() => { setCustomMinutes(null); update({ targetSeconds: m * 60 }); }}
                >
                  {m}m
                </button>
              ))}
              <label>
                <span className="sr-only">Custom duration in minutes</span>
                <input
                  type="number"
                  min="1"
                  max="10080"
                  disabled={started}
                  placeholder="Custom"
                  aria-label="Custom duration in minutes"
                  aria-invalid={!customValid}
                  value={customMinutes ?? (
                    [15, 25, 30, 45, 60].includes(timer.targetSeconds / 60)
                      ? ''
                      : timer.targetSeconds / 60
                  )}
                  onChange={(e) => {
                    setCustomMinutes(e.target.value);
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 1 && n <= 10080) update({ targetSeconds: n * 60 });
                  }}
                />
              </label>
            </div>
          )}
          {timer.mode === 'COUNTDOWN' && !customValid && <p className="form-error" role="alert">Choose a whole number between 1 and 10,080 minutes.</p>}
          <div className="timer-controls">
            <button
              className="btn secondary"
              title="Reset timer"
              aria-label="Reset timer"
              onClick={() =>
                started
                  ? setReset(true)
                  : setTimer({ ...blank(), mode: timer.mode, targetSeconds: timer.targetSeconds })
              }
            >
              <RotateCcw size={19} />
            </button>
            <button
              className="btn primary timer-start"
              disabled={ended || busy || (timer.mode === 'COUNTDOWN' && !customValid)}
              onClick={() =>
                running
                  ? update({ accumulatedMs: elapsedMs(timer), runningSince: null })
                  : update({
                      startedAt: timer.startedAt || new Date().toISOString(),
                      runningSince: Date.now(),
                    })
              }
            >
              {running ? <Pause size={18} /> : <Play size={18} />}
              {running ? 'Pause' : started ? 'Resume' : 'Start focus'}
            </button>
            <button
              className="btn secondary"
              disabled={elapsed < 1000 || busy}
              onClick={async () => {
                setBusy(true);
                const stopped = elapsedMs(timer);
                update({ accumulatedMs: stopped, runningSince: null });
                try {
                  if (record && timer.startedAt)
                    await mutate(
                      'sessions',
                      'POST',
                      {
                        id: timer.id,
                        homeworkId: timer.homeworkId || null,
                        subjectId: timer.subjectId || null,
                        startTime: timer.startedAt,
                        endTime: new Date().toISOString(),
                        durationSeconds: Math.floor(stopped / 1000),
                        type: timer.mode,
                      },
                      'Study session saved. A little progress adds up.',
                    );
                  else toast('Session finished without recording.');
                  setTimer({
                    ...blank(),
                    mode: timer.mode,
                    targetSeconds: timer.targetSeconds,
                    homeworkId: timer.homeworkId,
                    subjectId: timer.subjectId,
                  });
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={18} />
              <span>{busy ? 'Saving…' : 'Finish session'}</span>
            </button>
          </div>
          <p className="timer-help">
            Your timer keeps its place if you leave or refresh this page.
          </p>
        </section>
        <aside className="timer-aside">
          <section className="panel focus-settings">
            <h2>What are you working on?</h2>
            <Field label="Homework">
              <select
                disabled={started}
                value={timer.homeworkId}
                onChange={(e) =>
                  update({
                    homeworkId: e.target.value,
                    subjectId: data.homework.find((h) => h.id === e.target.value)?.subjectId || '',
                  })
                }
              >
                <option value="">General study</option>
                {data.homework
                  .filter((h) => h.status !== 'COMPLETED' || h.id === timer.homeworkId)
                  .map((h) => (
                    <option value={h.id} key={h.id}>
                      {h.title}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Subject">
              <select
                disabled={started || !!timer.homeworkId}
                value={timer.subjectId}
                onChange={(e) => update({ subjectId: e.target.value })}
              >
                <option value="">No specific subject</option>
                {data.subjects.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="check-label">
              <input
                type="checkbox"
                checked={record}
                onChange={(e) => setRecord(e.target.checked)}
              />
              Record this study session
            </label>
            <p className="small-text muted">
              Recorded time is added to your selected homework and weekly study summary.
            </p>
          </section>
          <section className="panel timer-week">
            <Timer size={21} />
            <span>This week’s focus</span>
            <strong>
              {duration(Math.floor(weekSessions.reduce((a, s) => a + s.durationSeconds, 0) / 60))}
            </strong>
            <p>{weekSessions.length} sessions. Every little bit counts.</p>
          </section>
        </aside>
      </div>
      <section className="panel recent-sessions">
        <div className="panel-heading">
          <h2>
            <Clock3 size={18} />
            Recent study sessions
          </h2>
          <span className="subtle-label">Your last 10 sessions</span>
        </div>
        {data.sessions.length ? (
          data.sessions.slice(0, 10).map((s) => (
            <div className="session-row" key={s.id}>
              <span className="session-icon">
                <Timer size={18} />
              </span>
              <div>
                <strong>
                  {data.homework.find((h) => h.id === s.homeworkId)?.title ||
                    data.subjects.find((x) => x.id === s.subjectId)?.name ||
                    'General study'}
                </strong>
                <span>
                  {DateTime.fromISO(s.startTime)
                    .setZone(data.settings.timezone)
                    .toFormat(
                      `${data.settings.dateFormat}, ${data.settings.timeFormat === '12' ? 'h:mm a' : 'HH:mm'}`,
                    )}{' '}
                  · {s.type === 'COUNTDOWN' ? 'Countdown' : 'Stopwatch'}
                </span>
              </div>
              {s.subjectId && <SubjectBadge id={s.subjectId} />}
              <strong>
                {s.durationSeconds < 60
                  ? `${s.durationSeconds}s`
                  : duration(Math.floor(s.durationSeconds / 60))}
              </strong>
            </div>
          ))
        ) : (
          <Empty
            title="Your first session is a fresh start."
            description="Finish and record a session to see it here."
          />
        )}
      </section>
      <Confirm
        open={reset}
        onOpenChange={setReset}
        title="Reset this session?"
        description="Unrecorded time will be discarded. Finish the session first if you want to keep it."
        onConfirm={async () => {
          setTimer({
            ...blank(),
            mode: timer.mode,
            targetSeconds: timer.targetSeconds,
            homeworkId: timer.homeworkId,
            subjectId: timer.subjectId,
          });
        }}
      />
    </>
  );
}
