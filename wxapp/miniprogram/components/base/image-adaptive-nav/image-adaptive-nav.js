"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
let detectSeq = 0;
function computeThemeFromLuminance(luminance, threshold) {
    const isLight = luminance >= threshold;
    return {
        theme: isLight ? 'light' : 'dark',
        iconColor: isLight ? '#111111' : '#FFFFFF',
    };
}
function getAverageLuminance(imageData, width, height) {
    let sum = 0;
    let count = 0;
    const sampleHeight = Math.max(1, Math.floor(height * 0.38));
    const rowLength = width * 4;
    const sampleStep = 16;
    for (let y = 0; y < sampleHeight; y += 1) {
        const rowStart = y * rowLength;
        for (let x = 0; x < width; x += sampleStep) {
            const idx = rowStart + x * 4;
            const alpha = imageData[idx + 3] / 255;
            if (alpha < 0.2) {
                continue;
            }
            const r = imageData[idx];
            const g = imageData[idx + 1];
            const b = imageData[idx + 2];
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            sum += luminance;
            count += 1;
        }
    }
    return count > 0 ? sum / count : 255;
}
Component({
    properties: {
        imageUrl: {
            type: String,
            value: '',
        },
        mode: {
            type: String,
            value: 'auto',
        },
        showBack: {
            type: Boolean,
            value: true,
        },
        showShare: {
            type: Boolean,
            value: true,
        },
        threshold: {
            type: Number,
            value: 148,
        },
    },
    data: {
        icons: {
            back: icons_1.iconPaths.back,
            share: icons_1.iconPaths.share,
        },
        theme: 'light',
        iconColor: '#111111',
    },
    lifetimes: {
        attached() {
            void this.resolveTheme();
        },
        detached() {
            detectSeq += 1;
        },
    },
    observers: {
        'imageUrl,mode,threshold': function () {
            void this.resolveTheme();
        },
    },
    methods: {
        onBack() {
            this.triggerEvent('back');
        },
        onShare() {
            this.triggerEvent('share');
        },
        async resolveTheme() {
            const seq = ++detectSeq;
            const { mode, imageUrl, threshold } = this.data;
            if (mode === 'light' || mode === 'dark') {
                this.setData({
                    theme: mode,
                    iconColor: mode === 'light' ? '#111111' : '#FFFFFF',
                });
                return;
            }
            if (!imageUrl) {
                this.setData({
                    theme: 'light',
                    iconColor: '#111111',
                });
                return;
            }
            const localPath = await new Promise((resolve, reject) => {
                wx.getImageInfo({
                    src: imageUrl,
                    success: (res) => resolve(res.path),
                    fail: reject,
                });
            }).catch(() => '');
            if (!localPath) {
                this.setData({
                    theme: 'light',
                    iconColor: '#111111',
                });
                return;
            }
            const canvasNode = await new Promise((resolve, reject) => {
                wx.nextTick(() => {
                    const query = this.createSelectorQuery();
                    query
                        .select('#probe-canvas')
                        .fields({ node: true, size: true })
                        .exec((res) => {
                        var _a;
                        const node = (_a = res === null || res === void 0 ? void 0 : res[0]) === null || _a === void 0 ? void 0 : _a.node;
                        if (!node) {
                            reject(new Error('probe canvas not found'));
                            return;
                        }
                        resolve(node);
                    });
                });
            }).catch(() => null);
            if (!canvasNode) {
                this.setData({
                    theme: 'light',
                    iconColor: '#111111',
                });
                return;
            }
            const ctx = canvasNode.getContext('2d');
            const dpr = wx.getSystemInfoSync().pixelRatio || 1;
            const width = 24 * dpr;
            const height = 24 * dpr;
            canvasNode.width = width;
            canvasNode.height = height;
            ctx.clearRect(0, 0, width, height);
            const img = canvasNode.createImage();
            img.onload = () => {
                if (seq !== detectSeq) {
                    return;
                }
                const scale = Math.max(width / img.width, height / img.height);
                const drawWidth = img.width * scale;
                const drawHeight = img.height * scale;
                const dx = (width - drawWidth) / 2;
                const dy = (height - drawHeight) / 2;
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
                const imageData = ctx.getImageData(0, 0, width, height).data;
                const luminance = getAverageLuminance(imageData, width, height);
                const resolved = computeThemeFromLuminance(luminance, threshold);
                this.setData(resolved);
            };
            img.onerror = () => {
                if (seq !== detectSeq) {
                    return;
                }
                this.setData({
                    theme: 'light',
                    iconColor: '#111111',
                });
            };
            img.src = localPath;
        },
    },
});
