import { APP_ENV, RUNTIME_ENV, getEnvLabel } from './config/index';
import { fetchAnonymousSession } from './services/auth';
import { getToken } from './services/token';
import { setGuestMode } from './services/token';
import { logger } from './utils/logger';
import { installPullDownRefresh } from './utils/install-pull-down-refresh';

installPullDownRefresh();

type EventBus = {
  on(event: string, fn: (...args: any[]) => void): void;
  off(event: string, fn: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
};

function createEventBus(): EventBus {
  const listeners: Record<string, Array<(...args: any[]) => void>> = {};
  return {
    on(event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    off(event, fn) {
      const arr = listeners[event];
      if (!arr) return;
      const idx = arr.indexOf(fn);
      if (idx >= 0) arr.splice(idx, 1);
    },
    emit(event, ...args) {
      const arr = listeners[event];
      if (!arr) return;
      arr.slice().forEach((fn) => {
        try {
          fn(...args);
        } catch (err) {
          console.error(`[eventBus] listener for ${event} threw:`, err);
        }
      });
    },
  };
}

App({
  globalData: {
    accessToken: getToken(),
    appEnv: APP_ENV,
    runtimeEnv: RUNTIME_ENV,
    authBootstrapReady: Promise.resolve(),
    eventBus: createEventBus(),
  },
  onLaunch() {
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    logger.info('app launch', {
      appEnv: APP_ENV,
      runtimeEnv: RUNTIME_ENV,
      runtimeLabel: getEnvLabel(RUNTIME_ENV),
      hasToken: Boolean(getToken()),
    });

    this.globalData.authBootstrapReady = getToken()
      ? Promise.resolve()
      : fetchAnonymousSession().catch((error) => {
          logger.warn('anonymous session bootstrap failed, fallback to guest mode', error);
          setGuestMode();
        });
  },
} as any);
