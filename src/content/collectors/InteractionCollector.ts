// Collecteur d'interactions avancé pour SYMBIONT
import { MessageBus } from '../../core/messaging/MessageBus';
import { safeGetClasses } from '../../shared/utils/safeOperations';
import { logger } from '@shared/utils/secureLogger';

export interface InteractionEvent {
  type: 'click' | 'keypress' | 'scroll' | 'hover' | 'form_submit' | 'form_focus' | 'media_play' | 'media_pause' | 'selection' | 'contextmenu';
  timestamp: number;
  target: string;
  data: Record<string, any>;
  coordinates?: { x: number; y: number };
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

export class InteractionCollector extends EventTarget {
  private messageBus: MessageBus | null;
  private config: InteractionCollectorConfig;
  private isActive: boolean = false;
  private eventBuffer: InteractionEvent[] = [];
  private lastFlushTime: number = 0;
  private eventCounts: Map<string, number> = new Map();
  private lastEventTimes: Map<string, number> = new Map();

  // Tracking state
  // @ts-expect-error Position réservée pour usage futur
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private lastClickTime: number = 0;
  private clickSequence: number = 0;
  private keySequence: string = '';
  private formInteractions: Map<string, any> = new Map();

  constructor(messageBus?: MessageBus) {
    super();
    this.messageBus = messageBus || null;
    this.config = {
      clicks: true,
      keypresses: true,
      forms: true,
      media: true,
      hover: true,
      selection: true,
      contextmenu: true,
      debounceMs: 100,
      maxEventsPerSecond: 20
    };
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Mouse tracking
    document.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: true });
    document.addEventListener('mouseenter', this.handleMouseEnter.bind(this), { passive: true });
    document.addEventListener('mouseleave', this.handleMouseLeave.bind(this), { passive: true });
    
    if (this.config.clicks) {
      document.addEventListener('click', this.handleClick.bind(this), true);
      document.addEventListener('dblclick', this.handleDoubleClick.bind(this), true);
    }
    
    if (this.config.keypresses) {
      document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
      document.addEventListener('keyup', this.handleKeyUp.bind(this), true);
    }
    
    if (this.config.forms) {
      document.addEventListener('submit', this.handleFormSubmit.bind(this), true);
      document.addEventListener('focus', this.handleFormFocus.bind(this), true);
      document.addEventListener('blur', this.handleFormBlur.bind(this), true);
      document.addEventListener('change', this.handleFormChange.bind(this), true);
      document.addEventListener('input', this.handleFormInput.bind(this), true);
    }
    
    if (this.config.media) {
      document.addEventListener('play', this.handleMediaPlay.bind(this), true);
      document.addEventListener('pause', this.handleMediaPause.bind(this), true);
      document.addEventListener('ended', this.handleMediaEnded.bind(this), true);
    }
    
    if (this.config.selection) {
      document.addEventListener('selectstart', this.handleSelectionStart.bind(this), true);
      document.addEventListener('selectionchange', this.handleSelectionChange.bind(this), true);
    }
    
    if (this.config.contextmenu) {
      document.addEventListener('contextmenu', this.handleContextMenu.bind(this), true);
    }
    
