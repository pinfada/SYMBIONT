import { SymbiontStorage } from '../../core/storage/SymbiontStorage';
import { SecureRandom } from '../../shared/utils/secureRandom';
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
  private storage: SymbiontStorage;

  constructor(storage: SymbiontStorage) {
    this.storage = storage;
  }

  // Génère un code d'invitation unique et un motif/couleur symbolique
  async generateInvitation(donorId: string): Promise<Invitation> {
    const code = uuidv4().slice(0, 8).toUpperCase();
    const symbolicLink = this.generateSymbolicLink();
    const invitation: Invitation = {
      code,
      donorId,
      symbolicLink,
      used: false,
      createdAt: Date.now(),
    };
    await this.storage.addInvitation(invitation);
    return invitation;
  }

  // Valide et consomme un code d'invitation
  async consumeInvitation(code: string, receiverId: string): Promise<Invitation | null> {
    const invitation = await this.storage.getInvitation(code);
    if (!invitation || invitation.used) return null;
    invitation.used = true;
    invitation.receiverId = receiverId;
    invitation.usedAt = Date.now();
    await this.storage.updateInvitation(invitation);
    return invitation;
  }

  // Vérifie la validité d'un code
  async isValid(code: string): Promise<boolean> {
    const invitation = await this.storage.getInvitation(code);
    return !!invitation && !invitation.used;
  }

  // Génère un motif/couleur symbolique (exemple simple)
  private generateSymbolicLink(): string {
    const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF8800', '#00FF88', '#8800FF'];
    return colors[Math.floor(SecureRandom.random() * colors.length)];
  }

  // Pour tests ou export
  async getAllInvitations(): Promise<Invitation[]> {
    return await this.storage.getAllInvitations();
  }
} 