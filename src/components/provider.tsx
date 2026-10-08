'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AppData, Homework } from '@/lib/types';
interface Context {
  data: AppData;
  now: Date;
  refresh: () => Promise<void>;
  mutate: <T = unknown>(
    path: string,
    method: string,
    body?: unknown,
    message?: string,
  ) => Promise<T>;
  toast: (message: string, error?: boolean) => void;
  complete: (task: Homework) => Promise<void>;
}
const AppContext = createContext<Context | null>(null);
export function applyTheme(theme: string) {
  localStorage.setItem('smm-theme', theme);
  document.documentElement.dataset.theme =
    theme === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
}
export function AppProvider({
  initial,
  initialNow,
  children,
}: {
  initial: AppData;
  initialNow: string;
  children: React.ReactNode;
}) {
  const [data, setData] = useState(initial);
  const [now, setNow] = useState(() => new Date(initialNow));
  const [notice, setNotice] = useState<{ message: string; error: boolean; id: number } | null>(
    null,
  );
  const toast = useCallback(
    (message: string, error = false) => setNotice({ message, error, id: Date.now() }),
    [],
  );
  useEffect(() => {
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(clock);
  }, []);
  useEffect(() => {
    applyTheme(data.settings.theme);
    const media = matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(data.settings.theme);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [data.settings.theme]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const refresh = useCallback(async () => {
    const response = await fetch('/api/data');
    if (response.status === 401) {
      location.href = '/login';
      return;
    }
    if (!response.ok) throw new Error('Could not refresh your planner.');
    setData(await response.json());
  }, []);
  const mutate = useCallback(
    async <T,>(path: string, method: string, body?: unknown, message?: string): Promise<T> => {
      try {
        const response = await fetch(`/api/${path}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to save. Please try again.');
        await refresh();
        if (message) toast(message);
        return result as T;
      } catch (e) {
        toast((e as Error).message, true);
        throw e;
      }
    },
    [refresh, toast],
  );
  const complete = useCallback(
    async (task: Homework) => {
      await mutate(
        'homework',
        'PUT',
        { ...task, status: task.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED' },
        task.status === 'COMPLETED' ? 'Homework reopened.' : 'Homework completed. Nicely done!',
      );
    },
    [mutate],
  );
  return (
    <AppContext.Provider value={{ data, now, refresh, mutate, toast, complete }}>
      {children}
      {notice && (
        <div
          className={`toast ${notice.error ? 'error' : ''}`}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.message}
          <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('Missing app provider');
  return context;
}
