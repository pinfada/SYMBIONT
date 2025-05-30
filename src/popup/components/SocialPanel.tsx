import React, { useState } from 'react';

const SocialPanel: React.FC = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [generated, setGenerated] = useState('');

  return (
    <div data-testid="social-panel">
      <h2 data-testid="social-title">Inviter</h2>
      <button data-testid="generate-btn" onClick={() => setGenerated('ABC12345')}>Générer</button>
      {generated && <input data-testid="generated-code" readOnly value={generated} />}
      <input name="invitationCode" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Code d'invitation" data-testid="invitation-code-input" />
      <button data-testid="accept-btn" onClick={() => setAccepted(true)}>Accepter</button>
      {accepted && <div data-testid="invitation-accepted">Invitation acceptée</div>}
    </div>
  );
};

export default SocialPanel; 