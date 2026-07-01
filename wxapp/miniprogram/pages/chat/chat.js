"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../config/icons");
const app_1 = require("../../services/app");
const merchant_1 = require("../../services/merchant");
const page_layout_1 = require("../../utils/page-layout");
const token_1 = require("../../services/token");
const auth_route_1 = require("../../utils/auth-route");
const request_1 = require("../../services/request");
const PAGE_SIZE = 30;
const TIME_NODE_GAP_MS = 5 * 60 * 1000;
function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
}
function parseDateTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function safeDecodeText(value) {
    const raw = String(value !== null && value !== void 0 ? value : '').trim();
    if (!raw) {
        return '';
    }
    try {
        return decodeURIComponent(raw);
    }
    catch {
        return raw;
    }
}
function buildSceneText(sceneLabel, sceneSource) {
    const label = safeDecodeText(sceneLabel);
    const source = safeDecodeText(sceneSource);
    if (label && source) {
        return `${label} · ${source}`;
    }
    return label || source || '在线客服';
}
function normalizeMessageTimeline(messages) {
    const sorted = [...messages].sort((a, b) => {
        var _a, _b, _c, _d;
        const left = (_b = (_a = parseDateTime(a.createdAt)) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : 0;
        const right = (_d = (_c = parseDateTime(b.createdAt)) === null || _c === void 0 ? void 0 : _c.getTime()) !== null && _d !== void 0 ? _d : 0;
        return left - right;
    });
    return sorted.map((message, index) => {
        var _a, _b, _c, _d;
        const currentTime = (_b = (_a = parseDateTime(message.createdAt)) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : 0;
        const previousTime = index > 0 ? (_d = (_c = parseDateTime(sorted[index - 1].createdAt)) === null || _c === void 0 ? void 0 : _c.getTime()) !== null && _d !== void 0 ? _d : 0 : 0;
        return {
            ...message,
            displayTime: formatDateTime(message.createdAt),
            showTime: index === 0 || currentTime - previousTime >= TIME_NODE_GAP_MS,
        };
    });
}
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        role: 'buyer',
        conversations: [],
        activeConversationId: 0,
        activeConversation: null,
        conversationTitle: '联系客服',
        conversationSubtitle: '在线客服',
        conversationAvatar: icons_1.iconPaths.defaultAvatar,
        currentUserAvatar: icons_1.iconPaths.defaultAvatar,
        currentUserName: '我',
        messages: [],
        loading: true,
        loadingConversations: false,
        loadingMessages: false,
        sending: false,
        messageText: '',
        page: 1,
        hasMore: true,
        unreadCount: 0,
        pageHint: '正在打开客服会话…',
        messageAnchorId: 'chat-bottom',
        isReadingHistory: false,
        lastMessageScrollTop: 0,
        merchantId: 0,
        productId: 0,
        orderNo: '',
        sceneType: '',
        sceneLabel: '',
        sceneSource: '',
        requestedConversationId: 0,
        requestedOrderNo: '',
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
            this.pollTimer = null;
            this.ignoreNextMessageScroll = false;
        },
        detached() {
            this.stopPolling();
        },
    },
    pageLifetimes: {
        show() {
            if (this.data.role === 'merchant') {
                if (this.data.activeConversationId > 0) {
                    this.startPolling();
                    void this.refreshUnreadCount();
                    return;
                }
                void this.loadMerchantConversations();
                return;
            }
            if (this.data.activeConversationId > 0) {
                this.startPolling();
                void this.refreshUnreadCount();
                return;
            }
            void this.bootstrapBuyerConversation();
        },
        hide() {
            this.stopPolling();
        },
    },
    methods: {
        onLoad(options) {
            var _a, _b, _c, _d;
            const role = (0, token_1.getAuthUserRole)() === 'MERCHANT' ? 'merchant' : 'buyer';
            this.setData({
                role,
                merchantId: Number((_a = options === null || options === void 0 ? void 0 : options.merchantId) !== null && _a !== void 0 ? _a : 0),
                productId: Number((_b = options === null || options === void 0 ? void 0 : options.productId) !== null && _b !== void 0 ? _b : 0),
                orderNo: safeDecodeText(options === null || options === void 0 ? void 0 : options.orderNo),
                requestedConversationId: Number((_c = options === null || options === void 0 ? void 0 : options.conversationId) !== null && _c !== void 0 ? _c : 0),
                requestedOrderNo: safeDecodeText(options === null || options === void 0 ? void 0 : options.orderNo),
                sceneType: String((_d = options === null || options === void 0 ? void 0 : options.sceneType) !== null && _d !== void 0 ? _d : '').trim().toUpperCase(),
                sceneLabel: safeDecodeText(options === null || options === void 0 ? void 0 : options.sceneLabel),
                sceneSource: safeDecodeText(options === null || options === void 0 ? void 0 : options.sceneSource),
            });
            void this.loadCurrentUserProfile();
        },
        async loadCurrentUserProfile() {
            var _a, _b;
            try {
                const me = await (0, app_1.fetchMe)();
                this.setData({
                    currentUserAvatar: ((_a = me.profile) === null || _a === void 0 ? void 0 : _a.avatarUrl) || me.user.avatarUrl || icons_1.iconPaths.defaultAvatar,
                    currentUserName: ((_b = me.profile) === null || _b === void 0 ? void 0 : _b.nickname) || me.user.nickname || '我',
                });
            }
            catch {
                this.setData({
                    currentUserAvatar: icons_1.iconPaths.defaultAvatar,
                    currentUserName: '我',
                });
            }
        },
        normalizeConversation(conversation, role) {
            const counterpartName = role === 'merchant' ? conversation.buyerName : conversation.merchantName;
            const counterpartAvatar = role === 'merchant' ? conversation.buyerAvatar : conversation.merchantLogo;
            const sceneLabel = safeDecodeText(conversation.sceneLabel);
            const sceneSource = safeDecodeText(conversation.sceneSource);
            const displayScene = buildSceneText(sceneLabel, sceneSource);
            return {
                ...conversation,
                displayName: counterpartName || displayScene,
                displayAvatar: counterpartAvatar || icons_1.iconPaths.defaultAvatar,
                displaySubtitle: displayScene,
                displayScene,
                displayTime: formatDateTime(conversation.lastMessageAt),
            };
        },
        async loadMerchantConversations() {
            this.setData({
                loading: true,
                loadingConversations: true,
                pageHint: '正在加载会话列表…',
            });
            try {
                const conversations = await (0, merchant_1.fetchMerchantChats)();
                const normalized = (conversations || []).map((conversation) => this.normalizeConversation(conversation, 'merchant'));
                this.setData({
                    conversations: normalized,
                    activeConversationId: 0,
                    activeConversation: null,
                    conversationTitle: '会话列表',
                    conversationSubtitle: '商户客服会话',
                    conversationAvatar: icons_1.iconPaths.defaultAvatar,
                    loading: false,
                    loadingConversations: false,
                    pageHint: normalized.length ? '' : '暂无会话',
                });
                void this.refreshUnreadCount();
                if (this.data.requestedConversationId > 0) {
                    const target = normalized.find((item) => item.conversationId === this.data.requestedConversationId);
                    if (target) {
                        await this.openConversation(target);
                    }
                    this.setData({ requestedConversationId: 0 });
                }
                else if (this.data.requestedOrderNo) {
                    const target = normalized.find((item) => item.orderNo === this.data.requestedOrderNo);
                    if (target) {
                        await this.openConversation(target);
                    }
                    this.setData({ requestedOrderNo: '' });
                }
            }
            catch (error) {
                console.error('Failed to load merchant conversations:', error);
                this.setData({
                    conversations: [],
                    loading: false,
                    loadingConversations: false,
                    pageHint: '会话列表加载失败，请稍后重试',
                });
            }
        },
        async bootstrapBuyerConversation() {
            this.setData({
                loading: true,
                pageHint: '正在打开客服会话…',
            });
            try {
                if (this.data.role === 'merchant') {
                    await this.loadMerchantConversations();
                    return;
                }
                const target = this.data.merchantId > 0
                    ? {
                        merchantId: this.data.merchantId,
                        merchantName: '',
                        merchantLogo: '',
                        hotline: '',
                        source: 'CONFIGURED',
                        sceneType: 'GENERAL',
                        sceneLabel: '',
                        sceneSource: '',
                    }
                    : await (0, app_1.fetchChatSupportTarget)();
                const sceneType = (this.data.sceneType || target.sceneType || (this.data.orderNo ? 'ORDER' : this.data.productId > 0 ? 'PRODUCT' : 'GENERAL'));
                const opened = await (0, app_1.openChatConversation)({
                    merchantId: sceneType === 'OFFICIAL' ? undefined : target.merchantId,
                    productId: this.data.productId > 0 ? this.data.productId : undefined,
                    orderNo: this.data.orderNo || undefined,
                    sceneType,
                    sceneLabel: this.data.sceneLabel || target.sceneLabel || undefined,
                    sceneSource: this.data.sceneSource || target.sceneSource || undefined,
                });
                const conversation = this.normalizeConversation(opened, 'buyer');
                this.setData({
                    activeConversationId: conversation.conversationId,
                    activeConversation: conversation,
                    conversationTitle: conversation.displayName,
                    conversationSubtitle: conversation.displaySubtitle,
                    conversationAvatar: conversation.displayAvatar || icons_1.iconPaths.defaultAvatar,
                    loading: false,
                    pageHint: '',
                    page: 1,
                    hasMore: true,
                    messages: [],
                    isReadingHistory: false,
                    lastMessageScrollTop: 0,
                });
                await this.loadMessages(conversation.conversationId, true);
                await this.refreshUnreadCount();
                this.startPolling();
            }
            catch (error) {
                console.error('Failed to open chat conversation:', error);
                this.setData({
                    loading: false,
                    pageHint: '客服暂时不可用，请稍后重试',
                });
                this.stopPolling();
            }
        },
        async openConversation(conversation) {
            this.stopPolling();
            this.setData({
                activeConversationId: conversation.conversationId,
                activeConversation: conversation,
                conversationTitle: conversation.displayName,
                conversationSubtitle: conversation.displaySubtitle,
                conversationAvatar: conversation.displayAvatar || icons_1.iconPaths.defaultAvatar,
                messages: [],
                loading: false,
                loadingMessages: true,
                page: 1,
                hasMore: true,
                pageHint: '',
                isReadingHistory: false,
                lastMessageScrollTop: 0,
            });
            await this.loadMessages(conversation.conversationId, true);
            await this.refreshUnreadCount();
            this.startPolling();
        },
        async loadMessages(conversationId, reset = false, pageOverride) {
            var _a, _b;
            if (!conversationId) {
                return;
            }
            const currentPage = pageOverride !== null && pageOverride !== void 0 ? pageOverride : (reset ? 1 : this.data.page);
            if (reset) {
                this.setData({
                    page: 1,
                    hasMore: true,
                    messages: [],
                });
            }
            this.setData({
                loadingMessages: true,
            });
            try {
                const loader = this.data.role === 'merchant' ? merchant_1.fetchMerchantChatMessages : app_1.fetchChatMessages;
                const response = await loader(conversationId, {
                    page: currentPage,
                    pageSize: PAGE_SIZE,
                });
                const items = ((_a = response.items) !== null && _a !== void 0 ? _a : []).map((message) => ({
                    ...message,
                    displayTime: formatDateTime(message.createdAt),
                    showTime: false,
                }));
                const normalizedItems = normalizeMessageTimeline(items);
                this.setData({
                    messages: reset ? normalizedItems : normalizeMessageTimeline([...items, ...this.data.messages]),
                    hasMore: ((_b = response.total) !== null && _b !== void 0 ? _b : 0) > currentPage * PAGE_SIZE,
                });
                if (reset) {
                    void this.markRead(conversationId);
                    this.scrollToLatest();
                }
            }
            finally {
                this.setData({
                    loadingMessages: false,
                });
            }
        },
        async markRead(conversationId) {
            try {
                if (this.data.role === 'merchant') {
                    await (0, merchant_1.markMerchantChatRead)(conversationId);
                }
                else {
                    await (0, app_1.markChatConversationRead)(conversationId);
                }
                await this.refreshUnreadCount();
            }
            catch {
                // Ignore read sync failures.
            }
        },
        async refreshUnreadCount() {
            var _a;
            try {
                const unread = this.data.role === 'merchant'
                    ? await (0, merchant_1.fetchMerchantChatUnreadCount)()
                    : await (0, app_1.fetchChatUnreadCount)();
                this.setData({
                    unreadCount: (_a = unread.unreadCount) !== null && _a !== void 0 ? _a : 0,
                });
            }
            catch {
                // Ignore unread sync failures.
            }
        },
        onInput(e) {
            this.setData({
                messageText: e.detail.value,
            });
        },
        async sendMessage() {
            const conversationId = this.data.activeConversationId;
            const content = this.data.messageText.trim();
            if (!conversationId || !content || this.data.sending) {
                return;
            }
            this.setData({
                sending: true,
            });
            try {
                const sender = this.data.role === 'merchant' ? merchant_1.sendMerchantChatMessage : app_1.sendChatMessage;
                const message = await sender(conversationId, {
                    content,
                    contentType: 'TEXT',
                });
                this.setData({
                    messageText: '',
                    messages: normalizeMessageTimeline([...this.data.messages, { ...message, displayTime: formatDateTime(message.createdAt), showTime: false }]),
                    isReadingHistory: false,
                    lastMessageScrollTop: 0,
                });
                await this.refreshUnreadCount();
                this.scrollToLatest();
            }
            finally {
                this.setData({
                    sending: false,
                });
            }
        },
        async chooseAndSendImage() {
            const conversationId = this.data.activeConversationId;
            if (!conversationId || this.data.sending) {
                return;
            }
            wx.chooseMedia({
                count: 1,
                mediaType: ['image'],
                sourceType: ['album', 'camera'],
                success: async (res) => {
                    var _a;
                    const tempFilePath = (_a = res.tempFiles[0]) === null || _a === void 0 ? void 0 : _a.tempFilePath;
                    if (!tempFilePath) {
                        return;
                    }
                    wx.showLoading({ title: '正在发送图片…', mask: true });
                    this.setData({ sending: true });
                    try {
                        const uploaded = await (0, request_1.upload)({
                            url: '/files/upload',
                            filePath: tempFilePath,
                            name: 'file',
                        });
                        const imageUrl = uploaded === null || uploaded === void 0 ? void 0 : uploaded.url;
                        if (!imageUrl) {
                            throw new Error('Upload failed');
                        }
                        const sender = this.data.role === 'merchant' ? merchant_1.sendMerchantChatMessage : app_1.sendChatMessage;
                        const message = await sender(conversationId, {
                            content: '[图片]',
                            contentType: 'IMAGE',
                            attachments: {
                                imageUrl,
                            },
                        });
                        this.setData({
                            messages: normalizeMessageTimeline([...this.data.messages, { ...message, displayTime: formatDateTime(message.createdAt), showTime: false }]),
                            isReadingHistory: false,
                            lastMessageScrollTop: 0,
                        });
                        await this.refreshUnreadCount();
                        this.scrollToLatest();
                    }
                    catch (error) {
                        console.error('Failed to send image:', error);
                        wx.showToast({ title: '图片发送失败', icon: 'none' });
                    }
                    finally {
                        wx.hideLoading();
                        this.setData({ sending: false });
                    }
                },
            });
        },
        async loadMore() {
            if (!this.data.activeConversationId || !this.data.hasMore || this.data.loadingMessages) {
                return;
            }
            const nextPage = this.data.page + 1;
            this.setData({
                page: nextPage,
            });
            await this.loadMessages(this.data.activeConversationId, false, nextPage);
        },
        scrollToLatest() {
            this.ignoreNextMessageScroll = true;
            this.setData({
                messageAnchorId: `chat-bottom-${Date.now()}`,
            });
        },
        onMessageScroll(e) {
            var _a, _b;
            if (this.ignoreNextMessageScroll) {
                this.ignoreNextMessageScroll = false;
                return;
            }
            const scrollTop = Number((_b = (_a = e.detail) === null || _a === void 0 ? void 0 : _a.scrollTop) !== null && _b !== void 0 ? _b : 0);
            const lastScrollTop = this.data.lastMessageScrollTop;
            this.setData({
                lastMessageScrollTop: scrollTop,
            });
            if (scrollTop < lastScrollTop && scrollTop > 20 && !this.data.isReadingHistory) {
                this.setData({
                    isReadingHistory: true,
                });
            }
        },
        onMessageScrollToLower() {
            this.setData({
                isReadingHistory: false,
            });
        },
        previewImage(e) {
            const url = e.currentTarget.dataset.url;
            if (!url) {
                return;
            }
            wx.previewImage({
                urls: [url],
                current: url,
            });
        },
        async pollNewMessages() {
            var _a;
            const conversationId = this.data.activeConversationId;
            if (!conversationId || this.data.loadingMessages) {
                return;
            }
            const loader = this.data.role === 'merchant' ? merchant_1.fetchMerchantChatMessages : app_1.fetchChatMessages;
            try {
                const response = await loader(conversationId, {
                    page: 1,
                    pageSize: PAGE_SIZE,
                });
                const items = ((_a = response.items) !== null && _a !== void 0 ? _a : []).map((message) => ({
                    ...message,
                    displayTime: formatDateTime(message.createdAt),
                    showTime: false,
                }));
                const normalizedItems = normalizeMessageTimeline(items);
                if (!items.length) {
                    return;
                }
                const currentMessages = this.data.messages;
                if (!currentMessages.length) {
                    this.setData({
                        messages: normalizedItems,
                    });
                    this.scrollToLatest();
                    return;
                }
                const latestMessage = currentMessages[currentMessages.length - 1];
                const latestIdx = items.findIndex((item) => item.messageId === latestMessage.messageId);
                if (latestIdx === -1) {
                    return;
                }
                const newMessages = normalizedItems.slice(latestIdx + 1);
                if (newMessages.length > 0) {
                    this.setData({
                        messages: normalizeMessageTimeline([...currentMessages, ...newMessages]),
                    });
                    void this.markRead(conversationId);
                    if (!this.data.isReadingHistory) {
                        this.scrollToLatest();
                    }
                }
            }
            catch (error) {
                console.error('Polling failed:', error);
            }
        },
        startPolling() {
            this.stopPolling();
            this.pollTimer = setInterval(() => {
                void this.pollNewMessages();
            }, 4000);
        },
        stopPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        },
        goBack() {
            if (this.data.role === 'merchant') {
                if (this.data.activeConversationId > 0) {
                    this.stopPolling();
                    this.setData({
                        activeConversationId: 0,
                        activeConversation: null,
                        conversationTitle: '会话列表',
                        conversationSubtitle: '商户客服会话',
                        conversationAvatar: icons_1.iconPaths.defaultAvatar,
                        messages: [],
                        page: 1,
                        hasMore: true,
                    });
                    return;
                }
                (0, auth_route_1.navigateBackOrMerchantHome)();
                return;
            }
            (0, auth_route_1.navigateBackOrHome)();
        },
        async selectConversation(e) {
            var _a;
            const conversationId = Number((_a = e.currentTarget.dataset.conversationId) !== null && _a !== void 0 ? _a : 0);
            if (!conversationId) {
                return;
            }
            const conversation = this.data.conversations.find((item) => item.conversationId === conversationId);
            if (!conversation) {
                return;
            }
            await this.openConversation(conversation);
        },
        async onPullDownRefresh() {
            if (this.data.role === 'merchant') {
                if (this.data.activeConversationId > 0) {
                    await this.loadMessages(this.data.activeConversationId, true);
                    await this.refreshUnreadCount();
                }
                else {
                    await this.loadMerchantConversations();
                }
            }
            else if (this.data.activeConversationId > 0) {
                await this.loadMessages(this.data.activeConversationId, true);
                await this.refreshUnreadCount();
            }
            else {
                await this.bootstrapBuyerConversation();
            }
            wx.stopPullDownRefresh();
        },
    },
});
