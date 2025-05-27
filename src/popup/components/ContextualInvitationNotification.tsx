import React, { useEffect, useState } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageType } from '../../shared/messaging/MessageBus';

interface ContextualInvitation {
  invitation: { code: string };
  context: string;
}

export const ContextualInvitationNotification: React.FC = () => {
  const messaging = useMessaging();
  const [visible, setVisible] = useState(false);
  const [context, setContext] = useState<string>('');
  const [code, setCode] = useState<string>('');

  useEffect(() => {
    messaging.subscribe(MessageType.CONTEXTUAL_INVITATION, (msg: { payload: ContextualInvitation }) => {
      setCode(msg.payload.invitation.code);
      setContext(msg.payload.context);
      setVisible(true);
      setTimeout(() => setVisible(false), 10000);
    });
    // eslint-disable-next-line
  }, []);

  if (!visible) return null;

  let contextText = '';
  if (context === 'mutation_cognitive') contextText = 'Une mutation cognitive rare a eu lieu !';
  else if (context === 'curiosity_threshold') contextText = 'Votre curiosité a atteint un seuil exceptionnel !';
  else if (context === 'long_inactivity') contextText = 'Après une longue inactivité, une invitation spéciale est apparue…';
  else contextText = 'Un événement rare a généré une invitation !';

  return (
    <div className="contextual-invitation-notification">
      <div className="murmur-notification" style={{ fontWeight: 600, fontSize: 18 }}>
        {contextText}
      </div>
      <div style={{ marginTop: 10, fontSize: 16 }}>
        <span>Invitation : </span>
        <span className="code-badge" style={{ fontSize: 22 }}>{code}</span>
      </div>
    </div>
  );
}; 