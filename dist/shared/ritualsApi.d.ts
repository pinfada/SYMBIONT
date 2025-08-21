export interface Ritual {
    _id: string;
    type: string;
    [key: string]: unknown;
}
export declare function getRituals(): Promise<Ritual[]>;
export declare function addRitual(ritual: Ritual): Promise<any>;
export declare function updateRitual(id: string, ritual: Partial<Ritual>): Promise<any>;
export declare function deleteRitual(id: string): Promise<any>;
export declare function deleteUserRituals(userId: string): Promise<any>;
//# sourceMappingURL=ritualsApi.d.ts.map