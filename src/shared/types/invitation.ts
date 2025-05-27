// Types centralisés pour la gestion des invitations

export interface Invitation {
  code: string;
  createdAt: number;
  consumed: boolean;
  consumedAt?: number;
  inviter?: string;
  invitee?: string;
}

export type InvitationStatus = 'valid' | 'invalid' | 'consumed' | 'expired';

export interface InvitationPayload {
  code: string;
}

export interface InvitationResult {
  code: string;
  status: InvitationStatus;
  invitation?: Invitation;
} 