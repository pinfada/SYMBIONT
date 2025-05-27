import { v4 as uuidv4 } from 'uuid';

interface Invitation {
  code: string;
  donorId: string;
  receiverId?: string;
  symbolicLink: string; // motif ou couleur symbolique
  used: boolean;
  createdAt: number;
  usedAt?: number;
}

export class InvitationService {
  private invitations: Map<string, Invitation> = new Map();

  // Génère un code d'invitation unique et un motif/couleur symbolique
  generateInvitation(donorId: string): Invitation {
    const code = uuidv4().slice(0, 8).toUpperCase();
    const symbolicLink = this.generateSymbolicLink();
    const invitation: Invitation = {
      code,
      donorId,
      symbolicLink,
      used: false,
      createdAt: Date.now(),
    };
    this.invitations.set(code, invitation);
    return invitation;
  }

  // Valide et consomme un code d'invitation
  consumeInvitation(code: string, receiverId: string): Invitation | null {
    const invitation = this.invitations.get(code);
    if (!invitation || invitation.used) return null;
    invitation.used = true;
    invitation.receiverId = receiverId;
    invitation.usedAt = Date.now();
    this.invitations.set(code, invitation);
    return invitation;
  }

  // Vérifie la validité d'un code
  isValid(code: string): boolean {
    const invitation = this.invitations.get(code);
    return !!invitation && !invitation.used;
  }

  // Génère un motif/couleur symbolique (exemple simple)
  private generateSymbolicLink(): string {
    const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF8800', '#00FF88', '#8800FF'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Pour tests ou export
  getAllInvitations(): Invitation[] {
    return Array.from(this.invitations.values());
  }
} 