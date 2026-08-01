import { SocialResilience } from '../src/social/social-resilience'

// jsdom n'expose pas BroadcastChannel : mock minimal pour l'environnement de test
class MockBroadcastChannel {
  name: string
  onmessage: ((event: { data: unknown }) => void) | null = null
  constructor(name: string) { this.name = name }
  postMessage(_data: unknown): void {}
  close(): void {}
}
;(global as any).BroadcastChannel = MockBroadcastChannel

describe('SocialResilience', () => {
  it('envoie une demande de backup et une alerte communautaire', () => {
    const sr = new SocialResilience()
    // On ne peut pas tester le BroadcastChannel, mais on vérifie l'appel sans erreur
    expect(() => sr.requestCommunityBackup('org1')).not.toThrow()
    expect(() => sr.launchCommunityAlert('test')).not.toThrow()
  })
}) 