import 'dotenv/config';
import { DateTime } from 'luxon';
import { randomUUID } from 'node:crypto';
import { db } from '../src/server/db';
import { defaultSettings } from '../src/lib/types';
import { dueInstant } from '../src/lib/logic';
export async function seedDemo() {
  const owner = await db.owner.findUnique({ where: { id: 'owner' } });
  const zone: string = owner
    ? JSON.parse(owner.settings).timezone || defaultSettings.timezone
    : defaultSettings.timezone;
  const now = DateTime.now().setZone(zone);
  const today = now.toISODate()!;
  const subjects = [
    { id: 'demo-maths', name: 'Maths', colour: '#809a78', icon: 'calculator' },
    { id: 'demo-english', name: 'English', colour: '#b38eb4', icon: 'pen' },
    { id: 'demo-biology', name: 'Biology', colour: '#7caaa2', icon: 'flask' },
    { id: 'demo-history', name: 'History', colour: '#c1a06d', icon: 'globe' },
  ];
  for (const s of subjects) await db.subject.upsert({ where: { id: s.id }, create: s, update: {} });
  const tasks = [
    {
      title: 'Quadratic equations worksheet',
      subjectId: 'demo-maths',
      days: 0,
      time: '23:00',
      priority: 'HIGH',
      estimatedMinutes: 45,
      status: 'IN_PROGRESS',
      description:
        'Complete questions 1–12 on the quadratic equations worksheet. Show your working and check each answer by substitution.',
      notes: 'Focus on completing the square. Bring the worksheet to the next lesson.',
    },
    {
      title: 'Analyse the opening of Macbeth',
      subjectId: 'demo-english',
      days: 0,
      time: null,
      priority: 'MEDIUM',
      estimatedMinutes: 40,
      status: 'NOT_STARTED',
      description:
        'Write two paragraphs exploring how Shakespeare establishes the atmosphere in Act 1, Scene 1. Include quotations and explain their effects.',
      notes: '',
    },
    {
      title: 'Cell structure revision notes',
      subjectId: 'demo-biology',
      days: 0,
      time: null,
      priority: 'LOW',
      estimatedMinutes: 30,
      status: 'NOT_STARTED',
      description:
        'Create a revision page comparing plant and animal cells. Include labelled diagrams and the functions of each organelle.',
      notes: '',
    },
    {
      title: 'Causes of the First World War',
      subjectId: 'demo-history',
      days: 1,
      time: '09:00',
      priority: 'HIGH',
      estimatedMinutes: 60,
      status: 'NOT_STARTED',
      description:
        'Create a mind map of the long-term causes of the First World War and explain how they contributed to the conflict.',
      notes: 'Use the class notes and textbook chapter.',
    },
    {
      title: 'Trigonometry practice questions',
      subjectId: 'demo-maths',
      days: 2,
      time: null,
      priority: 'MEDIUM',
      estimatedMinutes: 35,
      status: 'NOT_STARTED',
      description:
        'Complete the right-angled triangle practice questions. Include a diagram for each problem.',
      notes: '',
    },
    {
      title: 'Prepare poetry comparison',
      subjectId: 'demo-english',
      days: 3,
      time: null,
      priority: 'MEDIUM',
      estimatedMinutes: 45,
      status: 'IN_PROGRESS',
      description:
        'Prepare a comparison of two poems, focusing on imagery, structure and the speakers’ perspectives.',
      notes: '',
    },
    {
      title: 'Enzymes experiment write-up',
      subjectId: 'demo-biology',
      days: 5,
      time: '10:00',
      priority: 'LOW',
      estimatedMinutes: 30,
      status: 'NOT_STARTED',
      description:
        'Write up the enzyme experiment with a method, results table, graph and evaluation.',
      notes: '',
    },
    {
      title: 'Complete algebra review',
      subjectId: 'demo-maths',
      days: -2,
      time: null,
      priority: 'HIGH',
      estimatedMinutes: 25,
      status: 'NOT_STARTED',
      description:
        'Finish the remaining algebra review questions and note any questions to revisit.',
      notes: '',
    },
    {
      title: 'Read chapter three',
      subjectId: 'demo-english',
      days: -1,
      time: null,
      priority: 'LOW',
      estimatedMinutes: 25,
      status: 'COMPLETED',
      description: 'Read chapter three and summarise the key events.',
      notes: '',
    },
    {
      title: 'Label the digestive system',
      subjectId: 'demo-biology',
      days: -1,
      time: null,
      priority: 'MEDIUM',
      estimatedMinutes: 20,
      status: 'COMPLETED',
      description: 'Complete the digestive system diagram.',
      notes: '',
    },
    {
      title: 'Source analysis practice',
      subjectId: 'demo-history',
      days: -2,
      time: null,
      priority: 'MEDIUM',
      estimatedMinutes: 30,
      status: 'COMPLETED',
      description: 'Analyse the reliability of the two provided sources.',
      notes: '',
    },
  ];
  for (const [i, task] of tasks.entries()) {
    const { days, time, ...rest } = task;
    const dueDate = now.plus({ days }).toISODate()!;
    await db.homework.upsert({
      where: { id: `demo-task-${i}` },
      create: {
        id: `demo-task-${i}`,
        ...rest,
        assignedDate: now.minus({ days: 7 }).toISODate()!,
        dueDate,
        dueTime: time,
        dueAt: dueInstant(dueDate, time, zone),
        completedAt: rest.status === 'COMPLETED' ? now.minus({ hours: 3 }).toJSDate() : null,
      },
      update: {},
    });
  }
  for (let weekday = 1; weekday <= 5; weekday++) {
    if (await db.timetableDay.findUnique({ where: { weekday } })) continue;
    const sequence = [
      'demo-maths',
      'demo-english',
      null,
      'demo-biology',
      'lunch',
      'demo-history',
      'demo-maths',
    ];
    const times = [
      ['08:45', '09:40'],
      ['09:40', '10:35'],
      ['10:35', '10:55'],
      ['10:55', '11:50'],
      ['11:50', '12:40'],
      ['12:40', '13:35'],
      ['13:35', '14:30'],
    ];
    await db.timetableDay.create({
      data: {
        id: `demo-day-${weekday}`,
        weekday,
        enabled: true,
        periods: {
          create: sequence.slice(0, weekday === 5 ? 6 : 7).map((subjectId, i) => ({
            name:
              subjectId === null
                ? 'Morning break'
                : subjectId === 'lunch'
                  ? 'Lunch'
                  : `Period ${i < 2 ? i + 1 : i === 3 ? 3 : i - 1}`,
            slotType: subjectId === null ? 'BREAK' : subjectId === 'lunch' ? 'LUNCH' : 'LESSON',
            startTime: times[i][0],
            endTime: times[i][1],
            subjectId: subjectId === 'lunch' ? null : subjectId,
            room:
              subjectId && subjectId !== 'lunch'
                ? ['204', '112', '', 'Lab 2', '', '108', '204'][i]
                : '',
            teacherName: '',
            label: '',
          })),
        },
      },
    });
  }
  if (!(await db.studySession.count()))
    for (let i = 0; i < Math.min(now.weekday, 5); i++) {
      const start = now.startOf('week').plus({ days: i, hours: 7 });
      const seconds = [1800, 2700, 1500, 3300, 2100][i];
      if (start.plus({ seconds }) > now) continue;
      await db.studySession.create({
        data: {
          id: randomUUID(),
          homeworkId: `demo-task-${i}`,
          subjectId: tasks[i].subjectId,
          startTime: start.toJSDate(),
          endTime: start.plus({ seconds }).toJSDate(),
          durationSeconds: seconds,
          type: 'COUNTDOWN',
        },
      });
    }
  console.log(`Optional demo data is ready (${today}). Existing records were preserved.`);
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/seed.ts'))
  seedDemo()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
