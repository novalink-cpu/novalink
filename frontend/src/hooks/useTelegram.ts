import { useCallback, useEffect, useMemo, useState } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    setText: (text: string) => void;
    setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
  };
  initDataUnsafe?: {
    user?: TelegramUser;
  };
  colorScheme?: 'light' | 'dark';
  themeParams?: Record<string, string>;
  platform?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const webApp = useMemo(() => window.Telegram?.WebApp, []);

  useEffect(() => {
    if (!webApp) {
      setIsReady(true);
      return;
    }

    webApp.ready();
    webApp.expand();
    webApp.disableVerticalSwipes?.();
    webApp.setHeaderColor('#ffffff');
    webApp.setBackgroundColor('#ffffff');
    setIsReady(true);
  }, [webApp]);

  const user = webApp?.initDataUnsafe?.user;
  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ')
    : 'အသုံးပြုသူ';

  const haptic = useCallback(
    (type: 'light' | 'medium' | 'success' | 'error' | 'selection' = 'light') => {
      if (!webApp?.HapticFeedback) return;
      if (type === 'success' || type === 'error') {
        webApp.HapticFeedback.notificationOccurred(type);
        return;
      }
      if (type === 'selection') {
        webApp.HapticFeedback.selectionChanged();
        return;
      }
      webApp.HapticFeedback.impactOccurred(type);
    },
    [webApp],
  );

  const close = useCallback(() => webApp?.close(), [webApp]);

  return {
    webApp,
    isReady,
    user,
    displayName,
    haptic,
    close,
    isTelegram: Boolean(webApp?.initDataUnsafe?.user),
  };
}