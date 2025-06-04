import { Invitation, InvitationStatus } from '../../shared/types/invitation';

const mockUserCode = 'ABC123';
const mockInviter: Invitation = {
  code: 'ROOT42',
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  consumed: true,
  consumedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
  invitee: 'ABC123',
};
const mockInvitees: Invitation[] = [
  {
    code: 'DEF456',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    consumed: true,
    consumedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    inviter: 'ABC123',
    invitee: 'DEF456',
  },
  {
    code: 'GHI789',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    consumed: false,
    inviter: 'ABC123',
  },
];

const mockHistory: Array<Invitation & { status: InvitationStatus; type: 'envoyée' | 'reçue' }> = [
  { ...mockInviter, status: 'valid', type: 'reçue' },
  { ...mockInvitees[0], status: 'consumed', type: 'envoyée' },
  { ...mockInvitees[1], status: 'valid', type: 'envoyée' },
];

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