// Squelette minimal pour lever les erreurs d'import
export class SymbiontStorage {
  async initialize(): Promise<void> {}
  async getOrganism(): Promise<any> { return null; }
  async saveOrganism(org: any): Promise<void> {}
  async getBehavior(url: string): Promise<any> { return null; }
  async saveBehavior(behavior: any): Promise<void> {}
  async addMutation(mutation: any): Promise<void> {}
  async getRecentMutations(count: number): Promise<any[]> { return []; }

  static getInstance(): SymbiontStorage {
    if (!(window as any).__symbiontStorage) {
      (window as any).__symbiontStorage = new SymbiontStorage();
    }
    return (window as any).__symbiontStorage;
  }
  async getBehaviorPatterns(): Promise<any[]> { return []; }
  async getRecentActivity(ms: number): Promise<any[]> { return []; }
  async getSetting(key: string): Promise<any> { return null; }
  async setSetting(key: string, value: any): Promise<void> {}
}
export default SymbiontStorage; 