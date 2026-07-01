"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../shared/icons/index");
Component({
    properties: {
        name: {
            type: String,
            value: '',
        },
        size: {
            type: String,
            value: '48rpx',
        },
        color: {
            type: String,
            value: '#333333',
        },
        strokeWidth: {
            type: Number,
            value: 2,
        },
        opacity: {
            type: Number,
            value: 1,
        },
    },
    data: {
        dataUri: '',
        wrapStyle: '',
    },
    observers: {
        'name,color,strokeWidth,opacity,size': function () {
            this.refresh();
        },
    },
    lifetimes: {
        attached() {
            this.refresh();
        },
    },
    methods: {
        refresh() {
            const { name, color, strokeWidth, opacity, size } = this.data;
            if (!name) {
                this.setData({ dataUri: '', wrapStyle: `width: ${size}; height: ${size}; opacity: ${opacity};` });
                return;
            }
            const svg = (0, index_1.getIconSvg)(name)
                .replace(/currentColor/g, color)
                .replace(/stroke-width="2"/g, `stroke-width="${strokeWidth}"`);
            const bytes = new Uint8Array(svg.length);
            for (let i = 0; i < svg.length; i++) {
                bytes[i] = svg.charCodeAt(i) & 0xff;
            }
            const base64 = wx.arrayBufferToBase64(bytes.buffer);
            const dataUri = 'data:image/svg+xml;base64,' + base64;
            this.setData({
                dataUri,
                wrapStyle: `width: ${size}; height: ${size}; opacity: ${opacity};`,
            });
            (0, index_1.recordIconUsage)(name);
        },
    },
});
