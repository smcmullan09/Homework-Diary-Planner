import { notFound } from 'next/navigation';
import { HomeworkPage, HomeworkForm, HomeworkDetail } from '@/components/homework';
import { SubjectsPage } from '@/components/subjects';
import { TimetablePage } from '@/components/timetable';
import { CalendarPage } from '@/components/calendar';
import { TimerPage } from '@/components/timer';
import { SettingsPage, NotificationsPage, SetupPage } from '@/components/settings';
export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const route = slug.join('/');
  if (route === 'homework') return <HomeworkPage />;
  if (route === 'homework/new') return <HomeworkForm />;
  if (slug[0] === 'homework' && slug.length === 2) return <HomeworkDetail id={slug[1]} />;
  if (route === 'subjects') return <SubjectsPage />;
  if (route === 'timetable' || route === 'timetable/setup')
    return <TimetablePage edit={route.endsWith('/setup')} />;
  if (route === 'calendar') return <CalendarPage />;
  if (route === 'timer') return <TimerPage />;
  if (route === 'settings') return <SettingsPage />;
  if (route === 'notifications') return <NotificationsPage />;
  if (route === 'setup') return <SetupPage />;
  notFound();
}
