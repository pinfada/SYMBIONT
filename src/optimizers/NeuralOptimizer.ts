/**
 * NeuralOptimizer - Optimisation du réseau neuronal
 * - Pruning (élagage des connexions faibles)
 * - Quantification des poids
 * - Monitoring de la charge
 */
import { NeuralMesh } from '../core/neural/NeuralMesh'

export class NeuralOptimizer {
  private mesh: NeuralMesh
  constructor(mesh: NeuralMesh) {
    this.mesh = mesh
  }

  /**
   * Prune les connexions dont le poids est inférieur à un seuil
   */
  pruneConnections(threshold = 0.05) {
    this.mesh.removeConnections((conn) => Math.abs(conn.weight) < threshold)
  }

  /**
   * Quantifie les poids des connexions (arrondi à n décimales)
   */
  quantizeWeights(decimals = 2) {
    this.mesh.forEachConnection((conn) => {
      conn.weight = parseFloat(conn.weight.toFixed(decimals))
    })
  }

  /**
   * Retourne la charge totale du réseau (somme des poids absolus)
   */
  getNetworkLoad(): number {
    let total = 0
    this.mesh.forEachConnection((conn) => {
      total += Math.abs(conn.weight)
    })
    return total
  }
} 