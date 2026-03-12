
import type {Metadata} from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { TranslationProvider } from '@/lib/i18n/use-translation';

export const metadata: Metadata = {
  title: 'LearnStream - Academia Digital Moderna',
  description: 'Crea y consume cursos interactivos con asistencia de IA.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <TranslationProvider>
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
        </TranslationProvider>
      </body>
    </html>
  );
}
