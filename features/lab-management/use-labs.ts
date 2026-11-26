import { useCallback, useEffect, useState } from 'react';

import type { Lab } from '@/types/sprint-three';
import { firebaseErrorMessage } from '@/utils/firebase-error';

import { subscribeLabs } from './lab-service';

export type LabsStatus = 'loading' | 'ready' | 'offline' | 'error';

// Kalau data belum terkonfirmasi server selama ini, dianggap koneksi bermasalah.
const SERVER_TIMEOUT_MS = 8000;

function isUnavailable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String(error.code).includes('unavailable')
  );
}

export function useLabs() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [status, setStatus] = useState<LabsStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const startTimer = () => {
      if (!timer) timer = setTimeout(() => setStatus('offline'), SERVER_TIMEOUT_MS);
    };

    startTimer();
    const unsubscribe = subscribeLabs({
      onData: (items, fromServer) => {
        setLabs(items);
        if (fromServer) {
          clearTimer();
          setErrorMessage(null);
          setStatus('ready');
        } else {
          startTimer();
        }
      },
      onError: (error) => {
        clearTimer();
        setErrorMessage(firebaseErrorMessage(error));
        setStatus(isUnavailable(error) ? 'offline' : 'error');
      },
    });

    return () => {
      clearTimer();
      unsubscribe();
    };
  }, [attempt]);

  // Coba muat ulang setelah gagal.
  const retry = useCallback(() => {
    setStatus('loading');
    setErrorMessage(null);
    setAttempt((n) => n + 1);
  }, []);

  return { labs, status, errorMessage, retry };
}
