/**
 * SensoryNetwork - Réseau sensoriel pour organisme artificiel
 * - Gère les capteurs, la normalisation, le bruit, l'adaptation
 * - Prêt à être branché sur OrganismCore/NeuralMesh
 */

export interface Sensor {
  id: string;
  type: 'vision' | 'audition' | 'touch' | 'taste' | 'smell' | 'custom';
  min: number;
  max: number;
  noise: number; // écart-type du bruit gaussien
  value: number;
}

export class SensoryNetwork {
  private sensors: Map<string, Sensor> = new Map();

  /**
   * Ajoute un capteur sensoriel
   */
  public addSensor(id: string, type: Sensor['type'], min = 0, max = 1, noise = 0.01): void {
    if (this.sensors.has(id)) throw new Error(`Sensor ${id} already exists`);
    this.sensors.set(id, { id, type, min, max, noise, value: 0 });
  }

  /**
   * Simule une perception (avec bruit et normalisation)
   */
  public sense(id: string, rawValue: number): number {
    const sensor = this.sensors.get(id);
    if (!sensor) throw new Error('Sensor not found');
    // Normalisation
    let v = (rawValue - sensor.min) / (sensor.max - sensor.min);
    // Ajout de bruit gaussien
    v += this.gaussianNoise(0, sensor.noise);
    v = Math.max(0, Math.min(1, v));
    sensor.value = v;
    return v;
  }

  /**
   * Récupère les valeurs normalisées de tous les capteurs
   */
  public getInputs(): Record<string, number> {
    const inputs: Record<string, number> = {};
    for (const [id, sensor] of this.sensors.entries()) {
      inputs[id] = sensor.value;
    }
    return inputs;
  }

  /**
   * Adapte dynamiquement la sensibilité d'un capteur
   */
  public adapt(id: string, newMin: number, newMax: number, newNoise?: number): void {
    const sensor = this.sensors.get(id);
    if (!sensor) throw new Error('Sensor not found');
    sensor.min = newMin;
    sensor.max = newMax;
    if (newNoise !== undefined) sensor.noise = newNoise;
  }

  /**
   * Génère un bruit gaussien (Box-Muller)
   */
  private gaussianNoise(mu: number, sigma: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mu + sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Export JSON pour debug/visualisation
   */
  public toJSON() {
    return Array.from(this.sensors.values());
  }
} 