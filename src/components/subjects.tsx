'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ArrowUpRight } from 'lucide-react';
import { useApp } from './provider';
import { PageHeader, Empty, Modal, Confirm, Field, SubjectIcon, subjectIcons } from './ui';
import type { Subject } from '@/lib/types';
const colours = [
  '#72957b',
  '#7699ba',
  '#b18bb9',
  '#c59b63',
  '#c58080',
  '#79a7a1',
  '#8d90bf',
  '#b39075',
];
export function SubjectsPage() {
  const { data, mutate } = useApp();
  const [editing, setEditing] = useState<Subject | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [colour, setColour] = useState(colours[0]);
  const [icon, setIcon] = useState('book');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function open(subject: Subject | 'new') {
    setEditing(subject);
    setName(subject === 'new' ? '' : subject.name);
    setColour(subject === 'new' ? colours[data.subjects.length % colours.length] : subject.colour);
    setIcon(subject === 'new' ? 'book' : subject.icon);
    setError('');
  }
  const uses = deleting
    ? data.homework.filter((h) => h.subjectId === deleting.id).length +
      data.days.reduce((a, d) => a + d.periods.filter((p) => p.subjectId === deleting.id).length, 0)
    : 0;
  return (
    <>
      <PageHeader
        eyebrow="EVERYTHING HAS ITS PLACE"
        title="Your subjects."
        description="A little organisation for everything you’re learning."
        action={
          <button className="btn primary" onClick={() => open('new')}>
            <Plus size={17} />
            Add subject
          </button>
        }
      />
      {data.subjects.length ? (
        <div className="subjects-grid">
          {data.subjects.map((s) => {
            const tasks = data.homework.filter((h) => h.subjectId === s.id);
            const completed = tasks.filter((h) => h.status === 'COMPLETED').length;
            return (
              <article className="panel subject-card" key={s.id}>
                <div className="subject-card-top">
                  <span
                    className="subject-icon"
                    style={{ color: s.colour, background: `${s.colour}19` }}
                  >
                    <SubjectIcon subject={s} size={24} />
                  </span>
                  <div className="button-row">
                    <button
                      className="icon-btn"
                      title={`Edit ${s.name}`}
                      aria-label={`Edit ${s.name}`}
                      onClick={() => open(s)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      title={`Delete ${s.name}`}
                      aria-label={`Delete ${s.name}`}
                      onClick={() => setDeleting(s)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h2>{s.name}</h2>
                <p className="muted">
                  {tasks.length - completed} active{' '}
                  {tasks.length - completed === 1 ? 'task' : 'tasks'}{' '}
                  <span className="separator">·</span> {completed} completed
                </p>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%`,
                      background: s.colour,
                    }}
                  />
                </div>
                <Link className="text-link" href={`/homework?q=${encodeURIComponent(s.name)}`}>
                  View homework <ArrowUpRight size={16} />
                </Link>
              </article>
            );
          })}
          <button className="subject-add" onClick={() => open('new')}>
            <Plus size={27} />
            <strong>Something new to learn?</strong>
            <span>Add a subject</span>
          </button>
        </div>
      ) : (
        <Empty
          title="Create your first subject."
          description="Give each subject its own colour and a place in your planner."
          action={
            <button className="btn primary" onClick={() => open('new')}>
              <Plus size={16} />
              Add subject
            </button>
          }
        />
      )}
      <Modal
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={editing === 'new' ? 'A new subject.' : 'Edit subject.'}
        description="A name, a colour, and a little personality."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              const body = { name, colour, icon };
              await mutate(
                'subjects',
                editing === 'new' ? 'POST' : 'PUT',
                editing === 'new' ? body : { id: (editing as Subject).id, data: body },
                'Subject saved.',
              );
              setEditing(null);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Subject name">
            <input
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathematics"
            />
          </Field>
          <Field label="Colour">
            <div className="colour-options">
              {colours.map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-label={`Colour ${c}`}
                  aria-pressed={colour === c}
                  className={colour === c ? 'selected' : ''}
                  style={{ background: c }}
                  onClick={() => setColour(c)}
                />
              ))}
              <input
                type="color"
                aria-label="Custom subject colour"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Icon">
            <div className="icon-options">
              {Object.entries(subjectIcons).map(([key, Icon]) => (
                <button
                  type="button"
                  key={key}
                  aria-label={`${key} icon`}
                  aria-pressed={icon === key}
                  className={`icon-btn ${icon === key ? 'selected' : ''}`}
                  onClick={() => setIcon(key)}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </Field>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save subject'}
            </button>
          </div>
        </form>
      </Modal>
      {uses > 0 ? (
        <Modal
          open={!!deleting}
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          title="This subject is still in use."
          description={`${deleting?.name} is linked to ${uses} homework tasks or timetable periods. Reassign or delete those items first. Your work won’t be deleted automatically.`}
        >
          <div className="form-actions">
            <button className="btn primary" onClick={() => setDeleting(null)}>
              Got it
            </button>
          </div>
        </Modal>
      ) : (
        <Confirm
          open={!!deleting}
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          title={`Delete ${deleting?.name}?`}
          description="This subject will be removed. Any study sessions will remain in your history without a linked subject."
          onConfirm={async () => {
            await mutate('subjects', 'DELETE', { id: deleting?.id }, 'Subject deleted.');
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
