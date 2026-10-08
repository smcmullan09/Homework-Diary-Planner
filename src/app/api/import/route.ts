import { endpoint, jsonBody } from '@/server/http';
import { restoreBackup } from '@/server/backup';
export const POST = endpoint(async (request) => restoreBackup(await jsonBody(request)), {
  mutation: true,
});
