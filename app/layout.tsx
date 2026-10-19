import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'ChronoSync Studio — Constraint-Driven Timetable Studio',
  description: 'Industrial-grade multi-dimensional Class Timetable Management and Collision-Resolution Studio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-obsidian-950 text-zinc-100 antialiased selection:bg-cyber-indigo selection:text-white">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#0d0e12',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f4f4f5',
            },
          }}
        />
      </body>
    </html>
  );
}
