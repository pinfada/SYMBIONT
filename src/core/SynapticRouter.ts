type MessageHandler = (message: any) => Promise<void>;

export class SynapticRouter {
  private connections: Map<string, MessageHandler>;
  private isConnected: boolean;

  constructor() {
    this.connections = new Map();
    this.isConnected = false;
  }

  /**
   * Établit les connexions du routeur
   * @returns {Promise<void>}
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message).then(sendResponse);
      return true;
    });

    this.isConnected = true;
  }

  /**
   * Déconnecte le routeur
   * @returns {Promise<void>}
   */
  async disconnect(): Promise<void> {
    this.connections.clear();
    this.isConnected = false;
  }

  /**
   * Enregistre un gestionnaire de messages
   * @param {string} route - Identifiant de la route
   * @param {MessageHandler} handler - Fonction de traitement
   */
  registerHandler(route: string, handler: MessageHandler): void {
    this.connections.set(route, handler);
  }

  /**
   * Gère un message entrant
   * @param {any} message - Message à traiter
   * @returns {Promise<void>}
   */
  private async handleMessage(message: any): Promise<void> {
    const handler = this.connections.get(message.route);
    if (handler) {
      await handler(message.payload);
    }
  }
} 