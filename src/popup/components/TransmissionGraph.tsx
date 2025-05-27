import React from 'react';
import { Invitation } from '../../shared/types/invitation';

interface TransmissionGraphProps {
  inviter?: Invitation | null;
  invitees?: Invitation[];
  userCode: string;
}

export const TransmissionGraph: React.FC<TransmissionGraphProps> = ({ inviter, invitees = [], userCode }) => {
  return (
    <div className="transmission-graph">
      <div className="graph-node graph-parent">
        {inviter ? (
          <div>
            <span>Invité par</span>
            <div className="code-badge">{inviter.code}</div>
          </div>
        ) : (
          <div className="code-badge code-badge-root">Origine</div>
        )}
      </div>
      <div className="graph-connector">↓</div>
      <div className="graph-node graph-user">
        <span>Vous</span>
        <div className="code-badge code-badge-user">{userCode}</div>
      </div>
      {invitees.length > 0 && (
        <>
          <div className="graph-connector">↓</div>
          <div className="graph-invitees">
            {invitees.map((inv, idx) => (
              <div className="graph-node graph-invitee" key={inv.code}>
                <span>Invité n°{idx + 1}</span>
                <div className="code-badge">{inv.code}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}; 