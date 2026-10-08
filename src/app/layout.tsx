import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'SMM Homework Planner',
  description: 'A little structure. A clearer mind. Your personal homework and study planner.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('smm-theme')||'light';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
