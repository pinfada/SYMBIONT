// Monitoring attention utilisateur

export class AttentionMonitor {
  on(event: string, handler: (state: any) => void): void {}
  resume(): void {}
  pause(): void {}
  stop(): void {}
  getSessionSummary(): any { return { focusPeriods: [] }; }
}