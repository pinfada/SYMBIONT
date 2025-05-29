import MessageBus from '../../../src/core/messaging/MessageBus';

describe('MessageBus - Concurrence et unicité', () => {
  it('traite chaque message une seule fois et dans l\'ordre même en cas d\'envois concurrents', async () => {
    // Mock du type de message minimal
    const TYPE = 'TEST_TYPE' as any;
    const bus = new MessageBus('background');
    const processed: any[] = [];
    bus.on(TYPE, async (msg) => {
      processed.push(msg.payload.value);
      // Simule un traitement asynchrone variable
      await new Promise(res => setTimeout(res, Math.random() * 10));
    });

    // Génère 10 messages en parallèle
    const messages = Array.from({ length: 10 }, (_, i) => ({ type: TYPE, payload: { value: i } }));
    await Promise.all(messages.map(msg => bus['enqueueMessage'](msg)));
    // Attends que la queue soit vide
    await new Promise(res => setTimeout(res, 100));

    // Vérifie unicité et ordre
    expect(processed).toHaveLength(10);
    expect(processed).toEqual(messages.map(m => m.payload.value));
    // Vérifie qu'aucun doublon
    const set = new Set(processed);
    expect(set.size).toBe(10);
  });
});
