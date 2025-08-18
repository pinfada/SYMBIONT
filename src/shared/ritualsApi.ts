export interface Ritual {
  _id: string;
  type: string;
  [key: string]: unknown;
}

const API_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8090' : '';

function getAdminHeaders() {
  const key = typeof window !== 'undefined' ? localStorage.getItem('symbiont_admin_key') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['x-api-key'] = key;
  return headers;
}

export async function getRituals(): Promise<Ritual[]> {
  const res = await fetch(API_URL + '/api/admin/rituals', { headers: getAdminHeaders() });
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
}

export async function addRitual(ritual: Ritual) {
  const res = await fetch(API_URL + '/api/admin/rituals', {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(ritual)
  });
  if (!res.ok) throw new Error('Erreur ajout rituel');
  return res.json();
}

export async function updateRitual(id: string, ritual: Partial<Ritual>) {
  const res = await fetch(API_URL + '/api/admin/rituals/' + id, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(ritual)
  });
  if (!res.ok) throw new Error('Erreur modification rituel');
  return res.json();
}

export async function deleteRitual(id: string) {
  const res = await fetch(API_URL + '/api/admin/rituals/' + id, {
    method: 'DELETE',
    headers: getAdminHeaders()
  });
  if (!res.ok) throw new Error('Erreur suppression rituel');
  return res.json();
}

export async function deleteUserRituals(userId: string) {
  const res = await fetch(API_URL + '/api/admin/rgpd/' + encodeURIComponent(userId), {
    method: 'DELETE',
    headers: getAdminHeaders()
  });
  if (!res.ok) throw new Error('Erreur suppression RGPD');
  return res.json();
} 