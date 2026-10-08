import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="empty">
      <h1>That page isn’t here.</h1>
      <Link className="btn primary" href="/">
        Back to your planner
      </Link>
    </main>
  );
}
