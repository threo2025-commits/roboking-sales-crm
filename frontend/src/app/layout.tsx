import './globals.css';
import type { Metadata } from 'next';
import type { Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'RoboKing Sales Platform CRM',
  description: 'RoboKing Sales Platform CRM at mint.roboking.in'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
