export interface UserIdentity {
    id: string;
    createdAt: number;
    lastActive: number;
    invitationCode: string;
    generation: number;
}
export declare class UserIdentityService {
    private static readonly USER_ID_KEY;
    private static readonly USER_IDENTITY_KEY;
    /**
     * Obtient ou crée un identifiant utilisateur unique
     */
    static getUserId(): Promise<string>;
    /**
     * Obtient l'identité complète de l'utilisateur
     */
    static getUserIdentity(): Promise<UserIdentity>;
    /**
     * Crée une nouvelle identité utilisateur
     */
    private static createUserIdentity;
    /**
     * Met à jour la dernière activité de l'utilisateur
     */
    static updateLastActive(userId: string): Promise<void>;
    /**
     * Génère un code d'invitation unique et mémorable (cryptographically secure)
     */
    private static generateInvitationCode;
    /**
     * Régénère le code d'invitation
     */
    static regenerateInvitationCode(): Promise<string>;
    /**
     * Incrémente la génération de l'utilisateur
     */
    static incrementGeneration(): Promise<number>;
    /**
     * Obtient les statistiques de l'utilisateur
     */
    static getUserStats(): Promise<{
        daysSinceCreation: number;
        daysActive: number;
        generation: number;
        invitationCode: string;
    }>;
    /**
     * Valide un code d'invitation
     */
    static validateInvitationCode(code: string): boolean;
    /**
     * Réinitialise l'identité utilisateur (pour debug/reset)
     */
    static resetUserIdentity(): Promise<UserIdentity>;
    /**
     * Exporte l'identité pour sauvegarde/migration
     */
    static exportIdentity(): Promise<string>;
    /**
     * Importe une identité depuis une sauvegarde
     */
    static importIdentity(identityData: string): Promise<void>;
}
//# sourceMappingURL=UserIdentityService.d.ts.map