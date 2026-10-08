'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DateTime } from 'luxon';
import {
  Search,
  SlidersHorizontal,
  ArrowLeft,
  Check,
  Pencil,
  Trash2,
  Timer,
  CalendarDays,
  Clock3,
  BookOpen,
  Bell,
} from 'lucide-react';
import { useApp } from './provider';
import { AddHomework, PageHeader, Empty, TaskRow, Field, Confirm, SubjectBadge } from './ui';
import { priorities, statuses, label, type Homework, type ReminderPreferences } from '@/lib/types';
import { overdue, dueLabel, duration } from '@/lib/logic';
const views = [
  ['all', 'All homework'],
  ['today', 'Due today'],
  ['upcoming', 'Upcoming'],
  ['overdue', 'Overdue'],
  ['completed', 'Completed'],
] as const;
export function HomeworkPage() {
  const { data, now } = useApp();
  const params = useSearchParams();
  const [view, setView] = useState(params.get('view') || 'all');
  const [search, setSearch] = useState(params.get('q') || '');
  useEffect(() => {
    setView(params.get('view') || 'all');
    setSearch(params.get('q') || '');
  }, [params]);
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState('due');
  const today = DateTime.fromJSDate(now, { zone: data.settings.timezone }).toISODate()!;
  const matchesView = (h: Homework, v: string) =>
    v === 'today'
      ? h.dueDate === today && h.status !== 'COMPLETED'
      : v === 'upcoming'
        ? h.dueDate > today && h.status !== 'COMPLETED'
        : v === 'overdue'
          ? overdue(h, now)
          : v === 'completed'
            ? h.status === 'COMPLETED'
            : true;
  const tasks = data.homework
    .filter(
      (h) =>
        matchesView(h, view) &&
        `${h.title} ${h.description} ${data.subjects.find((s) => s.id === h.subjectId)?.name}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!subject || h.subjectId === subject) &&
        (!priority || h.priority === priority) &&
        (!status || h.status === status) &&
        (!date || h.dueDate === date),
    )
    .sort((a, b) =>
      sort === 'priority'
        ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority)
        : sort === 'title'
          ? a.title.localeCompare(b.title)
          : sort === 'newest'
            ? b.createdAt.localeCompare(a.createdAt)
            : a.dueAt.localeCompare(b.dueAt),
    );
  return (
    <>
      <PageHeader
        eyebrow="A LITTLE STRUCTURE GOES A LONG WAY"
        title="Your homework."
        description="Everything you’re working on, in one place."
        action={<AddHomework />}
      />
      <div className="tabs" role="tablist" aria-label="Homework views">
        {views.map(([key, title]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            className={view === key ? 'active' : ''}
            onClick={() => setView(key)}
          >
            {title}
            <span>{data.homework.filter((h) => matchesView(h, key)).length}</span>
          </button>
        ))}
      </div>
      <section className="panel homework-panel">
        <div className="filter-bar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search homework list"
              placeholder="Search your homework…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">All subjects</option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            {priorities.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select aria-label="Sort homework" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="due">Due date</option>
            <option value="priority">Priority</option>
            <option value="title">Title A–Z</option>
            <option value="newest">Newest first</option>
          </select>
        </div>
        <div className="secondary-filters">
          <SlidersHorizontal size={15} />
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option value={s} key={s}>
                {label(s)}
              </option>
            ))}
          </select>
          <label>
            Due on{' '}
            <input
              aria-label="Filter due date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {(subject || priority || status || date || search) && (
            <button
              className="text-link"
              onClick={() => {
                setSubject('');
                setPriority('');
                setStatus('');
                setDate('');
                setSearch('');
              }}
            >
              Clear filters
            </button>
          )}
          <span className="result-count">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>
        {tasks.length ? (
          tasks.map((h) => <TaskRow task={h} key={h.id} />)
        ) : (
          <Empty
            title={data.homework.length ? 'Nothing here just yet.' : 'You’re all caught up.'}
            description={
              data.homework.length
                ? 'Try another view or adjust your filters.'
                : 'Add your first homework and give your day a little structure.'
            }
            action={<AddHomework />}
          />
        )}
      </section>
    </>
  );
}
export function ReminderFields({
  value,
  onChange,
}: {
  value: ReminderPreferences;
  onChange: (value: ReminderPreferences) => void;
}) {
  const options = [
    { value: 10080, text: '7 days before' },
    { value: 4320, text: '3 days before' },
    { value: 1440, text: '1 day before' },
    { value: 180, text: '3 hours before' },
    { value: 60, text: '1 hour before' },
  ];
  const [custom, setCustom] = useState('');
  return (
    <>
      <div className="inline-checks">
        <label>
          <input
            type="checkbox"
            checked={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.checked })}
          />
          Email
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.sms}
            onChange={(e) => onChange({ ...value, sms: e.target.checked })}
          />
          SMS
        </label>
      </div>
      <div className="reminder-options">
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="checkbox"
              checked={value.offsets.includes(o.value)}
              onChange={(e) =>
                onChange({
                  ...value,
                  offsets: e.target.checked
                    ? [...value.offsets, o.value]
                    : value.offsets.filter((x) => x !== o.value),
                })
              }
            />
            {o.text}
          </label>
        ))}
        {value.offsets
          .filter((v) => !options.some((o) => o.value === v))
          .map((v) => (
            <button
              type="button"
              className="badge"
              key={v}
              onClick={() => onChange({ ...value, offsets: value.offsets.filter((x) => x !== v) })}
            >
              {v} minutes before ×
            </button>
          ))}
      </div>
      <div className="custom-offset">
        <input
          aria-label="Custom reminder minutes before due"
          type="number"
          min="1"
          max="525600"
          placeholder="Custom minutes"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <button
          type="button"
          className="btn secondary small"
          disabled={
            !Number.isInteger(Number(custom)) ||
            Number(custom) < 1 ||
            Number(custom) > 525600 ||
            value.offsets.length >= 30
          }
          onClick={() => {
            onChange({ ...value, offsets: [...new Set([...value.offsets, Number(custom)])] });
            setCustom('');
          }}
        >
          Add reminder
        </button>
      </div>
    </>
  );
}
export function HomeworkForm({ task, onCancel }: { task?: Homework; onCancel?: () => void }) {
  const { data, now, mutate } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const today = DateTime.fromJSDate(now, { zone: data.settings.timezone }).toISODate()!;
  const selected = params.get('date');
  const validSelected = selected && /^\d{4}-\d{2}-\d{2}$/.test(selected) ? selected : today;
  const [values, setValues] = useState({
    title: task?.title || '',
    subjectId: task?.subjectId || data.subjects[0]?.id || '',
    description: task?.description || '',
    assignedDate: task?.assignedDate || (validSelected < today ? validSelected : today),
    dueDate: task?.dueDate || validSelected,
    dueTime: task?.dueTime || '',
    priority: task?.priority || 'MEDIUM',
    status: task?.status || 'NOT_STARTED',
    estimatedMinutes: task?.estimatedMinutes || 0,
    notes: task?.notes || '',
  });
  const [override, setOverride] = useState<ReminderPreferences | null>(
    task?.reminderOverride || null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof values, value: string | number) =>
    setValues((v) => ({ ...v, [key]: value }));
  if (!data.subjects.length)
    return (
      <>
        <PageHeader
          title="A subject comes first."
          description="Create a subject to organise your new homework."
        />
        <Empty
          title="Create your first subject."
          action={
            <Link href="/subjects" className="btn primary">
              Add a subject
            </Link>
          }
        />
      </>
    );
  return (
    <>
      <button
        className="text-link back-link"
        onClick={() => (onCancel ? onCancel() : router.push('/homework'))}
      >
        <ArrowLeft size={15} />
        Back to {task ? 'homework details' : 'homework'}
      </button>
      <PageHeader
        title={task ? 'Edit homework.' : 'Make a little plan.'}
        description={
          task ? 'Keep the details up to date.' : 'Get it out of your head and into your planner.'
        }
      />
      <form
        className="panel homework-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          setBusy(true);
          try {
            const saved = await mutate<{ id: string }>(
              'homework',
              task ? 'PUT' : 'POST',
              {
                ...values,
                dueTime: values.dueTime || null,
                reminderOverride: override,
                ...(task ? { id: task.id } : {}),
              },
              task ? 'Homework updated.' : 'Homework added to your planner.',
            );
            if (onCancel) onCancel();
            else router.push(`/homework/${saved.id}`);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-section">
          <h2>The essentials</h2>
          <Field label="Homework title *">
            <input
              value={values.title}
              maxLength={180}
              required
              placeholder="e.g. Quadratic equations worksheet"
              onChange={(e) => set('title', e.target.value)}
              autoFocus
            />
          </Field>
          <div className="form-grid">
            <Field label="Subject *">
              <select
                value={values.subjectId}
                required
                onChange={(e) => set('subjectId', e.target.value)}
              >
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select value={values.priority} onChange={(e) => set('priority', e.target.value)}>
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {label(p)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description / instructions">
            <textarea
              rows={4}
              placeholder="What do you need to do?"
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
        </div>
        <div className="form-section">
          <h2>A time and a place</h2>
          <div className="form-grid">
            <Field label="Date assigned *">
              <input
                type="date"
                required
                value={values.assignedDate}
                onChange={(e) => set('assignedDate', e.target.value)}
              />
            </Field>
            <Field label="Due date *">
              <input
                type="date"
                min={values.assignedDate}
                required
                value={values.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </Field>
            <Field
              label="Due time (optional)"
              hint={`No time means end of day in ${data.settings.timezone}.`}
            >
              <input
                type="time"
                value={values.dueTime}
                onChange={(e) => set('dueTime', e.target.value)}
              />
            </Field>
            <Field label="Estimated time (minutes)">
              <input
                type="number"
                min="0"
                max="100000"
                value={values.estimatedMinutes}
                onChange={(e) => set('estimatedMinutes', Number(e.target.value))}
              />
            </Field>
            <Field label="Status">
              <select value={values.status} onChange={(e) => set('status', e.target.value)}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Personal notes">
            <textarea
              rows={3}
              placeholder="Anything you want to remember…"
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </Field>
        </div>
        <div className="form-section">
          <h2>
            <Bell size={18} />
            Reminders
          </h2>
          <label className="check-label">
            <input
              type="checkbox"
              checked={!!override}
              onChange={(e) =>
                setOverride(
                  e.target.checked
                    ? {
                        email: data.settings.email,
                        sms: data.settings.sms,
                        offsets: data.settings.offsets,
                      }
                    : null,
                )
              }
            />
            Use custom reminders for this homework
          </label>
          {override ? (
            <ReminderFields value={override} onChange={setOverride} />
          ) : (
            <p className="muted">
              Uses your default reminder preferences. <Link href="/settings">Manage settings</Link>
            </p>
          )}
          <small className="muted">
            Channels must also be enabled in Settings. Reminders stop when homework is completed.
          </small>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => (onCancel ? onCancel() : router.push('/homework'))}
          >
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            <Check size={16} />
            {busy ? 'Saving…' : task ? 'Save changes' : 'Add homework'}
          </button>
        </div>
      </form>
    </>
  );
}
export function HomeworkDetail({ id }: { id: string }) {
  const { data, now, mutate, complete } = useApp();
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const task = data.homework.find((h) => h.id === id);
  if (!task)
    return (
      <Empty
        title="This homework isn’t here."
        description="It may have been deleted."
        action={
          <Link href="/homework" className="btn primary">
            Back to homework
          </Link>
        }
      />
    );
  if (edit) return <HomeworkForm task={task} onCancel={() => setEdit(false)} />;
  const prefs = task.reminderOverride || data.settings;
  const fmt = (date: string) => DateTime.fromISO(date).toFormat(data.settings.dateFormat);
  return (
    <>
      <Link href="/homework" className="text-link back-link">
        <ArrowLeft size={15} />
        Back to homework
      </Link>
      <PageHeader
        eyebrow={dueLabel(task, data.settings.timezone, now)}
        title={task.title}
        action={
          <div className="button-row">
            <button className="btn secondary" onClick={() => setEdit(true)}>
              <Pencil size={16} />
              Edit
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await complete(task);
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={16} />
              {task.status === 'COMPLETED' ? 'Mark incomplete' : 'Mark complete'}
            </button>
          </div>
        }
      />
      <div className="detail-grid">
        <section className="panel detail-main">
          <div className="detail-badges">
            <SubjectBadge id={task.subjectId} />
            <span className={`badge priority-${task.priority.toLowerCase()}`}>
              {label(task.priority)} priority
            </span>
            <span className="badge">{label(task.status)}</span>
          </div>
          <h2>What you’re working on</h2>
          <p className="preserve-text">{task.description || 'No instructions added yet.'}</p>
          <h2>Your notes</h2>
          <p className="preserve-text muted">
            {task.notes || 'A little space for anything you want to remember.'}
          </p>
          <div className="detail-dates">
            <span>Created {fmt(task.createdAt)}</span>
            <span>Updated {fmt(task.updatedAt)}</span>
            {task.completedAt && <span>Completed {fmt(task.completedAt)}</span>}
          </div>
        </section>
        <aside className="detail-aside">
          <section className="panel detail-facts">
            <h2>The details</h2>
            <dl>
              <div>
                <dt>
                  <BookOpen size={15} />
                  Assigned
                </dt>
                <dd>{fmt(task.assignedDate)}</dd>
              </div>
              <div>
                <dt>
                  <CalendarDays size={15} />
                  Due
                </dt>
                <dd>
                  {fmt(task.dueDate)}
                  {task.dueTime ? ` · ${task.dueTime}` : ' · End of day'}
                </dd>
              </div>
              <div>
                <dt>
                  <Clock3 size={15} />
                  Estimated
                </dt>
                <dd>{task.estimatedMinutes ? duration(task.estimatedMinutes) : 'Not set'}</dd>
              </div>
              <div>
                <dt>
                  <Timer size={15} />
                  Time studied
                </dt>
                <dd>{duration(Math.floor(task.actualSeconds / 60))}</dd>
              </div>
            </dl>
            <Link className="btn primary full" href={`/timer?task=${task.id}`}>
              <Timer size={17} />
              Start studying
            </Link>
          </section>
          <section className="panel detail-facts">
            <h2>Reminders</h2>
            <p className="muted">
              {task.reminderOverride ? 'Custom settings' : 'Using your defaults'}
            </p>
            <p>
              {prefs.email && data.settings.email ? 'Email on' : 'Email off'} ·{' '}
              {prefs.sms && data.settings.sms ? 'SMS on' : 'SMS off'}
            </p>
            <p className="muted">
              {prefs.offsets.map((m) => `${duration(m)} before`).join(', ') ||
                'No reminder times selected'}
            </p>
            {task.status === 'COMPLETED' && (
              <p className="success-text">Completed — no reminders will be sent.</p>
            )}
          </section>
          <button className="btn text-danger" onClick={() => setConfirm(true)}>
            <Trash2 size={16} />
            Delete homework
          </button>
        </aside>
      </div>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this homework?"
        description="The task and its reminders will be deleted. Your recorded study sessions will stay in your history without a linked task."
        onConfirm={async () => {
          await mutate('homework', 'DELETE', { id }, 'Homework deleted.');
          router.push('/homework');
        }}
      />
    </>
  );
}
