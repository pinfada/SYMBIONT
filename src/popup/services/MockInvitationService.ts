import { Invitation, InvitationStatus } from '../../shared/types/invitation';

// Mode initial - pas de connexions existantes
const mockUserCode = crypto.randomUUID().substring(0, 6).toUpperCase();
const mockInviter: Invitation | null = null; // Pas d'inviteur initial
const mockInvitees: Invitation[] = []; // Pas d'invités initial

const mockHistory: Array<Invitation & { status: InvitationStatus; type: 'envoyée' | 'reçue' }> = []; // Historique vide

/*
const mockInvitations: Invitation[] = [
  {
    code: 'ABC123',
    createdAt: Date.now() - 86400000, // 1 day ago
    consumed: true,
    consumedAt: Date.now() - 80000000,
    invitee: 'user456'
  },
  {
    code: 'DEF456',
    createdAt: Date.now() - 7200000, // 2 hours ago
    consumed: false,
    inviter: 'user123'
  },
  {
    code: 'GHI789',
    createdAt: Date.now() - 3600000, // 1 hour ago
    consumed: false,
    inviter: 'user123'
  }
];
*/

export const MockInvitationService = {
  getUserCode: async () => mockUserCode,
  getInviter: async () => mockInviter,
  getInvitees: async () => mockInvitees,
  getHistory: async () => mockHistory,
}; 