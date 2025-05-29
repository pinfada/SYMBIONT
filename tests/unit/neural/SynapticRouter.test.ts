import { SynapticRouter } from '../../../../src/neural/SynapticRouter';

describe('SynapticRouter', () => {
  it('route un message entre deux modules', () => {
    const router = new SynapticRouter();
    const received: any[] = [];
    router.register('A', (msg) => received.push(msg));
    router.route('A', { data: 42 });
    expect(received[0].data).toBe(42);
  });
});
