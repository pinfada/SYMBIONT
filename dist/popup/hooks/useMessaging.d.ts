export declare const useMessaging: () => {
    subscribe: (type: string, handler: Function) => void;
    unsubscribe: (type: string, handler: Function) => void;
    send: (type: string, payload: any) => void;
};
