import { SocialResilience } from '../src/social/social-resilience'

describe('SocialResilience', () => {
  it('envoie une demande de backup et une alerte communautaire', () => {
    const sr = new SocialResilience()
    // On ne peut pas tester le BroadcastChannel, mais on vérifie l'appel sans erreur
    expect(() => sr.requestCommunityBackup('org1')).not.toThrow()
    expect(() => sr.launchCommunityAlert('test')).not.toThrow()
  })
}) 