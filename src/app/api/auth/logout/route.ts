import { logout } from '@/server/auth';
import { endpoint } from '@/server/http';
export const POST = endpoint(
  async () => {
    await logout();
    return { ok: true };
  },
  { mutation: true },
);
