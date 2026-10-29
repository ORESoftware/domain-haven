import { IncomingMessage } from 'http';

export interface TestRequestOptions {
  json?: boolean;
  qs?: Record<string, unknown>;
  timeoutMs?: number;
}

export function get(
  url: string,
  options: TestRequestOptions,
  callback: (error: Error | null, response: IncomingMessage | null, body: any) => void
): void;
