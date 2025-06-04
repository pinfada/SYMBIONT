import React, { useState, useEffect } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageType } from '../../shared/messaging/MessageBus';

interface ContextualInvitationProps {
  context?: string;
  onAccept?: () => void;
  onDismiss?: () => void;
}

export const ContextualInvitationNotification: React.FC<ContextualInvitationProps> = ({
  context,
  onAccept,
  onDismiss
}) => {
  const messaging = useMessaging();
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState<string>('');

  useEffect(() => {
    messaging.subscribe(MessageType.CONTEXTUAL_INVITATION, (msg: any) => {
      setCode(msg.payload.invitation.code);
      setVisible(true);
      setTimeout(() => setVisible(false), 10000);
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // Show notification logic
    if (context) {
      setVisible(true);
    }
  }, [context]);

  const handleJoin = () => {
    if (!context) return;
    
    context.sendMessage({
      type: 'JOIN_INVITATION',
      payload: { invitationId: invitation.id }
    });
    
    if (context.hideNotification) {
  if (!visible) return null;

  let contextText = '';
  let specialStyle: React.CSSProperties = {};
  let specialIcon = null;
  if (context === 'mutation_cognitive') contextText = 'Une mutation cognitive rare a eu lieu !';
  else if (context === 'curiosity_threshold') contextText = 'Votre curiosité a atteint un seuil exceptionnel !';
  else if (context === 'long_inactivity') contextText = 'Après une longue inactivité, une invitation spéciale est apparue…';
  else if (context.startsWith('collective_threshold_')) {
    const seuil = context.split('_').pop();
    contextText = `Un seuil collectif a été franchi ! ${seuil} transmissions atteintes dans le réseau.`;
    specialStyle = {
      background: 'radial-gradient(circle, #00e0ff 60%, #ffb700 100%)',
      boxShadow: '0 0 32px 8px #00e0ff88, 0 0 0 8px #ffb70044',
      border: '3px solid #ffb700',
      color: '#232946',
      animation: 'haloPulse 2s cubic-bezier(.4,0,.2,1) infinite',
    };
    specialIcon = <span style={{fontSize:32,marginRight:10}}>🌊</span>;
  }
  else contextText = 'Un événement rare a généré une invitation !';

  return (
    <div className="contextual-invitation-notification" style={{ zIndex: 1000, position: 'fixed', left: 0, right: 0, top: 32, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div className="murmur-notification" style={{ fontWeight: 600, fontSize: 18, maxWidth: 480, ...specialStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, boxShadow: specialStyle.boxShadow || '0 2px 12px #00e0ff44' }}>
        {specialIcon}
        {contextText}
      </div>
      <div style={{ marginTop: 10, fontSize: 16, marginLeft: 18, alignSelf: 'center' }}>
        <span>Invitation : </span>
        <span className="code-badge" style={{ fontSize: 22 }}>{code}</span>
      </div>
      <div>
        <button onClick={onAccept}>Accepter</button>
        <button onClick={onDismiss}>Ignorer</button>
      </div>
    </div>
  );
}; 