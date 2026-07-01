"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
function decodeParam(value) {
    if (!value)
        return '';
    try {
        return decodeURIComponent(value);
    }
    catch (_a) {
        return value;
    }
}
function getTimestamp(value) {
    if (!value)
        return 0;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}
function formatCenterTime(value) {
    if (!value)
        return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    if (isToday)
        return `${hours}:${minutes}`;
    if (isYesterday)
        return `昨天 ${hours}:${minutes}`;
    return `${month}-${day} ${hours}:${minutes}`;
}
function readContentJson(item) {
    const json = item === null || item === void 0 ? void 0 : item.contentJson;
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
function readImageUrl(item) {
    const contentJson = readContentJson(item);
    const blocks = Array.isArray(contentJson === null || contentJson === void 0 ? void 0 : contentJson.blocks) ? contentJson.blocks : [];
    const imageBlock = blocks.find((block) => (block === null || block === void 0 ? void 0 : block.type) === 'image' && ((block === null || block === void 0 ? void 0 : block.url) || (block === null || block === void 0 ? void 0 : block.value)));
    return ((item === null || item === void 0 ? void 0 : item.coverImageUrl) ||
        (item === null || item === void 0 ? void 0 : item.imageUrl) ||
        (item === null || item === void 0 ? void 0 : item.image) ||
        (item === null || item === void 0 ? void 0 : item.picUrl) ||
        (contentJson === null || contentJson === void 0 ? void 0 : contentJson.imageUrl) ||
        (contentJson === null || contentJson === void 0 ? void 0 : contentJson.image) ||
        (imageBlock === null || imageBlock === void 0 ? void 0 : imageBlock.url) ||
        (imageBlock === null || imageBlock === void 0 ? void 0 : imageBlock.value) ||
        '').toString().trim();
}
function readSummary(item) {
    const contentJson = readContentJson(item);
    const blocks = Array.isArray(contentJson === null || contentJson === void 0 ? void 0 : contentJson.blocks) ? contentJson.blocks : [];
    const textBlock = blocks.find((block) => (block === null || block === void 0 ? void 0 : block.type) === 'text' && ((block === null || block === void 0 ? void 0 : block.value) || (block === null || block === void 0 ? void 0 : block.text) || (block === null || block === void 0 ? void 0 : block.content)));
    const text = (item === null || item === void 0 ? void 0 : item.summary) ||
        (contentJson === null || contentJson === void 0 ? void 0 : contentJson.summary) ||
        (textBlock === null || textBlock === void 0 ? void 0 : textBlock.value) ||
        (textBlock === null || textBlock === void 0 ? void 0 : textBlock.text) ||
        (textBlock === null || textBlock === void 0 ? void 0 : textBlock.content) ||
        (item === null || item === void 0 ? void 0 : item.content) ||
        (item === null || item === void 0 ? void 0 : item.contentText) ||
        (item === null || item === void 0 ? void 0 : item.title) ||
        '';
    return String(text || '').trim();
}
function readContent(item) {
    const contentJson = readContentJson(item);
    const blocks = Array.isArray(contentJson === null || contentJson === void 0 ? void 0 : contentJson.blocks) ? contentJson.blocks : [];
    const textBlock = blocks.find((block) => (block === null || block === void 0 ? void 0 : block.type) === 'text' && ((block === null || block === void 0 ? void 0 : block.value) || (block === null || block === void 0 ? void 0 : block.text) || (block === null || block === void 0 ? void 0 : block.content)));
    return String((item === null || item === void 0 ? void 0 : item.content) ||
        (item === null || item === void 0 ? void 0 : item.contentText) ||
        (contentJson === null || contentJson === void 0 ? void 0 : contentJson.content) ||
        (textBlock === null || textBlock === void 0 ? void 0 : textBlock.value) ||
        (textBlock === null || textBlock === void 0 ? void 0 : textBlock.text) ||
        (textBlock === null || textBlock === void 0 ? void 0 : textBlock.content) ||
        '').trim();
}
function readPublisherAvatar(item) {
    return String((item === null || item === void 0 ? void 0 : item.senderAvatar) || (item === null || item === void 0 ? void 0 : item.coverImageUrl) || (item === null || item === void 0 ? void 0 : item.imageUrl) || '').trim();
}
function readPublishAt(item) {
    return String((item === null || item === void 0 ? void 0 : item.publishAt) || (item === null || item === void 0 ? void 0 : item.createdAt) || (item === null || item === void 0 ? void 0 : item.updatedAt) || '');
}
function mapNotice(item) {
    const anyItem = item;
    const imageUrl = readImageUrl(anyItem);
    const summary = readSummary(anyItem);
    const content = readContent(anyItem);
    const publishAt = readPublishAt(anyItem);
    const publisherAvatar = readPublisherAvatar(anyItem);
    const title = String(anyItem.title || '').trim() || summary;
    return {
        receiptId: Number(anyItem.receiptId || anyItem.id || 0),
        title,
        summary,
        showSummary: Boolean(summary) && summary !== title,
        content,
        showContent: Boolean(content) && content !== summary,
        imageUrl,
        showImage: Boolean(imageUrl),
        timeText: formatCenterTime(publishAt),
        timestamp: getTimestamp(publishAt),
        isRead: !!anyItem.isRead,
        publisherAvatar,
        showPublisherAvatar: Boolean(publisherAvatar),
        fallbackIconSrc: icons_1.iconPaths.bell,
    };
}
Component({
    data: {
        pageStyle: '',
        icons: icons_1.iconPaths,
        type: '',
        typeLabel: '公告',
        publisherName: '湾源农仓公告',
        footerName: '湾源农仓',
        footerType: '小程序',
        loading: false,
        loadingMore: false,
        messages: [],
        emptyText: '暂无公告',
        page: 1,
        pageSize: 20,
        total: 0,
        noMore: false,
    },
    lifetimes: {
        attached() {
            this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(0) });
        },
    },
    methods: {
        onLoad(options) {
            const type = decodeParam(options === null || options === void 0 ? void 0 : options.type);
            const typeLabel = decodeParam(options === null || options === void 0 ? void 0 : options.typeLabel);
            if (!(0, auth_route_1.ensureCustomerAccess)(`/pages/message/history/history?type=${encodeURIComponent(type)}&typeLabel=${encodeURIComponent(typeLabel)}`)) {
                return;
            }
            this.setData({
                type,
                typeLabel: typeLabel || '公告',
                page: 1,
                noMore: false,
                messages: [],
            });
            void this.loadMessages(true);
        },
        async loadMessages(reset = true) {
            var _a, _b, _c;
            if (this.data.loading || this.data.loadingMore) {
                return;
            }
            const page = reset ? 1 : this.data.page;
            this.setData({ [reset ? 'loading' : 'loadingMore']: true });
            try {
                const response = await (0, app_1.fetchMessageList)({
                    page,
                    pageSize: this.data.pageSize,
                    type: this.data.type,
                });
                const messages = ((_a = response.items) !== null && _a !== void 0 ? _a : [])
                    .map(mapNotice)
                    .filter((item) => item.receiptId)
                    .sort((a, b) => b.timestamp - a.timestamp);
                const mergedMessages = reset
                    ? messages
                    : [...this.data.messages, ...messages].sort((a, b) => b.timestamp - a.timestamp);
                this.setData({
                    messages: mergedMessages,
                    total: (_b = response.total) !== null && _b !== void 0 ? _b : mergedMessages.length,
                    page: page + 1,
                    noMore: mergedMessages.length >= ((_c = response.total) !== null && _c !== void 0 ? _c : mergedMessages.length) || messages.length < this.data.pageSize,
                    loading: false,
                    loadingMore: false,
                });
            }
            catch (_d) {
                this.setData({
                    messages: [],
                    noMore: true,
                    loading: false,
                    loadingMore: false,
                });
            }
        },
        loadMore() {
            if (this.data.noMore || this.data.loading || this.data.loadingMore) {
                return;
            }
            void this.loadMessages(false);
        },
        openMessage(e) {
            const { receiptId } = e.currentTarget.dataset || {};
            if (!receiptId)
                return;
            wx.navigateTo({
                url: '/pages/message/view/view?receiptId=' + receiptId,
            });
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
        handleAvatarError(e) {
            const { index } = e.currentTarget.dataset || {};
            const cardIndex = Number(index);
            if (Number.isNaN(cardIndex))
                return;
            this.setData({
                [`messages[${cardIndex}].publisherAvatar`]: '',
                [`messages[${cardIndex}].showPublisherAvatar`]: false,
            });
        },
        handleImageError(e) {
            const { index } = e.currentTarget.dataset || {};
            const cardIndex = Number(index);
            if (Number.isNaN(cardIndex))
                return;
            this.setData({
                [`messages[${cardIndex}].imageUrl`]: '',
                [`messages[${cardIndex}].showImage`]: false,
            });
        },
    },
});
