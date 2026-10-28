import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Sophia v2.0 | Omnix Global AI Lead Gen CRM',
  description: 'Autonomous AI Lead Gen Agent & Executive CRM by Omnix Global',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
