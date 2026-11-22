'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="header">
      <div className="wrap header-inner">
        <Link href="/" className="brand" onClick={close}>
          <img src="/brand/monogram.png" alt="" />
          <span>The Refined Edit</span>
        </Link>
        <button className="menu-btn" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span /><span />
        </button>
        <nav className={`nav ${open ? 'open' : ''}`}>
          <Link href="/treatments" onClick={close}>Treatments</Link>
          <Link href="/results" onClick={close}>Results</Link>
          <Link href="/policy" onClick={close}>Policy</Link>
          <Link href="/book" className="btn small" onClick={close}>Book now</Link>
        </nav>
      </div>
    </header>
  );
}
