import React, { useEffect, useCallback, useRef } from 'react';

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
export const useKeyboardNavigation = ({
  items,
  activeIndex,
  onActiveIndexChange,
  onActivate,
  circular = true,
  keys = {
    previous: ['ArrowUp', 'ArrowLeft'],
    next: ['ArrowDown', 'ArrowRight'],
    activate: ['Enter', ' ']
  },
  enabled = true
}: UseKeyboardNavigationProps) => {
  const containerRef = useRef<HTMLElement>(null);

  // Obtenir l'élément à l'index donné
  const getElementAtIndex = useCallback((index: number): HTMLElement | null => {
    if (index < 0 || index >= items.length) return null;

    const item = items[index];
    if (typeof item === 'string') {
      // Sélecteur CSS
      return containerRef.current?.querySelector(item) as HTMLElement || null;
    } else {
      // Référence React
      return item.current;
    }
  }, [items]);

  // Mettre à jour le focus et les attributs ARIA
  const updateFocus = useCallback((newIndex: number) => {
    if (!enabled) return;

    // Mettre à jour les tabIndex
    items.forEach((_, index) => {
      const element = getElementAtIndex(index);
      if (element) {
        element.tabIndex = index === newIndex ? 0 : -1;
        element.setAttribute('aria-selected', String(index === newIndex));
      }
    });

    // Donner le focus à l'élément sélectionné
    const activeElement = getElementAtIndex(newIndex);
    if (activeElement) {
      activeElement.focus();
    }
  }, [enabled, items, getElementAtIndex]);

  // Navigation précédente
  const navigatePrevious = useCallback(() => {
    if (!enabled) return;

    let newIndex = activeIndex - 1;
    if (newIndex < 0) {
      newIndex = circular ? items.length - 1 : 0;
    }
    onActiveIndexChange(newIndex);
  }, [enabled, activeIndex, items.length, circular, onActiveIndexChange]);

  // Navigation suivante
  const navigateNext = useCallback(() => {
    if (!enabled) return;

    let newIndex = activeIndex + 1;
    if (newIndex >= items.length) {
      newIndex = circular ? 0 : items.length - 1;
    }
    onActiveIndexChange(newIndex);
  }, [enabled, activeIndex, items.length, circular, onActiveIndexChange]);

  // Activer l'élément courant
  const activateCurrent = useCallback(() => {
    if (!enabled) return;
    onActivate(activeIndex);
  }, [enabled, activeIndex, onActivate]);

  // Gestionnaire d'événements clavier
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (!enabled) return;

    const { key } = event;

    // Navigation précédente
    if (keys.previous?.includes(key)) {
      event.preventDefault();
      navigatePrevious();
      return;
    }

    // Navigation suivante
    if (keys.next?.includes(key)) {
      event.preventDefault();
      navigateNext();
      return;
    }

    // Activation
    if (keys.activate?.includes(key)) {
      event.preventDefault();
      activateCurrent();
      return;
    }

    // Navigation directe par numéro (1-9)
    if (/^[1-9]$/.test(key)) {
      const targetIndex = parseInt(key) - 1;
      if (targetIndex < items.length) {
        event.preventDefault();
        onActiveIndexChange(targetIndex);
      }
      return;
    }

    // Home - aller au début
    if (key === 'Home') {
      event.preventDefault();
      onActiveIndexChange(0);
      return;
    }

    // End - aller à la fin
    if (key === 'End') {
      event.preventDefault();
      onActiveIndexChange(items.length - 1);
      return;
    }
  }, [
    enabled,
    keys,
    navigatePrevious,
    navigateNext,
    activateCurrent,
    items.length,
    onActiveIndexChange
  ]);

  // Configuration initiale et cleanup
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Ajouter le gestionnaire d'événements DOM natif
    const domHandler = (event: KeyboardEvent) => {
      handleKeyDown(event as any);
    };
    
    container.addEventListener('keydown', domHandler);

    // Configurer les attributs ARIA initiaux
    container.setAttribute('role', 'tablist');
    container.setAttribute('aria-orientation', 'horizontal');

    return () => {
      container.removeEventListener('keydown', domHandler);
    };
  }, [enabled, handleKeyDown]);

  // Mettre à jour le focus quand l'index actif change
  useEffect(() => {
    if (enabled) {
      updateFocus(activeIndex);
    }
  }, [enabled, activeIndex, updateFocus]);

  // Méthodes de navigation programmatique
  const navigationMethods = {
    goToPrevious: navigatePrevious,
    goToNext: navigateNext,
    goToIndex: onActiveIndexChange,
    activate: activateCurrent,
    focusActive: () => updateFocus(activeIndex)
  };

  return {
    containerRef,
    navigationMethods,
    // Props à appliquer au conteneur
    containerProps: {
      ref: containerRef,
      role: 'tablist',
      'aria-orientation': 'horizontal' as const,
      onKeyDown: handleKeyDown
    },
    // Props à appliquer aux éléments
    getItemProps: (index: number) => ({
      role: 'tab',
      tabIndex: index === activeIndex ? 0 : -1,
      'aria-selected': index === activeIndex,
      id: `nav-item-${index}`,
      'aria-controls': `nav-panel-${index}`
    })
  };
};