    // Periodic flush
    setInterval(() => this.flushEvents(), 1000);
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mousePosition = { x: event.clientX, y: event.clientY };
  }

  private handleMouseEnter(event: MouseEvent): void {
    if (!this.config.hover) return;
    this.recordInteraction({
      type: 'hover',
      timestamp: Date.now(),
      target: this.getElementSelector(event.target as Element),
      data: {
        action: 'enter',
        duration: 0
      },
      coordinates: { x: event.clientX, y: event.clientY },
      element: this.extractElementInfo(event.target as Element)
    });
  }

  private handleMouseLeave(event: MouseEvent): void {
    if (!this.config.hover) return;
    this.recordInteraction({
      type: 'hover',
      timestamp: Date.now(),
      target: this.getElementSelector(event.target as Element),
      data: {
        action: 'leave',
        duration: 0 // Could be calculated with enter time
      },
      coordinates: { x: event.clientX, y: event.clientY },
      element: this.extractElementInfo(event.target as Element)
    });
  }

  private handleClick(event: MouseEvent): void {
    const now = Date.now();
    
    // Detect click sequences
    if (now - this.lastClickTime < 500) {
      this.clickSequence++;
    } else {
      this.clickSequence = 1;
    }
    this.lastClickTime = now;

    const element = event.target as Element;
    const isNavigation = this.isNavigationClick(element);
    const isInteractive = this.isInteractiveElement(element);

    this.recordInteraction({
      type: 'click',
      timestamp: now,
      target: this.getElementSelector(element),
      data: {
        button: event.button,
        clickSequence: this.clickSequence,
        isNavigation,
        isInteractive,
        modifiers: {
          ctrl: event.ctrlKey,
          shift: event.shiftKey,
          alt: event.altKey,
          meta: event.metaKey
        }
      },
      coordinates: { x: event.clientX, y: event.clientY },
      element: this.extractElementInfo(element)
    });
  }

  private handleDoubleClick(event: MouseEvent): void {
    this.recordInteraction({
      type: 'click',
      timestamp: Date.now(),
      target: this.getElementSelector(event.target as Element),
      data: {
        isDoubleClick: true,
        button: event.button
      },
      coordinates: { x: event.clientX, y: event.clientY },
      element: this.extractElementInfo(event.target as Element)
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Track key sequences
    if (event.key.length === 1) {
      this.keySequence += event.key;
      if (this.keySequence.length > 20) {
        this.keySequence = this.keySequence.slice(-20);
      }
    }

    const isShortcut = event.ctrlKey || event.metaKey || event.altKey;
    const isSpecialKey = ['Enter', 'Tab', 'Escape', 'Backspace', 'Delete'].includes(event.key);

    if (isShortcut || isSpecialKey) {
      this.recordInteraction({
        type: 'keypress',
        timestamp: Date.now(),
        target: this.getElementSelector(event.target as Element),
        data: {
          key: event.key,
          keyCode: event.keyCode,
          isShortcut,
          isSpecialKey,
          modifiers: {
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey
          },
          sequence: this.keySequence.slice(-5) // Last 5 characters
        },
        element: this.extractElementInfo(event.target as Element)
      });
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Handle specific key releases if needed
    if (event.key === 'Tab') {
      this.recordInteraction({
        type: 'keypress',
        timestamp: Date.now(),
        target: this.getElementSelector(event.target as Element),
        data: {
          key: event.key,
          action: 'tab_navigation'
        },
        element: this.extractElementInfo(event.target as Element)
      });
    }
  }

  private handleFormSubmit(event: Event): void {
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const formInfo = this.formInteractions.get(this.getElementSelector(form)) || {};

    this.recordInteraction({
      type: 'form_submit',
      timestamp: Date.now(),
      target: this.getElementSelector(form),
      data: {
        action: form.action,
        method: form.method,
        fieldCount: formData.entries ? Array.from(formData.entries()).length : 0,
        interactionTime: formInfo.interactionTime || 0,
        fieldInteractions: formInfo.fieldInteractions || 0
      },
      element: this.extractElementInfo(form)
    });
  }

  private handleFormFocus(event: Event): void {
    const element = event.target as HTMLElement;
    if (this.isFormField(element)) {
      const formSelector = this.getFormSelector(element);
      const formInfo = this.formInteractions.get(formSelector) || {
        startTime: Date.now(),
        fieldInteractions: 0,
        interactionTime: 0
      };
      
      formInfo.fieldInteractions++;
      this.formInteractions.set(formSelector, formInfo);

      this.recordInteraction({
        type: 'form_focus',
        timestamp: Date.now(),
        target: this.getElementSelector(element),
        data: {
          fieldType: (element as HTMLInputElement).type || (element.tagName || 'unknown').toLowerCase(),
          fieldName: (element as HTMLInputElement).name || (element as HTMLInputElement).id,
          formSelector
        },
        element: this.extractElementInfo(element)
      });
    }
  }

  private handleFormBlur(event: Event): void {
    const element = event.target as HTMLElement;
    if (this.isFormField(element)) {
      const formSelector = this.getFormSelector(element);
      const formInfo = this.formInteractions.get(formSelector);
      
      if (formInfo) {
        formInfo.interactionTime = Date.now() - formInfo.startTime;
        this.formInteractions.set(formSelector, formInfo);
      }
    }
  }

  private handleFormChange(event: Event): void {
    const element = event.target as HTMLElement;
    if (this.isFormField(element)) {
      this.recordInteraction({
        type: 'form_focus',
        timestamp: Date.now(),
        target: this.getElementSelector(element),
        data: {
          action: 'change',
          fieldType: (element as HTMLInputElement).type || (element.tagName || 'unknown').toLowerCase(),
          hasValue: !!(element as HTMLInputElement).value
        },
        element: this.extractElementInfo(element)
      });
    }
  }

  private handleFormInput(event: Event): void {
    // Debounce input events
    const element = event.target as HTMLElement;
    const selector = this.getElementSelector(element);
    const lastTime = this.lastEventTimes.get(selector) || 0;
    const now = Date.now();
    
    if (now - lastTime > this.config.debounceMs) {
      this.lastEventTimes.set(selector, now);
      
      if (this.isFormField(element)) {
        this.recordInteraction({
          type: 'form_focus',
          timestamp: now,
          target: selector,
          data: {
            action: 'input',
            fieldType: (element as HTMLInputElement).type || (element.tagName || 'unknown').toLowerCase(),
            valueLength: (element as HTMLInputElement).value?.length || 0
          },
          element: this.extractElementInfo(element)
        });
      }
    }
  }

  private handleMediaPlay(event: Event): void {
    const media = event.target as HTMLMediaElement;
    this.recordInteraction({
      type: 'media_play',
      timestamp: Date.now(),
      target: this.getElementSelector(media),
      data: {
        mediaType: (media.tagName || 'unknown').toLowerCase(),
        duration: media.duration,
        currentTime: media.currentTime,
        src: media.src
      },
      element: this.extractElementInfo(media)
    });
  }

  private handleMediaPause(event: Event): void {
    const media = event.target as HTMLMediaElement;
    this.recordInteraction({
      type: 'media_pause',
      timestamp: Date.now(),
      target: this.getElementSelector(media),
      data: {
        mediaType: (media.tagName || 'unknown').toLowerCase(),
        duration: media.duration,
        currentTime: media.currentTime,
        watchedPercentage: media.duration > 0 ? (media.currentTime / media.duration) * 100 : 0
      },
      element: this.extractElementInfo(media)
    });
  }

  private handleMediaEnded(event: Event): void {
    const media = event.target as HTMLMediaElement;
    this.recordInteraction({
      type: 'media_pause',
      timestamp: Date.now(),
      target: this.getElementSelector(media),
      data: {
        action: 'ended',
        mediaType: (media.tagName || 'unknown').toLowerCase(),
        duration: media.duration,
        completed: true
      },
      element: this.extractElementInfo(media)
    });
  }

  private handleSelectionStart(event: Event): void {
    this.recordInteraction({
      type: 'selection',
      timestamp: Date.now(),
      target: this.getElementSelector(event.target as Element),
      data: {
        action: 'start'
      },
      element: this.extractElementInfo(event.target as Element)
    });
  }

  // @ts-expect-error Paramètre réservé pour usage futur - fonction de sélection
  private handleSelectionChange(event: Event): void {
    const selection = document.getSelection();
    if (selection && selection.toString().length > 0) {
      this.recordInteraction({
        type: 'selection',
        timestamp: Date.now(),
        target: 'document',
        data: {
          text: selection.toString(),
          length: selection.toString().length
        }
      });
    }
  }

  private handleContextMenu(event: MouseEvent): void {
    this.recordInteraction({
      type: 'contextmenu',
      timestamp: Date.now(),
      target: this.getElementSelector(event.target as Element),
      data: {
        button: event.button
      },
      coordinates: { x: event.clientX, y: event.clientY },
      element: this.extractElementInfo(event.target as Element)
    });
  }

  // Utility methods
  private recordInteraction(interaction: InteractionEvent): void {
    if (!this.isActive) return;
    
    // Rate limiting
    const eventType = interaction.type;
    const now = Date.now();
    const count = this.eventCounts.get(eventType) || 0;
    const lastReset = this.lastEventTimes.get(`reset_${eventType}`) || now;
    
    if (now - lastReset > 1000) {
      this.eventCounts.set(eventType, 1);
      this.lastEventTimes.set(`reset_${eventType}`, now);
    } else if (count >= this.config.maxEventsPerSecond) {
      return; // Rate limited
    } else {
      this.eventCounts.set(eventType, count + 1);
    }
    
    this.eventBuffer.push(interaction);
    
    // Emit event
    this.dispatchEvent(new CustomEvent('interaction', { detail: interaction }));
    
    // Auto-flush if buffer is full
    if (this.eventBuffer.length > 50) {
      this.flushEvents();
    }
  }

  private flushEvents(): void {
    if (this.eventBuffer.length === 0) return;
    
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    this.lastFlushTime = Date.now();
    
    // Send to message bus if available
    if (this.messageBus) {
      this.messageBus.sendToBackground({
        type: 'INTERACTIONS_BATCH',
        payload: {
          events,
          timestamp: Date.now(),
          url: window.location.href
        }
      });
    }
  }

  private getElementSelector(element: Element): string {
    if (!element) return 'unknown';
    
    let selector = (element.tagName || 'unknown').toLowerCase();
    
    if (element.id) {
      selector += `#${element.id}`;
    } else {
      const classes = safeGetClasses(element);
      if (classes.length > 0) {
        selector += `.${classes.slice(0, 3).join('.')}`;
      }
    }
    
    return selector;
  }

  private extractElementInfo(element: Element): InteractionEvent['element'] {
    if (!element) return undefined;
    
    const info: InteractionEvent['element'] = {
      tag: (element.tagName || 'unknown').toLowerCase()
    };
    
    if (element.id) info.id = element.id;
    
    const classes = safeGetClasses(element);
    if (classes.length > 0) info.classes = classes;
    
    if (element.textContent) {
      const text = element.textContent.slice(0, 50);
      if (text) info.text = text;
    }
    
    const href = (element as HTMLAnchorElement).href;
    if (href) info.href = href;
    
    return info;
  }

  private isNavigationClick(element: Element): boolean {
    return (
      element.tagName === 'A' ||
      element.closest('a') !== null ||
      element.getAttribute('role') === 'link' ||
      element.hasAttribute('onclick')
    );
  }

  private isInteractiveElement(element: Element): boolean {
    const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
    return (
      interactiveTags.includes((element.tagName || '').toLowerCase()) ||
      element.hasAttribute('tabindex') ||
      element.getAttribute('role') === 'button' ||
      element.hasAttribute('onclick')
    );
  }

  private isFormField(element: Element): boolean {
    const fieldTags = ['input', 'textarea', 'select'];
    return fieldTags.includes((element.tagName || '').toLowerCase());
  }

  private getFormSelector(element: Element): string {
    const form = element.closest('form');
    return form ? this.getElementSelector(form) : 'no-form';
  }

  // Public API
  public start(config?: Partial<InteractionCollectorConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.isActive = true;
    logger.info('🔍 InteractionCollector started');
  }

  public stop(): void {
    this.isActive = false;
    this.flushEvents();
    logger.info('🔍 InteractionCollector stopped');
  }

  public on(event: string, handler: (interaction: any) => void): void {
    this.addEventListener(event, (e: any) => handler(e.detail));
  }

  public getStats(): any {
    return {
      bufferSize: this.eventBuffer.length,
      lastFlushTime: this.lastFlushTime,
      eventCounts: Object.fromEntries(this.eventCounts),
      isActive: this.isActive
    };
  }
}