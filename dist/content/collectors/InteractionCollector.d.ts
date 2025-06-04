import { MessageBus } from '../../core/messaging/MessageBus';
export interface InteractionEvent {
    type: 'click' | 'keypress' | 'scroll' | 'hover' | 'form_submit' | 'form_focus' | 'media_play' | 'media_pause' | 'selection' | 'contextmenu';
    timestamp: number;
    target: string;
    data: Record<string, any>;
    coordinates?: {
        x: number;
        y: number;
    };
    element?: {
        tag: string;
        id?: string;
        classes?: string[];
        text?: string;
        href?: string;
    } | undefined;
}
export interface InteractionCollectorConfig {
    clicks: boolean;
    keypresses: boolean;
    forms: boolean;
    media: boolean;
    hover: boolean;
    selection: boolean;
    contextmenu: boolean;
    debounceMs: number;
    maxEventsPerSecond: number;
}
export declare class InteractionCollector extends EventTarget {
    private messageBus;
    private config;
    private isActive;
    private eventBuffer;
    private lastFlushTime;
    private eventCounts;
    private lastEventTimes;
    private mousePosition;
    private lastClickTime;
    private clickSequence;
    private keySequence;
    private formInteractions;
    constructor(messageBus?: MessageBus);
    private setupEventListeners;
    private handleMouseMove;
    private handleMouseEnter;
    private handleMouseLeave;
    private handleClick;
    private handleDoubleClick;
    private handleKeyDown;
    private handleKeyUp;
    private handleFormSubmit;
    private handleFormFocus;
    private handleFormBlur;
    private handleFormChange;
    private handleFormInput;
    private handleMediaPlay;
    private handleMediaPause;
    private handleMediaEnded;
    private handleSelectionStart;
    private handleSelectionChange;
    private handleContextMenu;
    private recordInteraction;
    private flushEvents;
    private getElementSelector;
    private extractElementInfo;
    private isNavigationClick;
    private isInteractiveElement;
    private isFormField;
    private getFormSelector;
    start(config?: Partial<InteractionCollectorConfig>): void;
    stop(): void;
    on(event: string, handler: (interaction: any) => void): void;
    getStats(): any;
}
//# sourceMappingURL=InteractionCollector.d.ts.map