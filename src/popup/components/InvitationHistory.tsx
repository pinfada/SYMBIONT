import React from 'react';
import { Invitation, InvitationStatus } from '../../shared/types/invitation';

interface InvitationHistoryProps {
  invitations: Array<Invitation & { status: InvitationStatus; type: 'envoyée' | 'reçue' }>;
}

export const InvitationHistory: React.FC<InvitationHistoryProps> = ({ invitations }) => {
  if (invitations.length === 0) {
    return <div className="invitation-history-empty">Aucune invitation pour le moment.</div>;
  }
  return (
    <div className="invitation-history">
      <h3>Historique des invitations</h3>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Code</th>
            <th>Date</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv, idx) => (
            <tr key={inv.code + idx}>
              <td>{inv.type === 'envoyée' ? 'Envoyée' : 'Reçue'}</td>
              <td><span className="code-badge">{inv.code}</span></td>
              <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
              <td>
                <span className={`status-badge status-${inv.status}`}>{inv.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 