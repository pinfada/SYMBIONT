import * as api from './ritualsApi';

global.fetch = jest.fn();

describe('ritualsApi', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockReset();
  });

  it('getRituals fetches rituals', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [{ _id: '1', type: 'fusion' }] });
    const rituals = await api.getRituals();
    expect(rituals[0]._id).toBe('1');
  });

  it('addRitual posts a ritual', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const res = await api.addRitual({ _id: '2', type: 'fusion' });
    expect(res.ok).toBe(true);
  });

  it('updateRitual puts a ritual', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const res = await api.updateRitual('2', { type: 'fusion' });
    expect(res.ok).toBe(true);
  });

  it('deleteRitual deletes a ritual', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const res = await api.deleteRitual('2');
    expect(res.ok).toBe(true);
  });
}); 