"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../config/icons");
const app_1 = require("../../services/app");
const page_layout_1 = require("../../utils/page-layout");
const auth_route_1 = require("../../utils/auth-route");
function getTimestamp(value) {
    if (!value)
        return 0;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}
function formatRowTime(value) {
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
    return `${month}-${day}`;
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
function readPublishAt(item) {
    return String((item === null || item === void 0 ? void 0 : item.publishAt) || (item === null || item === void 0 ? void 0 : item.createdAt) || (item === null || item === void 0 ? void 0 : item.updatedAt) || '');
}
function mapMessage(item) {
    const anyItem = item;
    const type = String(anyItem.type || 'DEFAULT');
    const typeLabel = String((anyItem.typeLabel || (anyItem.categoryName) || ''));
    const imageUrl = readImageUrl(anyItem);
    const summary = readSummary(anyItem);
    const publishAt = readPublishAt(anyItem);
    return {
        receiptId: Number(anyItem.receiptId || anyItem.id || 0),
        type,
        typeLabel,
        title: String(anyItem.title || '').trim(),
        summary,
        imageUrl,
        showImage: Boolean(imageUrl),
        timeText: formatRowTime(publishAt),
        timestamp: getTimestamp(publishAt),
        isRead: !!anyItem.isRead,
        avatarSrc: imageUrl,
        showAvatarImage: Boolean(imageUrl),
        fallbackIconSrc: icons_1.iconPaths.bell,
    };
}
function buildConversations(messages) {
    const groupMap = new Map();
    const sorted = [...messages].sort((a, b) => b.timestamp - a.timestamp);
    sorted.forEach((message) => {
        const key = message.type || message.typeLabel || 'DEFAULT';
        const existing = groupMap.get(key);
        if (existing) {
            existing.unreadCount += message.isRead ? 0 : 1;
            existing.totalCount += 1;
            if (!existing.showAvatarImage && message.showImage) {
                existing.avatarSrc = message.avatarSrc;
                existing.showAvatarImage = true;
            }
            return;
        }
        groupMap.set(key, {
            key,
            type: message.type,
            typeLabel: message.typeLabel || message.type || '公告',
            latestTitle: message.title || message.summary || '',
            latestSummary: message.summary || message.title || '',
            showSummary: Boolean(message.summary) && message.summary !== message.title,
            latestTimeText: message.timeText,
            latestTimestamp: message.timestamp,
            unreadCount: message.isRead ? 0 : 1,
            totalCount: 1,
            avatarSrc: message.avatarSrc,
            showAvatarImage: message.showImage,
            fallbackIconSrc: icons_1.iconPaths.bell,
        });
    });
    return Array.from(groupMap.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
}
Component({
    data: {
        pageStyle: '',
        icons: icons_1.iconPaths,
        loading: false,
        loadingMore: false,
        loadingAction: false,
        groups: [],
        totalUnread: 0,
        footerName: '湾源农仓',
        footerType: '小程序',
        emptyText: '暂无公告',
        page: 1,
        pageSize: 80,
        total: 0,
        noMore: false,
    },
    lifetimes: {
        attached() {
            this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(0) });
        },
    },
    pageLifetimes: {
        show() {
            void this.loadMessages(true);
        },
    },
    methods: {
        onLoad() {
            if (!(0, auth_route_1.ensureCustomerAccess)('/pages/message/message')) {
                return;
            }
        },
        async loadMessages(reset = true) {
            var _a, _b, _c, _d;
            if (this.data.loading || this.data.loadingMore) {
                return;
            }
            const page = reset ? 1 : this.data.page;
            this.setData({ [reset ? 'loading' : 'loadingMore']: true });
            try {
                const response = await (0, app_1.fetchMessageList)({
                    page,
                    pageSize: this.data.pageSize,
                    type: '',
                });
                const messages = ((_a = response.items) !== null && _a !== void 0 ? _a : [])
                    .map(mapMessage)
                    .filter((item) => item.receiptId);
                const mergedMessages = reset ? messages : [...this.data.messages, ...messages];
                const groups = buildConversations(mergedMessages);
                const computedUnread = mergedMessages.reduce((sum, item) => sum + (item.isRead ? 0 : 1), 0);
                this.setData({
                    groups,
                    totalUnread: (_b = response.unreadCount) !== null && _b !== void 0 ? _b : computedUnread,
                    total: (_c = response.total) !== null && _c !== void 0 ? _c : mergedMessages.length,
                    page: page + 1,
                    noMore: mergedMessages.length >= ((_d = response.total) !== null && _d !== void 0 ? _d : mergedMessages.length) || messages.length < this.data.pageSize,
                    loading: false,
                    loadingMore: false,
                });
            }
            catch (_e) {
                this.setData({
                    groups: [],
                    totalUnread: 0,
                    noMore: true,
                    loading: false,
                    loadingMore: false,
                });
            }
        },
        async clearUnread() {
            if (this.data.loadingAction || this.data.totalUnread <= 0) {
                return;
            }
            this.setData({ loadingAction: true });
            try {
                await (0, app_1.markAllMessagesRead)();
                await this.loadMessages(true);
            }
            finally {
                this.setData({ loadingAction: false });
            }
        },
        loadMore() {
            if (this.data.noMore || this.data.loading || this.data.loadingMore) {
                return;
            }
            void this.loadMessages(false);
        },
        openConversation(e) {
            const { type, typeLabel } = e.currentTarget.dataset || {};
            if (!type && !typeLabel) {
                return;
            }
            wx.navigateTo({
                url: `/pages/message/history/history?type=${encodeURIComponent(type || '')}&typeLabel=${encodeURIComponent(typeLabel || '')}`,
            });
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        handleAvatarError(e) {
            const { key } = e.currentTarget.dataset || {};
            if (!key)
                return;
            const index = this.data.groups.findIndex((group) => group.key === key);
            if (index < 0)
                return;
            this.setData({
                [`groups[${index}].avatarSrc`]: '',
                [`groups[${index}].showAvatarImage`]: false,
            });
        },
    },
});
