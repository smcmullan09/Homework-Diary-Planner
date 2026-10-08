'use client';
import { useState } from 'react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
import { useApp } from './provider';
import { PageHeader, AddHomework, TaskRow, Empty } from './ui';
import { weekdays } from '@/lib/types';
import { overdue } from '@/lib/logic';
export function CalendarPage() {
  const { data, now } = useApp();
  const local = DateTime.fromJSDate(now, { zone: data.settings.timezone });
  const [cursor, setCursor] = useState(local.startOf('month'));
  const [view, setView] = useState<'month' | 'week' | 'agenda'>('month');
  const start = view === 'week' ? cursor.startOf('week') : cursor.startOf('month').startOf('week');
  const length =
    view === 'week' ? 7 : Math.ceil(cursor.endOf('month').diff(start, 'days').days / 7) * 7;
  const days = Array.from({ length }, (_, i) => start.plus({ days: i }));
  const tasks = data.homework.filter(
    (h) =>
      h.dueDate >= cursor.startOf('month').toISODate()! &&
      h.dueDate <= cursor.endOf('month').toISODate()!,
  );
  return (
    <>
      <PageHeader
        eyebrow="SEE WHAT’S ON THE HORIZON"
        title="Your calendar."
        description="A little perspective on the days ahead."
        action={<AddHomework />}
      />
      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <div className="button-row">
            <button
              className="icon-btn"
              aria-label="Previous period"
              onClick={() =>
                setCursor((c) => c.minus(view === 'week' ? { weeks: 1 } : { months: 1 }))
              }
            >
              <ChevronLeft size={19} />
            </button>
            <h2>
              {view === 'week'
                ? `${start.toFormat('d LLL')} – ${start.plus({ days: 6 }).toFormat('d LLL yyyy')}`
                : cursor.toFormat('LLLL yyyy')}
            </h2>
            <button
              className="icon-btn"
              aria-label="Next period"
              onClick={() =>
                setCursor((c) => c.plus(view === 'week' ? { weeks: 1 } : { months: 1 }))
              }
            >
              <ChevronRight size={19} />
            </button>
            <button className="btn secondary small" onClick={() => setCursor(local)}>
              Today
            </button>
          </div>
          <div className="segmented" aria-label="Calendar view">
            {(['month', 'week', 'agenda'] as const).map((v) => (
              <button
                aria-pressed={view === v}
                className={view === v ? 'active' : ''}
                key={v}
                onClick={() => setView(v)}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {view === 'agenda' ? (
          <div>
            {tasks.length ? (
              [...new Set(tasks.map((h) => h.dueDate))].sort().map((date) => (
                <div key={date}>
                  <h3 className="agenda-date">{DateTime.fromISO(date).toFormat('cccc, d LLLL')}</h3>
                  {tasks
                    .filter((h) => h.dueDate === date)
                    .map((h) => (
                      <TaskRow task={h} key={h.id} />
                    ))}
                </div>
              ))
            ) : (
              <Empty
                title="A little open space."
                description="No homework due this month."
                action={<AddHomework date={cursor.toISODate()!} />}
              />
            )}
          </div>
        ) : (
          <div className={`calendar-grid ${view === 'week' ? 'calendar-week' : ''}`}>
            <div className="calendar-weekdays">
              {weekdays.map((d) => (
                <span key={d}>{d.slice(0, 3)}</span>
              ))}
            </div>
            <div className="calendar-days">
              {days.map((day) => {
                const date = day.toISODate()!;
                const dayTasks = data.homework.filter((h) => h.dueDate === date);
                return (
                  <div
                    className={`calendar-cell ${day.month !== cursor.month ? 'outside-month' : ''} ${date === local.toISODate() ? 'calendar-today' : ''}`}
                    key={date}
                  >
                    <div className="calendar-date">
                      <span>{day.day}</span>
                      <Link
                        href={`/homework/new?date=${date}`}
                        className="calendar-add"
                        aria-label={`Add homework for ${date}`}
                      >
                        <Plus size={13} />
                      </Link>
                    </div>
                    {dayTasks.map((h) => (
                      <Link
                        key={h.id}
                        href={`/homework/${h.id}`}
                        title={`${h.title} · ${h.status === 'COMPLETED' ? 'Completed' : overdue(h, now) ? 'Overdue' : 'Due'}${h.dueTime ? ` ${h.dueTime}` : ''}`}
                        className={`calendar-event ${h.status === 'COMPLETED' ? 'event-complete' : ''} ${overdue(h, now) ? 'event-overdue' : ''}`}
                        style={
                          {
                            '--subject':
                              data.subjects.find((s) => s.id === h.subjectId)?.colour || '#999',
                          } as React.CSSProperties
                        }
                      >
                        {h.status === 'COMPLETED' ? (
                          <Check size={11} />
                        ) : overdue(h, now) ? (
                          <span>!</span>
                        ) : null}
                        <span>{h.title}</span>
                        {h.dueTime && <small>{h.dueTime}</small>}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
      <div className="calendar-legend">
        <span>Click a date’s + to add homework</span>
        <span>✓ Completed</span>
        <span>! Overdue</span>
        {data.subjects.map((s) => (
          <span key={s.id}>
            <i className="dot" style={{ background: s.colour }} />
            {s.name}
          </span>
        ))}
      </div>
    </>
  );
}
