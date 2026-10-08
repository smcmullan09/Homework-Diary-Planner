'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowRight, ShieldCheck } from 'lucide-react';
import { Field } from './ui';
export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark">
            <BookOpen />
          </span>
          <span>
            <strong>SMM</strong>
            <small>Homework Planner</small>
          </span>
        </div>
        <div>
          <span className="eyebrow">YOUR SPACE TO MAKE PROGRESS</span>
          <h1>
            A little structure.
            <br />A clearer mind.
          </h1>
          <p>
            Your homework, timetable and study sessions.
            <br />
            Thoughtfully organised. All in one place.
          </p>
          <div className="login-art" aria-hidden="true">
            <div className="art-card">
              <span>THE PLAN FOR TODAY</span>
              <p>Make room for a little focus.</p>
              <div>✓ &nbsp; Organise your homework</div>
              <div>✓ &nbsp; Take it one task at a time</div>
              <div>○ &nbsp; Enjoy your time after school</div>
            </div>
            <div className="art-circle">
              You’ve
              <br />
              got this.
            </div>
          </div>
        </div>
        <small>Built around your day.</small>
      </section>
      <section className="login-form-wrap">
        <div className="login-form">
          <span className="eyebrow">SMM HOMEWORK PLANNER</span>
          <h2>{configured ? 'Welcome back.' : 'Your planner starts here.'}</h2>
          <p className="muted">
            {configured
              ? 'Sign in to pick up where you left off.'
              : 'Create your private owner account from the project terminal.'}
          </p>
          {configured ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                const f = new FormData(e.currentTarget);
                try {
                  const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: f.get('email'), password: f.get('password') }),
                  });
                  const body = await response.json();
                  if (!response.ok) throw new Error(body.error);
                  router.push('/');
                  router.refresh();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Email address">
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Password">
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Your password"
                />
              </Field>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="btn primary full" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
                <ArrowRight size={17} />
              </button>
            </form>
          ) : (
            <div className="setup-instructions">
              <code>npm run db:owner</code>
              <p>
                This securely creates the only account for this planner. Then refresh this page to
                sign in.
              </p>
              <button className="btn primary" onClick={() => router.refresh()}>
                I’ve created my account <ArrowRight size={16} />
              </button>
            </div>
          )}
          <div className="privacy-note">
            <ShieldCheck size={16} />A private planner. Just for you.
          </div>
        </div>
      </section>
    </main>
  );
}
