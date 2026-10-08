'use client';
import { useState } from 'react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import {
  Plus,
  Copy,
  Settings2,
  CalendarDays,
  Clock3,
  Trash2,
  MapPin,
  UserRound,
  WandSparkles,
} from 'lucide-react';
import { useApp } from './provider';
import { PageHeader, Modal, Confirm, Field, Empty, SubjectIcon } from './ui';
import { weekdays, slotTypes, label, type TimetableDay, type Period } from '@/lib/types';
import { periodsValid } from '@/lib/logic';
export function TimetablePage({ edit }: { edit: boolean }) {
  const { data, now, mutate } = useApp();
  const local = DateTime.fromJSDate(now, { zone: data.settings.timezone });
  const [mobileDay, setMobileDay] = useState(local.weekday);
  const [editing, setEditing] = useState<{
    weekday: number;
    period: Period;
    isNew: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copyDay, setCopyDay] = useState<number | null>(null);
  const [copyTarget, setCopyTarget] = useState(2);
  const [copyConfirm, setCopyConfirm] = useState(false);
  const [deleting, setDeleting] = useState<{ weekday: number; period: Period } | null>(null);
  const [generate, setGenerate] = useState<number | null>(null);
  const [genStart, setGenStart] = useState('09:00');
  const [genLength, setGenLength] = useState(50);
  const [genCount, setGenCount] = useState(5);
  const [genGap, setGenGap] = useState(10);
  const days: TimetableDay[] = weekdays.map(
    (_, i) =>
      data.days.find((d) => d.weekday === i + 1) || {
        id: `day-${i}`,
        weekday: i + 1,
        enabled: false,
        periods: [],
      },
  );
  const visibleDays = days.filter((d) => d.enabled);
  async function save(next: TimetableDay[], message = 'Timetable saved.') {
    setBusy(true);
    try {
      await mutate('timetable', 'PUT', next, message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function newPeriod(day: TimetableDay) {
    const start = day.periods.at(-1)?.endTime || '09:00';
    const end = DateTime.fromFormat(start, 'HH:mm').plus({ minutes: 50 }).toFormat('HH:mm');
    setError('');
    setEditing({
      weekday: day.weekday,
      isNew: true,
      period: {
        id: crypto.randomUUID(),
        name: `Period ${day.periods.length + 1}`,
        slotType: 'LESSON',
        startTime: start,
        endTime: end,
        subjectId: data.subjects[0]?.id || null,
        label: '',
        room: '',
        teacherName: '',
      },
    });
  }
  function setPeriod(key: keyof Period, value: string | null) {
    setEditing((old) => (old ? { ...old, period: { ...old.period, [key]: value } } : old));
  }
  return (
    <>
      <PageHeader
        eyebrow="A RHYTHM THAT WORKS FOR YOU"
        title={edit ? 'Build your school week.' : 'Your timetable.'}
        description={
          edit
            ? 'Your days, your periods, your pace. Every day can be different.'
            : 'See your whole week, with room for everything.'
        }
        action={
          <Link href={edit ? '/timetable' : '/timetable/setup'} className="btn secondary">
            <Settings2 size={17} />
            {edit ? 'View timetable' : 'Configure timetable'}
          </Link>
        }
      />
      {edit && (
        <section className="panel timetable-config">
          <div>
            <h2>Your school days</h2>
            <p className="muted">
              Choose the days you attend. Turning a day off keeps its periods for later.
            </p>
          </div>
          <div className="day-toggles">
            {days.map((d) => (
              <button
                className={d.enabled ? 'active' : ''}
                key={d.weekday}
                disabled={busy}
                aria-pressed={d.enabled}
                onClick={() => {
                  void save(
                    days.map((day) =>
                      day.weekday === d.weekday ? { ...day, enabled: !day.enabled } : day,
                    ),
                  );
                }}
              >
                {weekdays[d.weekday - 1].slice(0, 3)}
              </button>
            ))}
          </div>
          <p className="muted small-text">
            Click a period to edit its name, times, subject, room or teacher. Add as many periods as
            your day needs. Changes save immediately.
          </p>
        </section>
      )}
      {!visibleDays.length ? (
        <Empty
          title="Make room for your school day."
          description="Choose your school days, then add lessons, lunch, breaks and anything in between."
          action={
            <Link className="btn primary" href="/timetable/setup">
              <CalendarDays size={16} />
              Set up your timetable
            </Link>
          }
        />
      ) : (
        <>
          <div className="timetable-toolbar">
            <div className="legend">
              <span>
                <i className="dot sage-dot" />
                Lesson
              </span>
              <span>
                <i className="dot break-dot" />
                Break / lunch
              </span>
              <span className="muted">{data.settings.timezone}</span>
            </div>
            <span className="muted small-text">Click any period to edit</span>
          </div>
          <div className="mobile-day-tabs">
            {visibleDays.map((d) => (
              <button
                key={d.weekday}
                className={mobileDay === d.weekday ? 'active' : ''}
                onClick={() => setMobileDay(d.weekday)}
              >
                {weekdays[d.weekday - 1].slice(0, 3)}
              </button>
            ))}
          </div>
          <div
            className="timetable-grid"
            style={{ '--days': visibleDays.length } as React.CSSProperties}
          >
            {visibleDays.map((day) => (
              <section
                className={`timetable-column ${day.weekday === (visibleDays.some((d) => d.weekday === mobileDay) ? mobileDay : visibleDays[0].weekday) ? 'mobile-active' : ''}`}
                key={day.weekday}
              >
                <header className={day.weekday === local.weekday ? 'is-today' : ''}>
                  <div>
                    <h2>{weekdays[day.weekday - 1]}</h2>
                    <span>
                      {day.periods.length} periods{day.weekday === local.weekday ? ' · Today' : ''}
                    </span>
                  </div>
                  <button
                    className="icon-btn"
                    title={`Copy ${weekdays[day.weekday - 1]}`}
                    aria-label={`Copy ${weekdays[day.weekday - 1]}`}
                    disabled={busy}
                    onClick={() => {
                      setCopyDay(day.weekday);
                      setCopyTarget(
                        visibleDays.find((d) => d.weekday !== day.weekday)?.weekday ||
                          (day.weekday === 1 ? 2 : 1),
                      );
                    }}
                  >
                    <Copy size={15} />
                  </button>
                </header>
                <div className="timetable-periods">
                  {day.periods.map((p) => {
                    const subject = data.subjects.find((s) => s.id === p.subjectId);
                    const isBreak = ['BREAK', 'LUNCH'].includes(p.slotType);
                    const current =
                      day.weekday === local.weekday &&
                      p.startTime <= local.toFormat('HH:mm') &&
                      p.endTime > local.toFormat('HH:mm');
                    return (
                      <button
                        className={`period-card ${isBreak ? 'period-break' : ''} ${current ? 'period-now' : ''}`}
                        key={p.id}
                        style={{ '--subject': subject?.colour || '#949c92' } as React.CSSProperties}
                        onClick={() => {
                          setError('');
                          setEditing({ weekday: day.weekday, period: p, isNew: false });
                        }}
                      >
                        <span className="period-time">
                          {p.startTime} – {p.endTime}
                          {current && <b>Now</b>}
                        </span>
                        <strong>
                          {subject && !isBreak && <SubjectIcon subject={subject} size={15} />}
                          {p.label || (isBreak ? p.name : subject?.name || p.name)}
                        </strong>
                        <span className="period-label">
                          {p.name}
                          {p.slotType !== 'LESSON' && p.name.toUpperCase() !== p.slotType
                            ? ` · ${label(p.slotType)}`
                            : ''}
                        </span>
                        {p.room && (
                          <span className="period-room">
                            <MapPin size={12} />
                            {p.room}
                          </span>
                        )}
                        {p.teacherName && (
                          <span className="period-room">
                            <UserRound size={12} />
                            {p.teacherName}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <button className="add-period" disabled={busy} onClick={() => newPeriod(day)}>
                    <Plus size={15} />
                    Add period
                  </button>
                  {edit && !day.periods.length && (
                    <button
                      className="add-period"
                      onClick={() => {
                        setError('');
                        setGenerate(day.weekday);
                      }}
                    >
                      <WandSparkles size={15} />
                      Quick build
                    </button>
                  )}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      <Modal
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={editing?.isNew ? 'Add a period.' : 'Edit your period.'}
        description={editing ? weekdays[editing.weekday - 1] : ''}
      >
        {editing && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const next = days.map((d) =>
                d.weekday !== editing.weekday
                  ? d
                  : {
                      ...d,
                      periods: [
                        ...d.periods.filter((p) => p.id !== editing.period.id),
                        editing.period,
                      ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
                    },
              );
              if (!periodsValid(next.find((d) => d.weekday === editing.weekday)!.periods)) {
                setError('Periods must end after they start and cannot overlap.');
                return;
              }
              if (await save(next)) setEditing(null);
            }}
          >
            <div className="form-grid">
              <Field label="Period name">
                <input
                  value={editing.period.name}
                  required
                  maxLength={80}
                  onChange={(e) => setPeriod('name', e.target.value)}
                />
              </Field>
              <Field label="Type">
                <select
                  value={editing.period.slotType}
                  onChange={(e) => setPeriod('slotType', e.target.value)}
                >
                  {slotTypes.map((t) => (
                    <option key={t} value={t}>
                      {label(t)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start time">
                <input
                  type="time"
                  required
                  value={editing.period.startTime}
                  onChange={(e) => setPeriod('startTime', e.target.value)}
                />
              </Field>
              <Field label="End time">
                <input
                  type="time"
                  required
                  value={editing.period.endTime}
                  onChange={(e) => setPeriod('endTime', e.target.value)}
                />
              </Field>
              <Field label="Subject (optional)">
                <select
                  value={editing.period.subjectId || ''}
                  onChange={(e) => setPeriod('subjectId', e.target.value || null)}
                >
                  <option value="">No subject</option>
                  {data.subjects.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Custom label (optional)">
                <input
                  value={editing.period.label}
                  maxLength={120}
                  onChange={(e) => setPeriod('label', e.target.value)}
                />
              </Field>
              <Field label="Room (optional)">
                <input
                  value={editing.period.room}
                  maxLength={80}
                  onChange={(e) => setPeriod('room', e.target.value)}
                />
              </Field>
              <Field label="Teacher name (optional)">
                <input
                  value={editing.period.teacherName}
                  maxLength={120}
                  onChange={(e) => setPeriod('teacherName', e.target.value)}
                />
              </Field>
            </div>
            <p className="muted small-text">
              <Clock3 size={13} /> Duration:{' '}
              {Math.max(
                0,
                DateTime.fromFormat(editing.period.endTime, 'HH:mm').diff(
                  DateTime.fromFormat(editing.period.startTime, 'HH:mm'),
                  'minutes',
                ).minutes,
              )}{' '}
              minutes
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              {!editing.isNew && (
                <button
                  type="button"
                  className="btn text-danger push-left"
                  onClick={() => {
                    setDeleting({ weekday: editing.weekday, period: editing.period });
                    setEditing(null);
                  }}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              )}
              <button type="button" className="btn secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save period'}
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={copyDay !== null}
        onOpenChange={(open) => {
          if (!open) setCopyDay(null);
        }}
        title="A little less repetition."
        description="Copy all periods, subjects and times to another day. The target day will be enabled."
      >
        <Field label="Copy to">
          <select value={copyTarget} onChange={(e) => setCopyTarget(Number(e.target.value))}>
            {days
              .filter((d) => d.weekday !== copyDay)
              .map((d) => (
                <option value={d.weekday} key={d.weekday}>
                  {weekdays[d.weekday - 1]}
                </option>
              ))}
          </select>
        </Field>
        <p className="muted">Existing periods on the selected day will be replaced.</p>
        <div className="form-actions">
          <button className="btn secondary" onClick={() => setCopyDay(null)}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => setCopyConfirm(true)}>
            Copy day
          </button>
        </div>
      </Modal>
      <Confirm
        open={copyConfirm}
        onOpenChange={setCopyConfirm}
        title={`Replace ${weekdays[copyTarget - 1]}’s timetable?`}
        description="Its existing periods will be replaced with a copy of the selected day."
        onConfirm={async () => {
          const source = days.find((d) => d.weekday === copyDay)!;
          if (
            !(await save(
              days.map((d) =>
                d.weekday === copyTarget
                  ? {
                      ...d,
                      enabled: true,
                      periods: source.periods.map((p) => ({ ...p, id: crypto.randomUUID() })),
                    }
                  : d,
              ),
              'Day copied.',
            ))
          )
            throw new Error('Could not copy');
          setCopyDay(null);
        }}
      />
      <Confirm
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this period?"
        description="Only this period will be removed from the timetable. Homework and study history will stay as they are."
        onConfirm={async () => {
          if (
            !(await save(
              days.map((d) =>
                d.weekday === deleting?.weekday
                  ? { ...d, periods: d.periods.filter((p) => p.id !== deleting.period.id) }
                  : d,
              ),
              'Period deleted.',
            ))
          )
            throw new Error('Could not delete');
          setDeleting(null);
        }}
      />
      <Modal
        open={generate !== null}
        onOpenChange={(open) => {
          if (!open) setGenerate(null);
        }}
        title="Give your day a head start."
        description="Create evenly spaced periods, then customise each one. Gaps are added as editable breaks."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const base = DateTime.fromFormat(genStart, 'HH:mm');
            const end = base.plus({ minutes: genCount * genLength + (genCount - 1) * genGap });
            if (end.toISODate() !== base.toISODate()) {
              setError('These periods would run into the next day. Adjust the duration or number.');
              return;
            }
            const periods: Period[] = [];
            for (let i = 0; i < genCount; i++) {
              const start = base.plus({ minutes: i * (genLength + genGap) });
              const finish = start.plus({ minutes: genLength });
              const common = { subjectId: null, label: '', room: '', teacherName: '' };
              periods.push({
                ...common,
                id: crypto.randomUUID(),
                name: `Period ${i + 1}`,
                slotType: 'LESSON',
                startTime: start.toFormat('HH:mm'),
                endTime: finish.toFormat('HH:mm'),
              });
              if (genGap && i < genCount - 1)
                periods.push({
                  ...common,
                  id: crypto.randomUUID(),
                  name: 'Break',
                  slotType: 'BREAK',
                  startTime: finish.toFormat('HH:mm'),
                  endTime: finish.plus({ minutes: genGap }).toFormat('HH:mm'),
                });
            }
            if (await save(days.map((d) => (d.weekday === generate ? { ...d, periods } : d))))
              setGenerate(null);
          }}
        >
          <div className="form-grid">
            <Field label="Start time">
              <input
                type="time"
                value={genStart}
                onChange={(e) => setGenStart(e.target.value)}
                required
              />
            </Field>
            <Field label="Number of lessons">
              <input
                type="number"
                min="1"
                required
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
              />
            </Field>
            <Field label="Lesson length (minutes)">
              <input
                type="number"
                min="1"
                required
                value={genLength}
                onChange={(e) => setGenLength(Number(e.target.value))}
              />
            </Field>
            <Field label="Break between lessons (minutes)">
              <input
                type="number"
                min="0"
                required
                value={genGap}
                onChange={(e) => setGenGap(Number(e.target.value))}
              />
            </Field>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="btn primary" disabled={busy}>
              {busy ? 'Building…' : 'Build periods'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
