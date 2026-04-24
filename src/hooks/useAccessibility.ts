import { useEffect, useRef } from 'react';

interface AccessibilityHook {
  announceToScreenReader: (message: string) => void;
  setFocus: (element: HTMLElement | null) => void;
  handleKeyboardNavigation: (event: KeyboardEvent, handlers: KeyboardHandlers) => void;
  generateUniqueId: () => string;
}

interface KeyboardHandlers {
  onEnter?: () => void;
  onEscape?: () => void;
  onSpace?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (forward: boolean) => void;
}

export const useAccessibility = (): AccessibilityHook => {
  const announcementRef = useRef<HTMLDivElement>(null);

  // Initialize live region for screen reader announcements
  useEffect(() => {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('class', 'sr-only');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    
    document.body.appendChild(liveRegion);
    announcementRef.current = liveRegion;

    return () => {
      if (document.body.contains(liveRegion)) {
        document.body.removeChild(liveRegion);
      }
    };
  }, []);

  const announceToScreenReader = (message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  const setFocus = (element: HTMLElement | null) => {
    if (element) {
      element.focus();
      const announcement = element.getAttribute('aria-label') || 
                          element.getAttribute('title') || 
                          element.textContent || 
                          'Element focused';
      announceToScreenReader(announcement);
    }
  };

  const handleKeyboardNavigation = (event: KeyboardEvent, handlers: KeyboardHandlers) => {
    switch (event.key) {
      case 'Enter':
        if (handlers.onEnter) {
          event.preventDefault();
          handlers.onEnter();
        }
        break;
      case ' ':
      case 'Spacebar':
        if (handlers.onSpace) {
          event.preventDefault();
          handlers.onSpace();
        }
        break;
      case 'Escape':
        if (handlers.onEscape) {
          event.preventDefault();
          handlers.onEscape();
        }
        break;
      case 'ArrowUp':
        if (handlers.onArrowUp) {
          event.preventDefault();
          handlers.onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (handlers.onArrowDown) {
          event.preventDefault();
          handlers.onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (handlers.onArrowLeft) {
          event.preventDefault();
          handlers.onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (handlers.onArrowRight) {
          event.preventDefault();
          handlers.onArrowRight();
        }
        break;
      case 'Tab':
        if (handlers.onTab) {
          handlers.onTab(!event.shiftKey);
        }
        break;
    }
  };

  const generateUniqueId = () => {
    return `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  return {
    announceToScreenReader,
    setFocus,
    handleKeyboardNavigation,
    generateUniqueId
  };
};

