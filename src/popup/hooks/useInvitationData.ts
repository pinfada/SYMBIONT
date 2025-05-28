import { useEffect, useState } from 'react';
import { useMessaging } from './useMessaging';
import { MessageType } from '../../shared/messaging/MessageBus';
import { Invitation } from '../../shared/types/invitation';

export function useInvitationData(userId: string) {
  const messaging = useMessaging();
  const [inviter, setInviter] = useState<Invitation | null>(null);
  const [invitees, setInvitees] = useState<Invitation[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    messaging.send(MessageType.GET_INVITER, { userId });
    messaging.subscribe(MessageType.INVITER_RESULT, (msg: any) => setInviter(msg.payload));

    messaging.send(MessageType.GET_INVITEES, { userId });
    messaging.subscribe(MessageType.INVITEES_RESULT, (msg: any) => setInvitees(msg.payload));

    messaging.send(MessageType.GET_INVITATION_HISTORY, { userId });
    messaging.subscribe(MessageType.INVITATION_HISTORY_RESULT, (msg: any) => setHistory(msg.payload));
    // Nettoyage des subscriptions si besoin
    // eslint-disable-next-line
  }, [userId]);

  return { inviter, invitees, history };
} 