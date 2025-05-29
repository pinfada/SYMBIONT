import { SocialNetworkManager } from '../src/social/SocialNetworkManager'
import { OrganismMemoryBank } from '../src/background/OrganismMemoryBank'
import { SecurityManager } from '../src/background/SecurityManager'

describe('SocialNetworkManager', () => {
  const security = new SecurityManager()
  const memory = new OrganismMemoryBank(security)
  const social = new SocialNetworkManager(memory, security)

  it('génère une invitation avec contexte anonymisé', async () => {
    const context = {
      websiteCategory: 'news',
      behaviorPattern: { url: 'https://secret.com', interactions: 3, timeSpent: 5, scrollDepth: 0.5, timestamp: Date.now() },
      timeOfDay: 'morning',
      inferredEmotion: 'curious',
      creatorOrganismId: 'org1'
    }
    const code = await social.generateInvitation('org1', context)
    // L'invitation est stockée en mémoire interne
    const invitation = (social as any).invitations.find((i: any) => i.code === code)
    expect(invitation).toBeDefined()
    expect(invitation.context.behaviorPattern.url).toBe('anonymized')
  })
}) 