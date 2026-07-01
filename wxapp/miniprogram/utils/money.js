"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMoneyDisplay = formatMoneyDisplay;
function formatMoneyDisplay(value) {
    if (value == null || value === '') {
        return '0.00';
    }
    const normalized = Number(String(value).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(normalized)) {
        return '0.00';
    }
    return normalized.toFixed(2);
}
