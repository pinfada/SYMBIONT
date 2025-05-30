import React, { useState } from 'react';

const SocialPanel: React.FC = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [generated, setGenerated] = useState('');

  return (
    <div data-testid="social-panel">
      <h2>Inviter</h2>
      <button onClick={() => setGenerated('ABC12345')}>Générer</button>
      {generated && <input readOnly value={generated} />}
      <input name="invitationCode" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Code d'invitation" />
      <button onClick={() => setAccepted(true)}>Accepter</button>
      {accepted && <div>Invitation acceptée</div>}
    </div>
  );
};

export default SocialPanel; 