import { getApiUrl } from './config';

type CallSignalHandler = (signal: {
  type: string;
  sender_id: number;
  sender_name?: string;
  payload?: any;
}) => void;

const handlers: Set<CallSignalHandler> = new Set();
let pollInterval: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (pollInterval) return;

  pollInterval = setInterval(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    try {
      const res = await fetch(getApiUrl('/api/messages/call-signals/'), {
        headers: { Authorization: `Token ${token}` },
      });

      if (res.ok) {
        const signals = await res.json();
        for (const signal of signals) {
          for (const handler of handlers) {
            handler(signal);
          }
        }
      }
    } catch {
      // Silently ignore polling errors
    }
  }, 2000);
}

export function registerCallSignalHandler(handler: CallSignalHandler): () => void {
  handlers.add(handler);
  startPolling();

  return () => {
    handlers.delete(handler);
    if (handlers.size === 0 && pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };
}

export async function sendCallSignal(
  recipientId: number,
  type: string,
  payload: Record<string, any>
): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return;

  try {
    await fetch(getApiUrl('/api/messages/call-signals/send/'), {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: recipientId,
        type,
        payload,
      }),
    });
  } catch {
    // Silently ignore send errors
  }
}
