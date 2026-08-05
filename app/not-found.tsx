import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container" style={{ padding: '140px 20px', textAlign: 'center' }}>
      <p className="kicker">404</p>
      <h1 style={{ fontSize: 40, margin: '12px 0 10px' }}>Off the shelf</h1>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 26px' }}>
        That product is not on the Brampton menu.
      </p>
      <Link
        href="/menu/brampton"
        style={{
          display: 'inline-block',
          background: 'var(--accent)',
          color: '#04150E',
          borderRadius: 999,
          padding: '13px 26px',
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        Back to the menu
      </Link>
    </main>
  );
}
