/**
 * StorageOptimizer - Optimisation du stockage local
 * - Compression des données
 * - Nettoyage des entrées obsolètes
 * - Monitoring de l'espace utilisé
 */
export class StorageOptimizer {
  constructor() {}

  /**
   * Compresse une chaîne de caractères (exemple basique)
   */
  compress(data: string): string {
    return btoa(unescape(encodeURIComponent(data)))
  }

  /**
   * Décompresse une chaîne compressée
   */
  decompress(data: string): string {
    return decodeURIComponent(escape(atob(data)))
  }

  /**
   * Nettoie les entrées obsolètes du localStorage
   */
  cleanupObsoleteEntries(prefix = 'organism_', maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    const now = Date.now()
    for (const key in localStorage) {
      if (key.startsWith(prefix)) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}')
          if (item.createdAt && now - item.createdAt > maxAgeMs) {
            localStorage.removeItem(key)
          }
        } catch {}
      }
    }
  }

  /**
   * Retourne l'espace utilisé par le localStorage (approximation)
   */
  getUsedSpace(): number {
    let total = 0
    for (const key in localStorage) {
      const value = localStorage.getItem(key)
      if (value) total += key.length + value.length
    }
    return total
  }
} 