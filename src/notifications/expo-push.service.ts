import { Injectable, Logger } from '@nestjs/common';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 90;

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

/**
 * Minimal Expo push client (no SDK) — best-effort fire-and-forget.
 * Invalid/expired tokens are surfaced so the caller can prune them.
 */
@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  async send(messages: ExpoPushMessage[]): Promise<{ invalidTokens: string[] }> {
    const invalidTokens: string[] = [];
    if (!messages.length) return { invalidTokens };

    for (let i = 0; i < messages.length; i += CHUNK) {
      const batch = messages.slice(i, i + CHUNK);
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch.map((m) => ({ sound: 'default', ...m }))),
        });
        const json = (await res.json()) as {
          data?: { status: string; details?: { error?: string } }[];
        };
        json.data?.forEach((receipt, idx) => {
          if (
            receipt.status === 'error' &&
            receipt.details?.error === 'DeviceNotRegistered'
          ) {
            invalidTokens.push(batch[idx].to);
          }
        });
      } catch (err) {
        this.logger.warn(
          `Expo push batch failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return { invalidTokens };
  }
}
