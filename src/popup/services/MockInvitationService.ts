import { Invitation, InvitationStatus } from '../../shared/types/invitation';

const mockUserCode = 'ABC123';
const mockInviter: Invitation = {
  code: 'ROOT42',
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  consumed: true,
  consumedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
  inviter: undefined,
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
    invitee: undefined,
  },
];

const mockHistory: Array<Invitation & { status: InvitationStatus; type: 'envoyée' | 'reçue' }> = [
  { ...mockInviter, status: 'valid', type: 'reçue' },
  { ...mockInvitees[0], status: 'consumed', type: 'envoyée' },
  { ...mockInvitees[1], status: 'valid', type: 'envoyée' },
];

export const MockInvitationService = {
  getUserCode: async () => mockUserCode,
  getInviter: async () => mockInviter,
  getInvitees: async () => mockInvitees,
  getHistory: async () => mockHistory,
}; 