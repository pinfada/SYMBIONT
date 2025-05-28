"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRitualsPanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ritualsApi_1 = require("../../shared/ritualsApi");
const AdminRitualsPanel = () => {
    const [rituals, setRituals] = (0, react_1.useState)([]);
    const [editing, setEditing] = (0, react_1.useState)(null);
    const [form, setForm] = (0, react_1.useState)({});
    const [error, setError] = (0, react_1.useState)(null);
    const [adding, setAdding] = (0, react_1.useState)(false);
    const [rgpdUserId, setRgpdUserId] = (0, react_1.useState)('');
    const [rgpdResult, setRgpdResult] = (0, react_1.useState)(null);
    // Sécurité simple : clé admin dans localStorage
    const adminKey = localStorage.getItem('symbiont_admin_key');
    if (!adminKey)
        return (0, jsx_runtime_1.jsx)("div", { style: { color: '#ff4b6e', margin: 24 }, children: "Acc\u00E8s r\u00E9serv\u00E9 \u00E0 l'admin." });
    const refresh = () => (0, ritualsApi_1.getRituals)().then(setRituals);
    (0, react_1.useEffect)(() => {
        refresh();
        // WebSocket notifications
        const wsUrl = window.location.origin.replace(/^http/, 'ws') + '/';
        const ws = new window.WebSocket(wsUrl);
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (['created', 'updated', 'deleted'].includes(msg.type))
                    refresh();
            }
            catch { }
        };
        return () => ws.close();
    }, []);
    const handleEdit = (ritual) => {
        setEditing(ritual._id);
        setForm(ritual);
    };
    const handleSave = async () => {
        if (!form._id || !form.type) {
            setError('Champs obligatoires manquants');
            return;
        }
        try {
            await (0, ritualsApi_1.updateRitual)(form._id, form);
            setEditing(null);
            setForm({});
            setError(null);
            refresh();
        }
        catch (e) {
            setError('Erreur lors de la sauvegarde');
        }
    };
    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer ce rituel ?'))
            return;
        await (0, ritualsApi_1.deleteRitual)(id);
        refresh();
    };
    const handleAdd = async () => {
        if (!form._id || !form.type) {
            setError('Champs obligatoires manquants');
            return;
        }
        try {
            await (0, ritualsApi_1.addRitual)(form);
            setAdding(false);
            setForm({});
            setError(null);
            refresh();
        }
        catch (e) {
            setError('Erreur lors de l\'ajout');
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 24 }, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Admin Rituels" }), (0, jsx_runtime_1.jsx)("button", { onClick: refresh, "aria-label": "Rafra\u00EEchir la liste des rituels", children: "Rafra\u00EEchir" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { setAdding(true); setForm({}); }, "aria-label": "Ajouter un rituel", children: "Ajouter un rituel" }), error && (0, jsx_runtime_1.jsx)("div", { style: { color: '#ff4b6e' }, role: "alert", children: error }), (0, jsx_runtime_1.jsxs)("div", { style: { margin: '18px 0', padding: '12px', background: '#eaf6fa', borderRadius: 8 }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Effacement RGPD (tous les rituels d'un utilisateur) :" }), (0, jsx_runtime_1.jsx)("br", {}), (0, jsx_runtime_1.jsx)("label", { htmlFor: "rgpd-user-id", children: "ID utilisateur" }), (0, jsx_runtime_1.jsx)("input", { id: "rgpd-user-id", value: rgpdUserId, onChange: e => setRgpdUserId(e.target.value), placeholder: "ID utilisateur\u2026", style: { marginRight: 8, outline: '2px solid #00e0ff' } }), (0, jsx_runtime_1.jsx)("button", { onClick: async () => {
                            if (!rgpdUserId)
                                return;
                            try {
                                const res = await (0, ritualsApi_1.deleteUserRituals)(rgpdUserId);
                                setRgpdResult(`Rituels supprimés : ${res.deleted}`);
                                refresh();
                            }
                            catch {
                                setRgpdResult('Erreur lors de la suppression RGPD');
                            }
                        }, "aria-label": "Effacer tous les rituels de cet utilisateur", children: "Effacer" }), rgpdResult && (0, jsx_runtime_1.jsx)("span", { style: { marginLeft: 12, color: '#ff4b6e' }, role: "status", "aria-live": "polite", children: rgpdResult })] }), (0, jsx_runtime_1.jsxs)("table", { style: { marginTop: 18, width: '100%', borderCollapse: 'collapse' }, "aria-label": "Tableau des rituels", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: '#eaf6fa' }, children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", children: "ID" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Type" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Payload" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Actions" })] }) }), (0, jsx_runtime_1.jsxs)("tbody", { children: [rituals.map(r => editing === r._id ? ((0, jsx_runtime_1.jsxs)("tr", { style: { background: '#fffbe6' }, children: [(0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("input", { value: form._id || '', onChange: e => setForm(f => ({ ...f, _id: e.target.value })), style: { outline: '2px solid #00e0ff' }, "aria-label": "ID du rituel" }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("input", { value: form.type || '', onChange: e => setForm(f => ({ ...f, type: e.target.value })), style: { outline: '2px solid #00e0ff' }, "aria-label": "Type du rituel" }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("textarea", { value: JSON.stringify(form, null, 2), onChange: e => { try {
                                                setForm(JSON.parse(e.target.value));
                                            }
                                            catch { } }, style: { width: 220, outline: '2px solid #00e0ff' }, "aria-label": "Payload du rituel" }) }), (0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("button", { onClick: handleSave, "aria-label": "Enregistrer les modifications", children: "Enregistrer" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { setEditing(null); setForm({}); }, "aria-label": "Annuler l'\u00E9dition", children: "Annuler" })] })] }, r._id)) : ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: r._id }), (0, jsx_runtime_1.jsx)("td", { children: r.type }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("pre", { style: { fontSize: 12, maxWidth: 220, overflow: 'auto' }, children: JSON.stringify(r, null, 2) }) }), (0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => handleEdit(r), "aria-label": `Éditer le rituel ${r._id}`, children: "\u00C9diter" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleDelete(r._id), "aria-label": `Supprimer le rituel ${r._id}`, children: "Supprimer" })] })] }, r._id))), adding && ((0, jsx_runtime_1.jsxs)("tr", { style: { background: '#eaf6fa' }, children: [(0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("input", { value: form._id || '', onChange: e => setForm(f => ({ ...f, _id: e.target.value })), style: { outline: '2px solid #00e0ff' }, "aria-label": "ID du rituel" }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("input", { value: form.type || '', onChange: e => setForm(f => ({ ...f, type: e.target.value })), style: { outline: '2px solid #00e0ff' }, "aria-label": "Type du rituel" }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("textarea", { value: JSON.stringify(form, null, 2), onChange: e => { try {
                                                setForm(JSON.parse(e.target.value));
                                            }
                                            catch { } }, style: { width: 220, outline: '2px solid #00e0ff' }, "aria-label": "Payload du rituel" }) }), (0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("button", { onClick: handleAdd, "aria-label": "Ajouter le rituel", children: "Ajouter" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { setAdding(false); setForm({}); }, "aria-label": "Annuler l\\'ajout", children: "Annuler" })] })] }))] })] })] }));
};
exports.AdminRitualsPanel = AdminRitualsPanel;
