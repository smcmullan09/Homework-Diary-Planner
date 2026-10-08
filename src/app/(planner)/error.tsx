'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h2>We couldn’t load your planner.</h2>
      <p>Your saved work is safe. Please try again.</p>
      <button className="btn primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
