import { SecureLogger } from '@shared/utils/secureLogger';
// ml/behavioral-predictor.ts
// Prédiction comportementale par apprentissage automatique (Phase 4)

export class BehavioralPredictor {
  private history: { features: any, label: any }[] = []
  private model: any = null // Simulation d'un modèle ML

  train(features: any, label: any) {
    this.history.push({ features, label })
    // Simulation : le "modèle" est la moyenne des labels pour chaque feature
    this.model = this.buildModel()
    SecureLogger.info('[ML] Entraînement sur un nouvel exemple')
  }

  predict(features: any): any {
    if (!this.model) return null
    // Simulation : retourne la prédiction la plus fréquente pour des features similaires
    const key = JSON.stringify(features)
    const pred = this.model[key] || null
    SecureLogger.info('[ML] Prédiction pour', features, '=>', pred)
    return pred
  }

  evaluate(): number {
    // Simulation : précision = % de labels retrouvés dans l'historique
    if (!this.model) return 0
    let correct = 0
    for (const ex of this.history) {
      const key = JSON.stringify(ex.features)
      if (this.model[key] === ex.label) correct++
    }
    const accuracy = correct / (this.history.length || 1)
    SecureLogger.info(`[ML] Précision du modèle : ${(accuracy * 100).toFixed(1)}%`)
    return accuracy
  }

  private buildModel() {
    // Simulation : dictionnaire feature->label le plus fréquent
    const counts: Record<string, Record<string, number>> = {}
    for (const ex of this.history) {
      const key = JSON.stringify(ex.features)
      if (!counts[key]) counts[key] = {}
      counts[key][ex.label] = (counts[key][ex.label] || 0) + 1
    }
    const model: Record<string, string> = {}
    for (const key in counts) {
      model[key] = Object.entries(counts[key]).sort((a, b) => b[1] - a[1])[0][0]
    }
    return model
  }
} 