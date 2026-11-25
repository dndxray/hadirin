import { useCallback, useEffect, useState } from 'react';

import { subscribeLabs } from '@/services/lab-service';
import type { Lab } from '@/types/lab';

export type LabsStatus = 'loading' | 'ready' | 'offline' | 'denied' | 'error';

// Kalau data belum terkonfirmasi server selama ini, dianggap koneksi bermasalah.
const SERVER_TIMEOUT_MS = 8000;

export function useLabs() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [status, setStatus] = useState<LabsStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStatus('loading');
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
          setStatus('ready');
        } else {
          startTimer();
        }
      },
      onError: (reason) => {
        clearTimer();
        setStatus(reason === 'network' ? 'offline' : reason === 'denied' ? 'denied' : 'error');
      },
    });

    return () => {
      clearTimer();
      unsubscribe();
    };
  }, [attempt]);

  // Coba muat ulang setelah gagal.
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { labs, status, retry };
}
