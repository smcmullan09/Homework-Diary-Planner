'use client';
import Link from 'next/link';
import { DateTime } from 'luxon';
import {
  ArrowRight,
  CalendarDays,
  CheckCheck,
  Clock3,
  CircleAlert,
  ArrowUpRight,
  Sun,
  BookOpen,
  Timer,
  Sparkles,
} from 'lucide-react';
import { useApp } from './provider';
import { AddHomework, Empty, PageHeader, TaskRow, SubjectIcon } from './ui';
import { overdue, lessonState, duration } from '@/lib/logic';
export function Dashboard() {
  const { data, now } = useApp();
  const local = DateTime.fromJSDate(now, { zone: data.settings.timezone });
  const today = local.toISODate()!;
  const week = local.startOf('week');
  const incomplete = data.homework.filter((h) => h.status !== 'COMPLETED');
  const todays = incomplete.filter((h) => h.dueDate === today);
  const upcoming = incomplete.filter((h) => h.dueDate > today);
  const late = incomplete.filter((h) => overdue(h, now));
  const completed = data.homework.filter(
    (h) => h.completedAt && DateTime.fromISO(h.completedAt) >= week,
  );
  const studied = Math.floor(
    data.sessions
      .filter((s) => DateTime.fromISO(s.startTime) >= week)
      .reduce((a, s) => a + s.durationSeconds, 0) / 60,
  );
  const periods = data.days.find((d) => d.enabled && d.weekday === local.weekday)?.periods || [];
  const lesson = lessonState(periods, data.settings.timezone, now);
  const total = completed.length + incomplete.length;
  const progress = total ? Math.round((completed.length / total) * 100) : 0;
  const greeting =
    local.hour < 12 ? 'Good morning' : local.hour < 17 ? 'Good afternoon' : 'Good evening';
  const chart = Array.from({ length: 7 }, (_, i) => {
    const day = week.plus({ days: i });
    return {
      day: day.toFormat('ccc'),
      minutes: data.sessions
        .filter(
          (s) =>
            DateTime.fromISO(s.startTime).setZone(data.settings.timezone).toISODate() ===
            day.toISODate(),
        )
        .reduce((a, s) => a + s.durationSeconds / 60, 0),
      today: day.toISODate() === today,
    };
  });
  const max = Math.max(60, ...chart.map((c) => c.minutes));
  return (
    <>
      <PageHeader
        eyebrow={local.toFormat('cccc, d LLLL yyyy')}
        title={`${greeting}.`}
        description="A fresh perspective on everything you have to do."
        action={<AddHomework />}
      />
      {!data.onboarded && (
        <div className="onboarding-banner">
          <span>
            <Sparkles size={18} />
            <strong>Make this space your own.</strong> Set up your subjects, timetable and
            reminders.
          </span>
          <Link href="/setup">
            Get started <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <section className="stats-grid" aria-label="Homework overview">
        {[
          {
            title: 'Due today',
            value: todays.length,
            note: 'Let’s make a little progress',
            icon: CalendarDays,
            style: 'sage',
            href: '/homework?view=today',
          },
          {
            title: 'Due soon',
            value: upcoming.filter((h) => h.dueDate <= local.plus({ days: 7 }).toISODate()!).length,
            note: 'In the next 7 days',
            icon: Clock3,
            style: 'blue',
            href: '/homework?view=upcoming',
          },
          {
            title: 'Overdue',
            value: late.length,
            note: late.length ? 'A little attention needed' : 'Nothing left behind',
            icon: CircleAlert,
            style: 'amber',
            href: '/homework?view=overdue',
          },
          {
            title: 'Completed',
            value: completed.length,
            note: 'This week · keep it going',
            icon: CheckCheck,
            style: 'purple',
            href: '/homework?view=completed',
          },
        ].map((s) => (
          <Link href={s.href} className={`stat-card ${s.style}`} key={s.title}>
            <div className="stat-top">
              <span>{s.title}</span>
              <span className="stat-icon">
                <s.icon size={18} />
              </span>
            </div>
            <strong className="stat-number">{s.value.toString().padStart(2, '0')}</strong>
            <div className="stat-bottom">
              <span>{s.note}</span>
              <ArrowUpRight size={15} />
            </div>
          </Link>
        ))}
      </section>
      <div className="dashboard-grid">
        <div className="dashboard-left">
          <section className="panel">
            <div className="panel-heading">
              <h2>
                <Sun size={19} />
                Today’s homework <span className="count-badge">{todays.length}</span>
              </h2>
              <Link className="text-link" href="/homework?view=today">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {todays.length ? (
              <div>
                {todays.map((h) => (
                  <TaskRow task={h} key={h.id} compact />
                ))}
              </div>
            ) : (
              <Empty
                title="A little breathing room."
                description="You have no homework due today."
                action={
                  <Link className="text-link" href="/homework">
                    Plan what’s next <ArrowRight size={14} />
                  </Link>
                }
              />
            )}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>
                <BookOpen size={19} />
                Coming up next
              </h2>
              <Link className="text-link" href="/homework?view=upcoming">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="panel-subtitle">A look ahead, so nothing catches you by surprise.</div>
            {upcoming.length ? (
              upcoming.slice(0, 4).map((h) => <TaskRow task={h} key={h.id} compact />)
            ) : (
              <Empty description="Add homework when you’re ready." action={<AddHomework />} />
            )}
          </section>
          {late.length > 0 && (
            <div className="overdue-callout">
              <CircleAlert size={19} />
              <div>
                <strong>A quick catch-up?</strong>
                <p>
                  {late.length} {late.length === 1 ? 'task needs' : 'tasks need'} a little extra
                  attention. A small start makes a difference.
                </p>
              </div>
              <Link href="/homework?view=overdue" className="text-link">
                Review <ArrowRight size={15} />
              </Link>
            </div>
          )}
          <section className="study-banner">
            <div>
              <span className="eyebrow">MAKE A LITTLE SPACE FOR FOCUS</span>
              <h2>Small sessions. Steady progress.</h2>
              <p>Pick one task, start your timer, and take it from there.</p>
              <Link href="/timer" className="btn primary">
                <Timer size={16} />
                Start a study session <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="focus-dial" aria-hidden="true">
              <span>
                25
                <span>
                  MINUTES
                  <br />
                  JUST FOR YOU
                </span>
              </span>
              <i />
            </div>
          </section>
        </div>
        <div className="dashboard-right">
          <section className="panel timetable-today">
            <div className="panel-heading">
              <h2>
                <CalendarDays size={18} />
                Today’s timetable
              </h2>
              <Link href="/timetable" className="icon-btn" aria-label="Open timetable">
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="timetable-day-label">
              <span>{local.toFormat('cccc')}</span>
              <span>{periods.filter((p) => p.slotType === 'LESSON').length} lessons</span>
            </div>
            {periods.length ? (
              <div className="lesson-list">
                {periods.map((p) => {
                  const subject = data.subjects.find((s) => s.id === p.subjectId);
                  const current = lesson.current?.id === p.id;
                  const next = lesson.next?.id === p.id;
                  const finished = p.endTime <= local.toFormat('HH:mm');
                  return (
                    <div
                      className={`lesson-item ${current ? 'lesson-current' : ''} ${finished ? 'lesson-finished' : ''}`}
                      key={p.id}
                    >
                      <div className="lesson-time">
                        <strong>
                          {DateTime.fromISO(`${today}T${p.startTime}`).toFormat(
                            data.settings.timeFormat === '12' ? 'h:mm a' : 'HH:mm',
                          )}
                        </strong>
                        <span>{p.endTime}</span>
                      </div>
                      <span
                        className="lesson-line"
                        style={{ background: subject?.colour || 'var(--line)' }}
                      />
                      <div className="lesson-name">
                        <strong>{p.label || subject?.name || p.name}</strong>
                        <span>
                          {p.slotType === 'LESSON'
                            ? [p.name, p.room && `Room ${p.room}`].filter(Boolean).join(' · ')
                            : p.name}
                        </span>
                      </div>
                      {current ? (
                        <span className="live-badge">Now</span>
                      ) : next ? (
                        <span className="next-badge">Next</span>
                      ) : finished ? (
                        <CheckCheck size={14} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty
                title="No lessons today."
                description={
                  data.days.length
                    ? 'A day to do things at your own pace.'
                    : 'Set up your timetable to see today’s lessons here.'
                }
                action={
                  !data.days.length && (
                    <Link className="text-link" href="/timetable/setup">
                      Set up timetable <ArrowRight size={14} />
                    </Link>
                  )
                }
              />
            )}
            {lesson.finished && (
              <div className="school-finished">
                <CheckCheck size={15} />
                That’s the school day done.
              </div>
            )}
            <Link href="/timetable" className="panel-footer-link">
              View weekly timetable <ArrowRight size={14} />
            </Link>
          </section>
          <section className="panel week-summary">
            <div className="panel-heading">
              <h2>This week, at a glance</h2>
              <span className="subtle-label">
                {week.toFormat('d')}–{week.plus({ days: 6 }).toFormat('d LLL')}
              </span>
            </div>
            <div className="weekly-progress">
              <div>
                <strong>{completed.length}</strong>
                <span>tasks completed</span>
              </div>
              <div
                className="progress-ring"
                style={{ '--progress': `${progress}%` } as React.CSSProperties}
              >
                <span>{progress}%</span>
              </div>
            </div>
            <div className="summary-metrics">
              <span>
                <i className="dot sage-dot" />
                {incomplete.length} remaining
              </span>
              <span>
                <Clock3 size={13} />
                {duration(incomplete.reduce((a, h) => a + h.estimatedMinutes, 0))} estimated
              </span>
            </div>
            <div className="study-chart-heading">
              <span>Study time</span>
              <strong>
                {duration(studied)} <span>this week</span>
              </strong>
            </div>
            <div
              className="study-chart"
              aria-label={`Study minutes by day: ${chart.map((c) => `${c.day} ${Math.round(c.minutes)}`).join(', ')}`}
            >
              {chart.map((c) => (
                <div className="chart-column" key={c.day}>
                  <div
                    className={`chart-bar ${c.today ? 'chart-today' : ''}`}
                    style={{ height: `${Math.max(3, (c.minutes / max) * 75)}px` }}
                    title={`${c.day}: ${Math.round(c.minutes)} minutes`}
                  />
                  <span>{c.day[0]}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
