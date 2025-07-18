import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Programare Interviu',
  description: 'Programează-ți interviul online sau în persoană',
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
