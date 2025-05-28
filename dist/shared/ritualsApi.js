"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRituals = getRituals;
exports.addRitual = addRitual;
exports.updateRitual = updateRitual;
exports.deleteRitual = deleteRitual;
exports.deleteUserRituals = deleteUserRituals;
const API_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8090' : '';
function getAdminHeaders() {
    const key = typeof window !== 'undefined' ? localStorage.getItem('symbiont_admin_key') : null;
    const headers = { 'Content-Type': 'application/json' };
    if (key)
        headers['x-api-key'] = key;
    return headers;
}
async function getRituals() {
    const res = await fetch(API_URL + '/api/admin/rituals', { headers: getAdminHeaders() });
    if (!res.ok)
        throw new Error('Erreur réseau');
    return res.json();
}
async function addRitual(ritual) {
    const res = await fetch(API_URL + '/api/admin/rituals', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(ritual)
    });
    if (!res.ok)
        throw new Error('Erreur ajout rituel');
    return res.json();
}
async function updateRitual(id, ritual) {
    const res = await fetch(API_URL + '/api/admin/rituals/' + id, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify(ritual)
    });
    if (!res.ok)
        throw new Error('Erreur modification rituel');
    return res.json();
}
async function deleteRitual(id) {
    const res = await fetch(API_URL + '/api/admin/rituals/' + id, {
        method: 'DELETE',
        headers: getAdminHeaders()
    });
    if (!res.ok)
        throw new Error('Erreur suppression rituel');
    return res.json();
}
async function deleteUserRituals(userId) {
    const res = await fetch(API_URL + '/api/admin/rgpd/' + encodeURIComponent(userId), {
        method: 'DELETE',
        headers: getAdminHeaders()
    });
    if (!res.ok)
        throw new Error('Erreur suppression RGPD');
    return res.json();
}
