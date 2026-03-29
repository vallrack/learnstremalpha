import ChallengeClient from './ChallengeClient';

// Configuración de segmento para Vercel (Hobby plan soporta hasta 60s)
export const maxDuration = 60;

export default function ChallengePage() {
  return <ChallengeClient />;
}
