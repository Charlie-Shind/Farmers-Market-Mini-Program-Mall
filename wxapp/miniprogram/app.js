"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./config/index");
const auth_1 = require("./services/auth");
const token_1 = require("./services/token");
const token_2 = require("./services/token");
const logger_1 = require("./utils/logger");
function createEventBus() {
    const listeners = {};
    return {
        on(event, fn) {
            if (!listeners[event])
                listeners[event] = [];
            listeners[event].push(fn);
        },
        off(event, fn) {
            const arr = listeners[event];
            if (!arr)
                return;
            const idx = arr.indexOf(fn);
            if (idx >= 0)
                arr.splice(idx, 1);
        },
        emit(event, ...args) {
            const arr = listeners[event];
            if (!arr)
                return;
            arr.slice().forEach((fn) => {
                try {
                    fn(...args);
                }
                catch (err) {
                    console.error(`[eventBus] listener for ${event} threw:`, err);
                }
            });
        },
    };
}
App({
    globalData: {
        accessToken: (0, token_1.getToken)(),
        appEnv: index_1.APP_ENV,
        runtimeEnv: index_1.RUNTIME_ENV,
        authBootstrapReady: Promise.resolve(),
        eventBus: createEventBus(),
    },
    onLaunch() {
        const logs = wx.getStorageSync('logs') || [];
        logs.unshift(Date.now());
        wx.setStorageSync('logs', logs);
        logger_1.logger.info('app launch', {
            appEnv: index_1.APP_ENV,
            runtimeEnv: index_1.RUNTIME_ENV,
            runtimeLabel: (0, index_1.getEnvLabel)(index_1.RUNTIME_ENV),
            hasToken: Boolean((0, token_1.getToken)()),
        });
        this.globalData.authBootstrapReady = (0, token_1.getToken)()
            ? Promise.resolve()
            : (0, auth_1.fetchAnonymousSession)().catch((error) => {
                logger_1.logger.warn('anonymous session bootstrap failed, fallback to guest mode', error);
                (0, token_2.setGuestMode)();
            });
    },
});
