"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationHistory = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const InvitationHistory = ({ invitations }) => {
    if (invitations.length === 0) {
        return (0, jsx_runtime_1.jsx)("div", { className: "invitation-history-empty", children: "Aucune invitation pour le moment." });
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "invitation-history", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Historique des invitations" }), (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Type" }), (0, jsx_runtime_1.jsx)("th", { children: "Code" }), (0, jsx_runtime_1.jsx)("th", { children: "Date" }), (0, jsx_runtime_1.jsx)("th", { children: "Statut" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: invitations.map((inv, idx) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: inv.type === 'envoyée' ? 'Envoyée' : 'Reçue' }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: "code-badge", children: inv.code }) }), (0, jsx_runtime_1.jsx)("td", { children: new Date(inv.createdAt).toLocaleDateString() }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: `status-badge status-${inv.status}`, children: inv.status }) })] }, inv.code + idx))) })] })] }));
};
exports.InvitationHistory = InvitationHistory;
