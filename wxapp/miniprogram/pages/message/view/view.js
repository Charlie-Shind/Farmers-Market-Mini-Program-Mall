"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
function formatDateTime(value) {
    if (!value)
        return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function readContentJson(detail) {
    const json = detail === null || detail === void 0 ? void 0 : detail.contentJson;
    if (!json)
        return null;
    if (typeof json === 'string') {
        try {
            return JSON.parse(json);
        }
        catch (_a) {
            return null;
        }
    }
    return json;
}
function readImageUrl(detail) {
    const contentJson = readContentJson(detail);
    const blocks = Array.isArray(contentJson === null || contentJson === void 0 ? void 0 : contentJson.blocks) ? contentJson.blocks : [];
    const imageBlock = blocks.find((block) => (block === null || block === void 0 ? void 0 : block.type) === 'image' && ((block === null || block === void 0 ? void 0 : block.url) || (block === null || block === void 0 ? void 0 : block.value)));
    return ((detail === null || detail === void 0 ? void 0 : detail.coverImageUrl) ||
        (detail === null || detail === void 0 ? void 0 : detail.imageUrl) ||
        (detail === null || detail === void 0 ? void 0 : detail.image) ||
        (detail === null || detail === void 0 ? void 0 : detail.picUrl) ||
        (detail === null || detail === void 0 ? void 0 : detail.senderAvatar) ||
        (contentJson === null || contentJson === void 0 ? void 0 : contentJson.imageUrl) ||
        (contentJson === null || contentJson === void 0 ? void 0 : contentJson.image) ||
        (imageBlock === null || imageBlock === void 0 ? void 0 : imageBlock.url) ||
        (imageBlock === null || imageBlock === void 0 ? void 0 : imageBlock.value) ||
        '').toString().trim();
}
function readContentText(detail) {
    const contentJson = readContentJson(detail);
    const blocks = Array.isArray(contentJson === null || contentJson === void 0 ? void 0 : contentJson.blocks) ? contentJson.blocks : [];
    const textBlock = blocks.find((block) => (block === null || block === void 0 ? void 0 : block.type) === 'text' && ((block === null || block === void 0 ? void 0 : block.value) || (block === null || block === void 0 ? void 0 : block.text) || (block === null || block === void 0 ? void 0 : block.content)));
    return String((detail === null || detail === void 0 ? void 0 : detail.content) ||
        (detail === null || detail === void 0 ? void 0 : detail.contentText) ||
        (contentJson === null || contentJson === void 0 ? void 0 : contentJson.content) ||
        (textBlock === null || textBlock === void 0 ? void 0 : textBlock.value) ||
        (textBlock === null || textBlock === void 0 ? void 0 : textBlock.text) ||
        (textBlock === null || textBlock === void 0 ? void 0 : textBlock.content) ||
        '').trim();
}
function buildBlocks(detail) {
    const contentJson = readContentJson(detail);
    const sourceBlocks = Array.isArray(contentJson === null || contentJson === void 0 ? void 0 : contentJson.blocks) ? contentJson.blocks : [];
    const blocks = [];
    sourceBlocks.forEach((block) => {
        if ((block === null || block === void 0 ? void 0 : block.type) === 'text') {
            const value = block.value || block.text || block.content || '';
            if (value) {
                blocks.push({ type: 'text', value });
            }
        }
        if ((block === null || block === void 0 ? void 0 : block.type) === 'image') {
            const url = block.url || block.value || '';
            if (url) {
                blocks.push({ type: 'image', url, alt: block.alt || '' });
            }
        }
    });
    if (!blocks.some((block) => block.type === 'text')) {
        const content = readContentText(detail);
        if (content) {
            blocks.unshift({ type: 'text', value: content });
        }
    }
    const imageUrl = readImageUrl(detail);
    if (imageUrl && !blocks.some((block) => block.type === 'image' && block.url === imageUrl)) {
        blocks.push({ type: 'image', url: imageUrl });
    }
    if (!blocks.length) {
        const fallback = (detail === null || detail === void 0 ? void 0 : detail.summary) || (detail === null || detail === void 0 ? void 0 : detail.title) || '';
        if (fallback) {
            blocks.push({ type: 'text', value: fallback });
        }
    }
    return blocks;
}
function resolvePublisherName(detail) {
    return String((detail === null || detail === void 0 ? void 0 : detail.senderNickname) || '湾源农仓公告');
}
function resolveAvatar(detail) {
    return String((detail === null || detail === void 0 ? void 0 : detail.senderAvatar) || (detail === null || detail === void 0 ? void 0 : detail.coverImageUrl) || (detail === null || detail === void 0 ? void 0 : detail.imageUrl) || '').trim();
}
Component({
    data: {
        pageStyle: '',
        icons: icons_1.iconPaths,
        loading: true,
        message: null,
        publisherName: '湾源农仓公告',
        displayTitle: '',
        summaryText: '',
        senderAvatarSrc: '',
        showSenderAvatarImage: false,
        senderFallbackIconSrc: icons_1.iconPaths.bell,
        blocks: [],
        publishTimeText: '',
    },
    lifetimes: {
        attached() {
            this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(0) });
        },
    },
    methods: {
        onLoad(options) {
            var _a;
            const receiptId = Number((_a = options === null || options === void 0 ? void 0 : options.receiptId) !== null && _a !== void 0 ? _a : 0);
            if (!(0, auth_route_1.ensureCustomerAccess)(`/pages/message/view/view?receiptId=${receiptId}`)) {
                return;
            }
            void this.loadDetail(receiptId);
        },
        async loadDetail(receiptId) {
            if (!receiptId) {
                this.setData({ loading: false });
                return;
            }
            this.setData({ loading: true });
            try {
                const detail = await (0, app_1.fetchMessageDetail)(receiptId);
                const avatar = resolveAvatar(detail);
                this.setData({
                    message: { ...detail, isRead: true },
                    publisherName: resolvePublisherName(detail),
                    displayTitle: String((detail === null || detail === void 0 ? void 0 : detail.title) || (detail === null || detail === void 0 ? void 0 : detail.summary) || '').trim(),
                    summaryText: String((detail === null || detail === void 0 ? void 0 : detail.summary) || '').trim(),
                    senderAvatarSrc: avatar,
                    showSenderAvatarImage: Boolean(avatar),
                    senderFallbackIconSrc: icons_1.iconPaths.bell,
                    blocks: buildBlocks(detail),
                    publishTimeText: formatDateTime(detail === null || detail === void 0 ? void 0 : detail.publishAt),
                    loading: false,
                });
                if (!(detail === null || detail === void 0 ? void 0 : detail.isRead)) {
                    void (0, app_1.markMessageRead)(receiptId).catch(() => { });
                }
            }
            catch (_a) {
                this.setData({
                    loading: false,
                    message: null,
                });
            }
        },
        previewImage(e) {
            const { url } = e.currentTarget.dataset || {};
            if (!url)
                return;
            wx.previewImage({ urls: [url], current: url });
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        handleAvatarError() {
            this.setData({
                senderAvatarSrc: '',
                showSenderAvatarImage: false,
            });
        },
    },
});
