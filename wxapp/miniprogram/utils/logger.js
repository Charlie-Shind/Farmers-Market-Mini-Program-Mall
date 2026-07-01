"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const index_1 = require("../config/index");
exports.logger = {
    debug: (...args) => {
        if (index_1.APP_ENV === 'dev') {
            console.debug('[DEBUG]', ...args);
        }
    },
    info: (...args) => {
        if (index_1.APP_ENV !== 'prod') {
            console.info('[INFO]', ...args);
        }
    },
    warn: (...args) => {
        console.warn('[WARN]', ...args);
    },
    error: (...args) => {
        console.error('[ERROR]', ...args);
    },
};
