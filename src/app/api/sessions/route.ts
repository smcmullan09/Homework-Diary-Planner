import { db } from '@/server/db';
import { endpoint, jsonBody, HttpError } from '@/server/http';
import { sessionSchema } from '@/lib/validation';
export const POST = endpoint(
  async (request) => {
    const session = sessionSchema.parse(await jsonBody(request));
    if (Date.parse(session.endTime) > Date.now() + 60000)
      throw new HttpError(400, 'Session cannot end in the future.');
    if (session.homeworkId) {
      const task = await db.homework.findUnique({ where: { id: session.homeworkId } });
      if (task) session.subjectId = task.subjectId;
      else session.homeworkId = null;
    }
    if (
      session.subjectId &&
      !(await db.subject.findUnique({ where: { id: session.subjectId }, select: { id: true } }))
    )
      session.subjectId = null;
    return db.studySession.upsert({ where: { id: session.id }, create: session, update: {} });
  },
  { mutation: true },
);
