/**
 * StorageOptimizer - Optimisation du stockage local
 * - Compression des données
 * - Nettoyage des entrées obsolètes
 * - Monitoring de l'espace utilisé
 */
export declare class StorageOptimizer {
    constructor();
    /**
     * Compresse une chaîne de caractères (exemple basique)
     */
    compress(data: string): string;
    /**
     * Décompresse une chaîne compressée
     */
    decompress(data: string): string;
    /**
     * Nettoie les entrées obsolètes du localStorage
     */
    cleanupObsoleteEntries(prefix?: string, maxAgeMs?: number): void;
    /**
     * Retourne l'espace utilisé par le localStorage (approximation)
     */
    getUsedSpace(): number;
}
//# sourceMappingURL=StorageOptimizer.d.ts.map