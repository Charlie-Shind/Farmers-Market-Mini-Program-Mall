"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
function pad(n) {
    return n < 10 ? `0${n}` : `${n}`;
}
function formatTime(raw) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime()))
        return raw || '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
Page({
    data: {
        pageStyle: '',
        searchKeyword: '',
        showFilterSheet: false,
        filterType: 'all',
        filterStatus: 'all',
        filterTime: 'today',
        tabs: [
            { key: 'all', name: '全部', active: true },
            { key: 'buyer', name: '买家', active: false },
            { key: 'unread', name: '未读', active: false },
        ],
        activeTab: 'all',
        messages: [],
        filteredMessages: [],
    },
    onLoad() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        this.loadMessages();
    },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        this.syncUnreadCount();
    },
    async loadMessages() {
        const merged = [];
        try {
            const chats = await (0, merchant_1.fetchMerchantChats)();
            if (chats && chats.length) {
                for (const c of chats) {
                    merged.push({
                        id: `chat-${c.conversationId}`,
                        type: 'buyer',
                        title: c.buyerName || '买家',
                        desc: c.lastMessageContent || '',
                        subdesc: `${c.sceneLabel || ''} · ${formatTime(c.lastMessageAt)}`,
                        avatar: c.buyerAvatar || 'profile',
                        unread: c.unreadCount || 0,
                        time: formatTime(c.lastMessageAt),
                        conversationId: c.conversationId,
                        orderNo: c.orderNo || '',
                        productTitle: c.productTitle || '',
                        sceneLabel: c.sceneLabel || '',
                    });
                }
            }
        }
        catch (_a) {
            // 后端未就绪
        }
        this.setData({ messages: merged });
        this.applyFilters();
    },
    async syncUnreadCount() {
        try {
            const res = await (0, merchant_1.fetchMerchantChatUnreadCount)();
            if (res && typeof res.unreadCount === 'number') {
                // 未读数同步到消息列表
            }
        }
        catch (_b) {
            /* 静默 */
        }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/dashboard/dashboard' });
    },
    goPage(e) {
        const url = e.currentTarget.dataset.url;
        if (!url)
            return;
        wx.navigateTo({ url });
    },
    onTabTap(e) {
        const key = e.currentTarget.dataset.key;
        const tabs = this.data.tabs.map(t => Object.assign({}, t, { active: t.key === key }));
        this.setData({ tabs, activeTab: key });
        this.applyFilters();
    },
    onSearchInput(e) {
        this.setData({ searchKeyword: e.detail.value });
        this.applyFilters();
    },
    openFilterSheet() { this.setData({ showFilterSheet: true }); },
    closeFilterSheet() { this.setData({ showFilterSheet: false }); },
    setFilterType(e) { this.setData({ filterType: e.currentTarget.dataset.type }); },
    setFilterStatus(e) { this.setData({ filterStatus: e.currentTarget.dataset.status }); },
    setFilterTime(e) { this.setData({ filterTime: e.currentTarget.dataset.time }); },
    resetFilter() {
        this.setData({ filterType: 'all', filterStatus: 'all', filterTime: 'today' });
        wx.showToast({ title: '已重置筛选', icon: 'none' });
    },
    applyFilter() {
        this.setData({ showFilterSheet: false });
        this.applyFilters();
        wx.showToast({ title: '已应用筛选', icon: 'none' });
    },
    applyFilters() {
        const { messages, activeTab, filterType, filterStatus, searchKeyword } = this.data;
        let list = messages.slice();
        if (activeTab === 'buyer')
            list = list.filter(m => m.type === 'buyer');
        else if (activeTab === 'unread')
            list = list.filter(m => m.unread > 0);
        if (filterType === 'buyer')
            list = list.filter(m => m.type === 'buyer');
        if (filterStatus === 'unread')
            list = list.filter(m => m.unread > 0);
        else if (filterStatus === 'read')
            list = list.filter(m => m.unread === 0);
        if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            list = list.filter(m => m.title.includes(kw) || m.desc.includes(kw) || m.subdesc.includes(kw));
        }
        this.setData({ filteredMessages: list });
    },
    openMessage(e) {
        const item = e.currentTarget.dataset.item;
        if (item.type === 'buyer') {
            const params = [
                `conversationId=${item.conversationId || ''}`,
                `buyerName=${encodeURIComponent(item.title || '')}`,
                `orderNo=${encodeURIComponent(item.orderNo || '')}`,
                `productTitle=${encodeURIComponent(item.productTitle || '')}`,
                `sceneLabel=${encodeURIComponent(item.sceneLabel || '')}`,
            ].join('&');
            wx.navigateTo({ url: `/pages/merchant/chat-detail/chat-detail?${params}` });
        }
    },
});
