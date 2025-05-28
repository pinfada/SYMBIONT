// Tracker de scroll

import type { ScrollPattern } from '../index';

export class ScrollTracker {
  on(event: string, handler: (data: any) => void): void {}
  detectPattern(): ScrollPattern { return 'unknown'; }
  stop(): void {}
}