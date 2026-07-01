"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPageTopStyle = buildPageTopStyle;
exports.buildPageHeaderStyle = buildPageHeaderStyle;
exports.buildHeaderSafeRightStyle = buildHeaderSafeRightStyle;
function buildPageTopStyle(extraGapPx = 4) {
    var _a, _b, _c;
    try {
        const system = wx.getSystemInfoSync();
        const menu = wx.getMenuButtonBoundingClientRect();
        const safeTop = (_c = (_b = (_a = system.safeArea) === null || _a === void 0 ? void 0 : _a.top) !== null && _b !== void 0 ? _b : system.statusBarHeight) !== null && _c !== void 0 ? _c : (menu.top != null ? menu.top : 0);
        const compactGapPx = Math.max(0, extraGapPx - 8);
        const pageTop = Math.max(0, Math.round(safeTop + compactGapPx));
        const safeRight = menu.left != null && system.windowWidth != null
            ? Math.max(24, Math.round(system.windowWidth - menu.left + 12))
            : 112;
        return `--page-top: ${pageTop}px; --header-safe-right: ${safeRight}px;`;
    }
    catch {
        return `--page-top: 40px; --header-safe-right: 112px;`;
    }
}
function buildPageHeaderStyle(extraGapPx = 4, rightGapPx = 12) {
    var _a, _b, _c;
    try {
        const system = wx.getSystemInfoSync();
        const menu = wx.getMenuButtonBoundingClientRect();
        const safeTop = (_c = (_b = (_a = system.safeArea) === null || _a === void 0 ? void 0 : _a.top) !== null && _b !== void 0 ? _b : system.statusBarHeight) !== null && _c !== void 0 ? _c : (menu.top != null ? menu.top : 0);
        const compactGapPx = Math.max(0, extraGapPx - 8);
        const pageTop = Math.max(0, Math.round(safeTop + compactGapPx));
        const safeRight = menu.left != null && system.windowWidth != null
            ? Math.max(24, Math.round(system.windowWidth - menu.left + rightGapPx))
            : 24;
        return `--page-top: ${pageTop}px; --header-safe-right: ${safeRight}px;`;
    }
    catch {
        return `--page-top: 40px; --header-safe-right: 24px;`;
    }
}
function buildHeaderSafeRightStyle(extraGapPx = 12) {
    try {
        const system = wx.getSystemInfoSync();
        const menu = wx.getMenuButtonBoundingClientRect();
        const safeRight = menu.left != null && system.windowWidth != null
            ? Math.max(24, Math.round(system.windowWidth - menu.left + extraGapPx))
            : 24;
        return `--header-safe-right: ${safeRight}px;`;
    }
    catch {
        return `--header-safe-right: 24px;`;
    }
}
