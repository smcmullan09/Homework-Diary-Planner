import 'dotenv/config';
import { db } from '../src/server/db';
async function main() {
  await db.$transaction(async (tx) => {
    await tx.studySession.deleteMany({
      where: {
        OR: [{ homeworkId: { startsWith: 'demo-' } }, { subjectId: { startsWith: 'demo-' } }],
      },
    });
    await tx.homework.deleteMany({ where: { id: { startsWith: 'demo-' } } });
    // Timetable edits regenerate IDs, so detach demo subjects first and retain edited schedules.
    await tx.timetablePeriod.updateMany({
      where: { subjectId: { startsWith: 'demo-' } },
      data: { subjectId: null },
    });
    await tx.timetableDay.deleteMany({ where: { id: { startsWith: 'demo-' } } });
    const used = await tx.homework.findMany({ select: { subjectId: true } });
    await tx.subject.deleteMany({
      where: { id: { startsWith: 'demo-', notIn: used.map((h) => h.subjectId) } },
    });
  });
  console.log(
    'Demo records removed. Subjects used by your own homework and edited timetable days were preserved.',
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
