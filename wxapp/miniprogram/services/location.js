"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LOCATION_LABEL = void 0;
exports.setReverseGeocodeProvider = setReverseGeocodeProvider;
exports.loadSelectedLocation = loadSelectedLocation;
exports.saveSelectedLocation = saveSelectedLocation;
exports.clearSelectedLocation = clearSelectedLocation;
exports.ensureLocationPermission = ensureLocationPermission;
exports.reverseGeocode = reverseGeocode;
exports.updateAutoLocation = updateAutoLocation;
const LOCATION_STORAGE_KEY = 'selected-location';
exports.DEFAULT_LOCATION_LABEL = '湾源县';
let reverseGeocodeOverride = null;
function setReverseGeocodeProvider(provider) {
    reverseGeocodeOverride = provider;
}
function loadSelectedLocation() {
    var _a, _b;
    try {
        const value = wx.getStorageSync(LOCATION_STORAGE_KEY);
        if (!value || typeof value !== 'object') {
            return null;
        }
        const draft = value;
        if (!draft.source ||
            !draft.name ||
            !Number.isFinite(Number(draft.latitude)) ||
            !Number.isFinite(Number(draft.longitude))) {
            return null;
        }
        return {
            source: draft.source,
            name: String(draft.name),
            address: String((_a = draft.address) !== null && _a !== void 0 ? _a : ''),
            latitude: Number(draft.latitude),
            longitude: Number(draft.longitude),
            updatedAt: Number((_b = draft.updatedAt) !== null && _b !== void 0 ? _b : Date.now()),
        };
    }
    catch {
        return null;
    }
}
function saveSelectedLocation(location) {
    wx.setStorageSync(LOCATION_STORAGE_KEY, location);
}
function clearSelectedLocation() {
    try {
        wx.removeStorageSync(LOCATION_STORAGE_KEY);
    }
    catch {
        // ignore
    }
}
function ensureLocationPermission() {
    return new Promise((resolve, reject) => {
        wx.getSetting({
            success: (res) => {
                if (res.authSetting['scope.userLocation']) {
                    resolve();
                    return;
                }
                wx.authorize({
                    scope: 'scope.userLocation',
                    success: () => resolve(),
                    fail: () => {
                        wx.showModal({
                            title: '需要定位权限',
                            content: '请在设置中允许小程序使用定位权限，以便我们为您提供自动定位服务。',
                            confirmText: '去设置',
                            success: (modalRes) => {
                                if (!modalRes.confirm) {
                                    reject(new Error('user denied permission'));
                                    return;
                                }
                                wx.openSetting({
                                    success: (settingRes) => {
                                        if (settingRes.authSetting['scope.userLocation']) {
                                            resolve();
                                            return;
                                        }
                                        reject(new Error('user denied permission in settings'));
                                    },
                                    fail: reject,
                                });
                            },
                            fail: reject,
                        });
                    },
                });
            },
            fail: reject,
        });
    });
}
function getCurrentGPSLocation() {
    return new Promise((resolve, reject) => {
        const fuzzy = wx.getFuzzyLocation;
        if (typeof fuzzy === 'function') {
            fuzzy({
                type: 'gcj02',
                success: resolve,
                fail: () => {
                    wx.getLocation({
                        type: 'gcj02',
                        success: resolve,
                        fail: reject,
                    });
                },
            });
            return;
        }
        wx.getLocation({
            type: 'gcj02',
            success: resolve,
            fail: reject,
        });
    });
}
function buildFallbackLocation() {
    return {
        name: exports.DEFAULT_LOCATION_LABEL,
        address: exports.DEFAULT_LOCATION_LABEL,
    };
}
async function reverseGeocode(lat, lng) {
    if (reverseGeocodeOverride) {
        return reverseGeocodeOverride(lat, lng);
    }
    return buildFallbackLocation();
}
async function updateAutoLocation() {
    await ensureLocationPermission();
    const gps = await getCurrentGPSLocation();
    const reverse = await reverseGeocode(gps.latitude, gps.longitude);
    const autoLocation = {
        source: 'auto',
        name: reverse.name,
        address: reverse.address,
        latitude: gps.latitude,
        longitude: gps.longitude,
        updatedAt: Date.now(),
    };
    saveSelectedLocation(autoLocation);
    return autoLocation;
}
