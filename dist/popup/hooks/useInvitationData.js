"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useInvitationData = useInvitationData;
const react_1 = require("react");
const useMessaging_1 = require("./useMessaging");
const MessageBus_1 = require("../../shared/messaging/MessageBus");
function useInvitationData(userId) {
    const messaging = (0, useMessaging_1.useMessaging)();
    const [inviter, setInviter] = (0, react_1.useState)(null);
    const [invitees, setInvitees] = (0, react_1.useState)([]);
    const [history, setHistory] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        if (!userId)
            return;
        messaging.send(MessageBus_1.MessageType.GET_INVITER, { userId });
        messaging.subscribe(MessageBus_1.MessageType.INVITER_RESULT, (msg) => setInviter(msg.payload));
        messaging.send(MessageBus_1.MessageType.GET_INVITEES, { userId });
        messaging.subscribe(MessageBus_1.MessageType.INVITEES_RESULT, (msg) => setInvitees(msg.payload));
        messaging.send(MessageBus_1.MessageType.GET_INVITATION_HISTORY, { userId });
        messaging.subscribe(MessageBus_1.MessageType.INVITATION_HISTORY_RESULT, (msg) => setHistory(msg.payload));
        // Nettoyage des subscriptions si besoin
        // eslint-disable-next-line
    }, [userId]);
    return { inviter, invitees, history };
}
