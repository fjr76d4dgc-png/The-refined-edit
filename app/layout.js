import { Cormorant_Garamond, Jost } from 'next/font/google';
import './globals.css';

const display = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-display' });
const sans = Jost({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-sans' });

export const metadata = {
  title: { default: 'The Refined Edit — Lash Lifts & Brow Laminations, Birmingham', template: '%s · The Refined Edit' },
  description: 'Korean & LVL lash lifts, brow lamination, halal brows and bespoke tints in Birmingham B19. ABT insured and accredited. Book online.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
