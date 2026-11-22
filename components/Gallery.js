'use client';
import { useState, useEffect } from 'react';

export default function Gallery({ images, teaser = false }) {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <div className={`gallery ${teaser ? 'teaser' : ''}`}>
        {images.map((img) => (
          <button key={img.src} onClick={() => setOpen(img)} aria-label={`View ${img.alt}`}>
            <img src={img.src} alt={img.alt} loading="lazy" />
          </button>
        ))}
      </div>
      {open && (
        <div className="lightbox" onClick={() => setOpen(null)} role="dialog" aria-label={open.alt}>
          <img src={open.src} alt={open.alt} />
        </div>
      )}
    </>
  );
}
