'use client';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  Plus,
  BookOpen,
  Calculator,
  FlaskConical,
  PenLine,
  Globe2,
  Atom,
  Music2,
  Palette,
  Check,
  Clock3,
  ArrowUpRight,
} from 'lucide-react';
import { Children, cloneElement, isValidElement, useId, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { useApp } from './provider';
import { dueLabel, overdue, duration } from '@/lib/logic';
import { label, type Homework, type Subject } from '@/lib/types';
export const subjectIcons = {
  book: BookOpen,
  calculator: Calculator,
  flask: FlaskConical,
  pen: PenLine,
  globe: Globe2,
  atom: Atom,
  music: Music2,
  palette: Palette,
};
export function SubjectIcon({ subject, size = 18 }: { subject?: Subject; size?: number }) {
  const Icon = subjectIcons[subject?.icon as keyof typeof subjectIcons] || BookOpen;
  return <Icon size={size} />;
}
export function SubjectBadge({ id }: { id: string }) {
  const { data } = useApp();
  const s = data.subjects.find((x) => x.id === id);
  return (
    <span className="subject-badge">
      <i style={{ background: s?.colour || '#888' }} />
      {s?.name || 'No subject'}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function AddHomework({ date }: { date?: string }) {
  return (
    <Link href={`/homework/new${date ? `?date=${date}` : ''}`} className="btn primary">
      <Plus size={17} />
      Add homework
    </Link>
  );
}
export function Empty({
  title = 'You’re all caught up.',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <BookOpen size={25} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <div className="modal-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-btn" aria-label="Close dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className={description ? 'muted' : 'sr-only'}>
            {description || title}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="form-actions">
        <button className="btn secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
        <button
          className="btn danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onOpenChange(false);
            } catch {
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Please wait…' : 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}
export function TaskRow({ task, compact = false }: { task: Homework; compact?: boolean }) {
  const { data, now, complete } = useApp();
  const [busy, setBusy] = useState(false);
  const done = task.status === 'COMPLETED';
  const late = overdue(task, now);
  const subject = data.subjects.find((s) => s.id === task.subjectId);
  const time = task.dueTime
    ? DateTime.fromISO(`${task.dueDate}T${task.dueTime}`).toFormat(
        data.settings.timeFormat === '12' ? 'h:mm a' : 'HH:mm',
      )
    : '';
  return (
    <div className={`task-row ${done ? 'task-done' : ''}`}>
      <button
        className={`task-check ${done ? 'checked' : ''}`}
        aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`}
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
        {done && <Check size={13} />}
      </button>
      <div className="task-info">
        <Link href={`/homework/${task.id}`} className="task-title">
          {task.title}
        </Link>
        <div className="task-meta">
          <span className="subject-badge">
            <i style={{ background: subject?.colour }} />
            {subject?.name}
          </span>
          <span className={late ? 'text-danger' : ''}>
            {dueLabel(task, data.settings.timezone, now)}
            {time && ` · ${time}`}
          </span>
          {task.estimatedMinutes > 0 && (
            <span className="task-estimate">
              <Clock3 size={12} />
              {duration(task.estimatedMinutes)}
            </span>
          )}
          <span>{label(task.status)}</span>
        </div>
      </div>
      {!compact && task.status === 'IN_PROGRESS' && (
        <span className="badge status-progress">In progress</span>
      )}
      <span className={`badge priority-${task.priority.toLowerCase()}`}>
        {task.priority === 'URGENT' && '↑ '}
        {label(task.priority)}
      </span>
      <Link
        className="task-open icon-btn"
        aria-label={`Open ${task.title}`}
        href={`/homework/${task.id}`}
      >
        <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
export function Field({
  label: title,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  const id = useId();
  const control = (child: React.ReactNode) =>
    isValidElement(child) &&
    typeof child.type === 'string' &&
    ['input', 'select', 'textarea'].includes(child.type);
  const hasControl = Children.toArray(children).some(control);
  return (
    <div className="field">
      {hasControl ? <label htmlFor={id}>{title}</label> : <span>{title}</span>}
      {Children.map(children, (child) =>
        control(child)
          ? cloneElement(child as ReactElement<{ id?: string; 'aria-describedby'?: string }>, {
              id,
              'aria-describedby': hint ? `${id}-hint` : undefined,
            })
          : child,
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
