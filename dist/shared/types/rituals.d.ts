export interface SharedMutationRequest {
    initiatorId: string;
    traits: Record<string, number>;
}
export interface SharedMutationCode {
    code: string;
    initiatorId: string;
    expiresAt: number;
}
export interface AcceptSharedMutation {
    code: string;
    receiverId: string;
    traits: Record<string, number>;
}
export interface SharedMutationResult {
    initiatorId: string;
    receiverId: string;
    mergedTraits: Record<string, number>;
    timestamp: number;
}
export interface CollectiveWakeRequest {
    userId: string;
}
export interface CollectiveWakeResult {
    participants: string[];
    triggeredAt: number;
}
