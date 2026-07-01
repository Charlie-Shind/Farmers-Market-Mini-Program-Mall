"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRemoteUrl = exports.maskPhone = exports.formatTime = void 0;
const formatTime = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    return ([year, month, day].map(formatNumber).join('/') +
        ' ' +
        [hour, minute, second].map(formatNumber).join(':'));
};
exports.formatTime = formatTime;
const maskPhone = (value) => {
    if (!value) {
        return '';
    }
    const normalized = value.replace(/\s+/g, '');
    if (normalized.length <= 7) {
        return normalized;
    }
    return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
};
exports.maskPhone = maskPhone;
const isRemoteUrl = (value) => {
    if (!value) {
        return false;
    }
    return /^(https?:)?\/\//.test(value);
};
exports.isRemoteUrl = isRemoteUrl;
const formatNumber = (n) => {
    const s = n.toString();
    return s[1] ? s : '0' + s;
};
