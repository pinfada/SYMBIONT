declare class ServiceWorkerStorage {
    private static instance;
    static getInstance(): ServiceWorkerStorage;
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
}
declare class ServiceWorkerMessageChannel {
    private handlers;
    private channelName;
    constructor(channelName: string);
    private setupMessageListener;
    postMessage(data: any): void;
    private broadcastViaStorage;
    private handleMessage;
    set onmessage(handler: (event: {
        data: any;
    }) => void);
}
declare class ServiceWorkerCrypto {
    private encryptionKey;
    encryptSensitiveData(data: any): Promise<string>;
    decryptSensitiveData(encryptedData: string): Promise<any>;
}
declare class ServiceWorkerIndexedDB {
    private db;
    private readonly DB_NAME;
    private readonly DB_VERSION;
    initialize(): Promise<void>;
    getOrganism(): Promise<any>;
    saveOrganism(organism: any): Promise<void>;
}
declare class ServiceWorkerGlobals {
    private static storage;
    private static swCrypto;
    static get swLocalStorage(): {
        getItem: (key: string) => Promise<string | null>;
        setItem: (key: string, value: string) => Promise<void>;
        removeItem: (key: string) => Promise<void>;
    };
    static get swIndexedDB(): IDBFactory;
    static swBroadcastChannel: typeof ServiceWorkerMessageChannel;
    static get swCryptoAPI(): {
        encryptSensitiveData: (data: any) => Promise<string>;
        decryptSensitiveData: (encryptedData: string) => Promise<any>;
        subtle: SubtleCrypto;
        getRandomValues<T extends ArrayBufferView | null>(array: T): T;
        randomUUID(): `${string}-${string}-${string}-${string}-${string}`;
    };
}
export declare const swLocalStorage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
};
export declare const swBroadcastChannel: typeof ServiceWorkerMessageChannel;
export declare const swCryptoAPI: {
    encryptSensitiveData: (data: any) => Promise<string>;
    decryptSensitiveData: (encryptedData: string) => Promise<any>;
    subtle: SubtleCrypto;
    getRandomValues<T extends ArrayBufferView | null>(array: T): T;
    randomUUID(): `${string}-${string}-${string}-${string}-${string}`;
};
export declare const swIndexedDB: IDBFactory;
export { ServiceWorkerStorage, ServiceWorkerMessageChannel, ServiceWorkerCrypto, ServiceWorkerIndexedDB, ServiceWorkerGlobals };
//# sourceMappingURL=service-worker-adapter.d.ts.map