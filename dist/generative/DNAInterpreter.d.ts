import { ShaderParameters } from '../types';
export declare class DNAInterpreter {
    private dna;
    private cachedParams;
    private mutationAccumulator;
    constructor(dna: string);
    /**
     * Interprète le DNA en paramètres shaders déterministes
     */
    interpret(dna?: string): ShaderParameters;
    /**
     * Hash FNV-1a pour distribution uniforme
     */
    private hashDNA;
    /**
     * Retourne les paramètres courants, avec mutations accumulées
     */
    getCurrentParameters(): ShaderParameters;
    /**
     * Fait évoluer le DNA (mutation progressive)
     */
    evolveDNA(factor: number): void;
    /**
     * Mutation aléatoire mais contrôlée du DNA
     */
    private mutateDNA;
}
//# sourceMappingURL=DNAInterpreter.d.ts.map