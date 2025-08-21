import React from 'react';
interface UseKeyboardNavigationProps {
    /** Elements à naviguer (sélecteurs CSS ou références) */
    items: string[] | React.RefObject<HTMLElement>[];
    /** Index actuel sélectionné */
    activeIndex: number;
    /** Callback quand l'index change */
    onActiveIndexChange: (newIndex: number) => void;
    /** Callback pour activer l'élément sélectionné */
    onActivate: (index: number) => void;
    /** Activer la navigation circulaire */
    circular?: boolean;
    /** Touches personnalisées (par défaut: ArrowUp, ArrowDown, Enter, Space) */
    keys?: {
        previous?: string[];
        next?: string[];
        activate?: string[];
    };
    /** Activer/désactiver la navigation */
    enabled?: boolean;
}
/**
 * Hook personnalisé pour la navigation au clavier accessible
 * Implémente les patterns ARIA pour la navigation par onglets et listes
 */
export declare const useKeyboardNavigation: ({ items, activeIndex, onActiveIndexChange, onActivate, circular, keys, enabled }: UseKeyboardNavigationProps) => {
    containerRef: React.RefObject<HTMLElement | null>;
    navigationMethods: {
        goToPrevious: () => void;
        goToNext: () => void;
        goToIndex: (newIndex: number) => void;
        activate: () => void;
        focusActive: () => void;
    };
    containerProps: {
        ref: React.RefObject<HTMLElement | null>;
        role: string;
        'aria-orientation': "horizontal";
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
    };
    getItemProps: (index: number) => {
        role: string;
        tabIndex: number;
        'aria-selected': boolean;
        id: string;
        'aria-controls': string;
    };
};
export {};
//# sourceMappingURL=useKeyboardNavigation.d.ts.map