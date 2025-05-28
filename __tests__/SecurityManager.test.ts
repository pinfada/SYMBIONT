import { SecurityManager } from '../src/background/SecurityManager'

describe('SecurityManager', () => {
  const security = new SecurityManager()

  it('chiffre et déchiffre correctement les données', () => {
    const data = { foo: 'bar', n: 42 }
    const encrypted = security.encryptSensitiveData(data)
    expect(typeof encrypted).toBe('string')
    const decrypted = security.decryptSensitiveData(encrypted)
    expect(decrypted).toEqual(data)
  })

  it('anonymise les données comportementales', () => {
    const pattern = { url: 'https://secret.com', interactions: 5, timeSpent: 10, scrollDepth: 0.8, timestamp: Date.now() }
    const anonymized = security.anonymizeForSharing(pattern)
    expect(anonymized.url).toBe('anonymized')
    expect(anonymized.interactions).toBe(pattern.interactions)
  })
}) 