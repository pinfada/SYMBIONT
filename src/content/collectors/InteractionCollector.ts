// Collecteur d'interactions

export class InteractionCollector {
  on(event: string, handler: (interaction: any) => void): void {}
  start(options?: any): void {}
  stop(): void {}
}