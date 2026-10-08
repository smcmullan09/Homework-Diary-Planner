import { redirect } from 'next/navigation';
import { ownerSession } from '@/server/auth';
import { db } from '@/server/db';
import { LoginForm } from '@/components/login';
export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  if (await ownerSession()) redirect('/');
  const configured = !!(await db.owner.findUnique({
    where: { id: 'owner' },
    select: { id: true },
  }));
  return <LoginForm configured={configured} />;
}
