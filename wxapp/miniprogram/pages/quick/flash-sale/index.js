"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const quick_1 = require("../../../services/quick");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
let _countdownTimer = null;
function pad(n) {
    return String(n).padStart(2, '0');
}
function splitCountdown(value) {
    if (value === '已结束') {
        return { hh: '00', mm: '00', ss: '00' };
    }
    const parts = value.split(':');
    const hh = parts[0] || '00';
    const mm = parts[1] || '00';
    const ss = parts[2] || '00';
    return { hh, mm, ss };
}
function formatCountdown(target, now) {
    const diff = new Date(target).getTime() - now;
    if (Number.isNaN(diff) || diff <= 0) {
        return '已结束';
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function formatTimeRange(startAt, endAt) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return `${startAt} - ${endAt}`;
    }
    return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}
function formatStartTime(startAt) {
    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) {
        return startAt;
    }
    return `${pad(start.getHours())}:${pad(start.getMinutes())}`;
}
function computeWindowStatus(startAt, endAt, now) {
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    if (now < start)
        return 'UPCOMING';
    if (now < end)
        return 'ONGOING';
    return 'ENDED';
}
function mapStatusLabel(status) {
    if (status === 'ONGOING')
        return '抢购中';
    if (status === 'UPCOMING')
        return '即将开始';
    return '已结束';
}
function calcDiscount(originPrice, flashPrice) {
    const origin = Number(originPrice);
    const flash = Number(flashPrice);
    if (!origin || origin <= 0 || !flash || flash <= 0) {
        return '限时';
    }
    const rate = (flash / origin) * 10;
    return `${rate.toFixed(1)}折`;
}
function mapItem(item) {
    const sold = Math.max(0, item.totalStock - item.stockLeft);
    return {
        id: String(item.productId),
        itemId: item.itemId,
        productId: item.productId,
        skuId: item.skuId,
        title: item.title,
        subtitle: item.subtitle,
        price: item.flashPrice,
        originPrice: item.originPrice,
        discount: calcDiscount(item.originPrice, item.flashPrice),
        sold,
        coverUrl: item.coverUrl,
        stockLeft: item.stockLeft,
        totalStock: item.totalStock,
    };
}
function mapWindow(window, total, now) {
    const target = window.status === 'UPCOMING' ? window.startAt : window.endAt;
    return {
        id: window.id,
        label: window.label,
        rangeText: formatTimeRange(window.startAt, window.endAt),
        startTime: formatStartTime(window.startAt),
        status: window.status,
        statusLabel: mapStatusLabel(window.status),
        countdownParts: splitCountdown(formatCountdown(target, now)),
        startAt: window.startAt,
        endAt: window.endAt,
        total,
    };
}
Component({
    data: {
        pageTitle: '秒杀专区',
        products: [],
        windows: [],
        activeWindowIndex: 0,
        activeWindow: null,
        activeWindowId: '',
        loading: false,
        loadingMore: false,
        noMore: false,
        cartBadge: '',
        icons: icons_1.iconPaths,
        pageStyle: '',
    },
    lifetimes: {
        attached() {
            if ((0, auth_route_1.redirectMerchantAwayFromCustomerRoute)('/pages/quick/flash-sale/index')) {
                return;
            }
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            const options = (current === null || current === void 0 ? void 0 : current.options) || {};
            this.setData({
                pageTitle: options.title ? decodeURIComponent(options.title) : '限时秒杀',
                pageStyle: (0, page_layout_1.buildPageTopStyle)(0),
            });
            void this.loadWindows();
            void this.syncCartBadge();
        },
        detached() {
            this._clearCountdowns();
        },
    },
    pageLifetimes: {
        show() {
            void this.syncCartBadge();
            this._startCountdowns();
        },
        hide() {
            this._clearCountdowns();
        },
    },
    methods: {
        _clearCountdowns() {
            if (_countdownTimer != null) {
                clearInterval(_countdownTimer);
                _countdownTimer = null;
            }
        },
        _startCountdowns() {
            this._clearCountdowns();
            const windows = this.data.windows;
            if (!windows.length) {
                return;
            }
            const tick = () => {
                var _a;
                const now = Date.now();
                const current = this.data.windows;
                if (!current.length) {
                    this._clearCountdowns();
                    return;
                }
                const next = current.map((w) => {
                    const status = computeWindowStatus(w.startAt, w.endAt, now);
                    const target = status === 'UPCOMING' ? w.startAt : w.endAt;
                    return {
                        ...w,
                        status,
                        statusLabel: mapStatusLabel(status),
                        countdownParts: splitCountdown(formatCountdown(target, now)),
                    };
                });
                let activeWindowIndex = this.data.activeWindowIndex;
                if (activeWindowIndex < next.length) {
                    const cur = next[activeWindowIndex];
                    if (cur.status === 'ENDED') {
                        const ongoing = next.findIndex((w) => w.status === 'ONGOING');
                        if (ongoing >= 0) {
                            activeWindowIndex = ongoing;
                        }
                    }
                }
                this.setData({ windows: next, activeWindowIndex, activeWindow: (_a = next[activeWindowIndex]) !== null && _a !== void 0 ? _a : null });
            };
            tick();
            _countdownTimer = setInterval(tick, 1000);
        },
        async syncCartBadge() {
            try {
                const count = await (0, app_1.fetchCartItemCount)();
                this.setData({ cartBadge: count > 0 ? String(count) : '' });
            }
            catch {
                this.setData({ cartBadge: '' });
            }
        },
        async loadWindows() {
            var _a;
            this.setData({ loading: true });
            try {
                const result = await (0, quick_1.fetchFlashSaleWindows)();
                const now = Date.now();
                const windowsRaw = result.windows || [];
                const windows = windowsRaw.map((w) => mapWindow(w, 0, now));
                const ongoingIndex = windows.findIndex((w) => w.status === 'ONGOING');
                const activeWindowIndex = ongoingIndex >= 0 ? ongoingIndex : 0;
                this.setData({
                    windows,
                    activeWindowIndex,
                    activeWindow: (_a = windows[activeWindowIndex]) !== null && _a !== void 0 ? _a : null,
                    activeWindowId: windows[activeWindowIndex] ? `flash-window-${windows[activeWindowIndex].id}` : '',
                    products: [],
                    noMore: windows.length === 0,
                });
                this._startCountdowns();
                if (windows[activeWindowIndex]) {
                    await this.loadItems(true);
                }
            }
            catch {
                this.setData({ windows: [], products: [], activeWindow: null, noMore: true });
                this._clearCountdowns();
            }
            finally {
                this.setData({ loading: false });
            }
        },
        async loadItems(reset) {
            var _a;
            const { windows, activeWindowIndex, loadingMore, products } = this.data;
            const window = windows[activeWindowIndex];
            if (!window || loadingMore) {
                return;
            }
            const pageSize = 12;
            const nextPage = reset ? 1 : Math.floor(products.length / pageSize) + 1;
            this.setData({ loadingMore: true });
            try {
                const result = await (0, quick_1.fetchFlashSaleItems)({ windowId: window.id, page: nextPage, pageSize });
                const items = (result.items || []).map((item) => mapItem(item));
                const currentItems = items;
                const merged = reset ? currentItems : [...products, ...currentItems];
                const noMore = merged.length >= result.total || currentItems.length < pageSize;
                const windowsWithTotal = this.data.windows.map((w) => w.id === window.id ? { ...w, total: result.total } : w);
                this.setData({
                    products: merged,
                    noMore,
                    windows: windowsWithTotal,
                    activeWindow: (_a = windowsWithTotal[activeWindowIndex]) !== null && _a !== void 0 ? _a : null,
                    activeWindowId: windowsWithTotal[activeWindowIndex] ? `flash-window-${windowsWithTotal[activeWindowIndex].id}` : '',
                });
            }
            catch {
                if (reset) {
                    this.setData({ products: [], noMore: true });
                }
            }
            finally {
                this.setData({ loadingMore: false });
            }
        },
        async selectWindow(e) {
            var _a;
            const { index } = e.currentTarget.dataset || {};
            if (typeof index !== 'number' || index === this.data.activeWindowIndex) {
                return;
            }
            this.setData({
                activeWindowIndex: index,
                activeWindow: (_a = this.data.windows[index]) !== null && _a !== void 0 ? _a : null,
                activeWindowId: this.data.windows[index] ? `flash-window-${this.data.windows[index].id}` : '',
                products: [],
                noMore: false,
            });
            await this.loadItems(true);
        },
        async loadMore() {
            if (this.data.noMore || this.data.loadingMore || this.data.products.length === 0) {
                return;
            }
            await this.loadItems(false);
        },
        async claimFlashSaleAndGoCheckout(params) {
            if (!(0, auth_route_1.ensureCustomerAccess)('/pages/quick/flash-sale/index')) {
                return;
            }
            const { itemId, title, subtitle, coverUrl, originPrice } = params;
            try {
                const claim = await (0, quick_1.claimFlashSale)({ itemId, quantity: 1 });
                wx.navigateTo({
                    url: `/pages/checkout/checkout?mode=flashSale&flashSaleItemId=${claim.itemId}` +
                        `&skuId=${claim.skuId}` +
                        `&quantity=1` +
                        `&flashPrice=${claim.flashPrice}` +
                        `${title ? `&title=${encodeURIComponent(title)}` : ''}` +
                        `${subtitle ? `&subtitle=${encodeURIComponent(subtitle)}` : ''}` +
                        `${coverUrl ? `&coverUrl=${encodeURIComponent(coverUrl)}` : ''}` +
                        `${originPrice ? `&originPrice=${encodeURIComponent(originPrice)}` : ''}`,
                });
            }
            catch (e) {
                wx.showToast({ title: e.message || '秒杀失败', icon: 'none' });
            }
        },
        async buyFlashSale(e) {
            const { itemId, title, subtitle, coverUrl, originPrice } = e.currentTarget.dataset || {};
            if (!itemId) {
                return;
            }
            await this.claimFlashSaleAndGoCheckout({
                itemId,
                title,
                subtitle,
                coverUrl,
                originPrice,
            });
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        openProductDetail(e) {
            const { itemId, title, subtitle, coverUrl, originPrice } = e.currentTarget.dataset || {};
            if (!itemId) {
                return;
            }
            void this.claimFlashSaleAndGoCheckout({ itemId, title, subtitle, coverUrl, originPrice });
        },
        async contactSupport() {
            try {
                const target = await (0, app_1.fetchChatSupportTarget)();
                const opened = await (0, app_1.openChatConversation)({
                    merchantId: target.merchantId,
                    sceneType: 'OFFICIAL',
                    sceneLabel: target.sceneLabel || '秒杀专区咨询',
                    sceneSource: '秒杀专区',
                });
                if (opened && opened.conversationId) {
                    wx.navigateTo({
                        url: `/pages/chat/chat?conversationId=${opened.conversationId}`,
                    });
                }
            }
            catch {
                wx.showToast({ title: '客服暂不可用，请稍后再试', icon: 'none' });
            }
        },
    },
});
