import { detectWebGPU } from '../webgpu';

describe('detectWebGPU', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'gpu');

  const setGpu = (value: unknown) => {
    Object.defineProperty(navigator, 'gpu', { value, configurable: true, writable: true });
  };

  afterEach(() => {
    if (original) {
      Object.defineProperty(navigator, 'gpu', original);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (navigator as any).gpu;
    }
  });

  it('reports unavailable when navigator.gpu is absent', async () => {
    setGpu(undefined);
    const res = await detectWebGPU();
    expect(res.available).toBe(false);
    expect(res.reason).toMatch(/WebGPU/i);
  });

  it('reports unavailable when no adapter is returned', async () => {
    setGpu({ requestAdapter: async () => null });
    const res = await detectWebGPU();
    expect(res.available).toBe(false);
    expect(res.reason).toMatch(/adaptateur|adapter/i);
  });

  it('reports available when an adapter is returned', async () => {
    setGpu({ requestAdapter: async () => ({}) });
    const res = await detectWebGPU();
    expect(res.available).toBe(true);
    expect(res.reason).toBeUndefined();
  });

  it('surfaces adapter info when exposed', async () => {
    setGpu({
      requestAdapter: async () => ({
        requestAdapterInfo: async () => ({ vendor: 'acme', architecture: 'gpu9' }),
      }),
    });
    const res = await detectWebGPU();
    expect(res.available).toBe(true);
    expect(res.adapterInfo).toBe('acme gpu9');
  });

  it('never throws even if requestAdapter rejects', async () => {
    setGpu({
      requestAdapter: async () => {
        throw new Error('driver crash');
      },
    });
    const res = await detectWebGPU();
    expect(res.available).toBe(false);
  });
});
