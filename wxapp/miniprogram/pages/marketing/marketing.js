"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../config/icons");
const app_1 = require("../../services/app");
const quick_1 = require("../../services/quick");
const page_layout_1 = require("../../utils/page-layout");
const auth_route_1 = require("../../utils/auth-route");
const location_1 = require("../../services/location");
// ─── helpers ──────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }
function buildCoverStyle(url) {
    return url
        ? `background-image: url(${url}); background-size: cover; background-position: center;`
        : '';
}
function formatCountdown(target) {
    const normalized = String(target || '').trim().replace(' ', 'T');
    const diff = new Date(normalized).getTime() - Date.now();
    if (isNaN(diff) || diff <= 0)
        return '00 : 00 : 00';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${pad(h)} : ${pad(m)} : ${pad(s)}`;
}
function splitCountdown(value) {
    const parts = String(value || '').split(' : ').map((item) => item.trim());
    return [
        parts[0] || '--',
        parts[1] || '--',
        parts[2] || '--',
    ];
}
function formatExpire(expireAt) {
    const diff = new Date(expireAt).getTime() - Date.now();
    if (isNaN(diff) || diff <= 0)
        return '已结束';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h >= 24)
        return `${Math.floor(h / 24)} 天后`;
    if (h > 0)
        return `剩 ${h} 小时 ${m} 分`;
    return `剩 ${m} 分钟`;
}
function mapFlash(item) {
    var _a, _b, _c;
    const flash = Number(item.flashPrice) || 0;
    const origin = Number(item.originPrice) || flash;
    const pct = origin > 0 ? Math.round((flash / origin) * 10) : 10;
    const stockProgress = Math.max(0, Math.min(100, (((_a = item.stockLeft) !== null && _a !== void 0 ? _a : 0) / Math.max((_b = item.totalStock) !== null && _b !== void 0 ? _b : 1, 1)) * 100));
    return {
        id: String(item.productId),
        skuId: item.skuId,
        title: item.title,
        desc: item.subtitle || item.originPlace || '产地直供',
        price: `¥${item.flashPrice}`,
        originPrice: `¥${item.originPrice}`,
        discount: `${pct}折`,
        imageStyle: buildCoverStyle(item.coverUrl),
        stockLeft: (_c = item.stockLeft) !== null && _c !== void 0 ? _c : 0,
        stockProgress,
    };
}
function mapFallbackFlash(item, index) {
    const flashPrice = Number(item.minPrice || 0);
    const originPrice = Number(item.maxPrice || item.minPrice || 0);
    const discountRate = originPrice > 0 ? Math.max(1, Math.round((flashPrice / originPrice) * 10)) : 10;
    return {
        id: String(item.id),
        title: item.title,
        desc: item.subtitle || item.originPlace || '产地直供',
        price: `¥${Number(item.minPrice || 0).toFixed(2)}`,
        originPrice: `¥${Number(item.maxPrice || item.minPrice || 0).toFixed(2)}`,
        discount: `${discountRate}折`,
        imageStyle: buildCoverStyle(item.coverUrl),
        stockLeft: Math.max(0, 99 - index * 7),
        stockProgress: Math.max(0, Math.min(100, 100 - index * 22)),
    };
}
function computeFlashWindowCountdown(window) {
    if (!window) {
        return { label: '下一场', target: '' };
    }
    return {
        label: window.status === 'ONGOING' ? '结束倒计时' : '下一场',
        target: window.status === 'ONGOING' ? window.endAt : window.startAt,
    };
}
function mapGroup(item) {
    const needed = Math.max(item.needed, 1);
    const progress = Math.max(0, Math.min(Math.round((item.memberCount / needed) * 100), 100));
    return {
        groupId: String(item.groupId),
        productId: String(item.productId),
        title: item.title,
        groupPrice: `¥${item.groupPrice}`,
        originPrice: `¥${item.originPrice}`,
        memberText: `${item.memberCount}/${item.needed} 人成团`,
        expireText: formatExpire(item.expireAt),
        progress,
        imageStyle: buildCoverStyle(item.coverUrl),
    };
}
function mapCoupons(available, recommended) {
    // Merge: prefer recommended coupons, fill with available
    const recIds = new Set(recommended.map((c) => c.couponId));
    const extra = available.filter((c) => !recIds.has(c.couponId)).slice(0, 3 - recommended.length);
    const fromRec = recommended.map((c) => ({
        id: String(c.couponId),
        couponId: c.couponId,
        amount: `¥${c.discountAmount}`,
        condition: `满${c.thresholdAmount}可用`,
        tag: c.matchReason || (c.received ? '已领取' : '限时领取'),
        received: Boolean(c.received),
        canReceive: !c.received,
    }));
    const fromAvail = extra.map((c) => ({
        id: String(c.couponId),
        couponId: c.couponId,
        amount: `¥${c.discountAmount}`,
        condition: `满${c.thresholdAmount}可用`,
        tag: c.received ? '已领取' : '限时领取',
        received: Boolean(c.received),
        canReceive: !c.received && c.stock > 0,
    }));
    return [...fromRec, ...fromAvail].slice(0, 3);
}
// ─── component ────────────────────────────────────────────────────────────────
let _countdownTimer = null;
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        cartBadge: '',
        // loading states
        loadingFlash: true,
        loadingGroup: true,
        loadingCoupons: true,
        loadingPoints: true,
        // flash sale
        flashCountdown: '--:--:--',
        flashCountdownParts: ['--', '--', '--'],
        flashCountdownLabel: '下一场',
        flashEndAt: '',
        flashWindowLabel: '',
        flashProducts: [],
        flashEmpty: false,
        // group buy
        groupProducts: [],
        groupEmpty: false,
        groupNoLocation: false,
        // coupons
        coupons: [],
        couponReceiving: false,
        // points
        pointsBalance: 0,
        pointsGoods: [],
        pointsExchanging: false,
    },
    lifetimes: {
        attached() {
            this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(4) });
            void this.loadAll();
            void this.syncCartBadge();
        },
        detached() {
            this._clearCountdown();
        },
    },
    pageLifetimes: {
        show() {
            var _a, _b;
            this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(4) });
            void this.loadAll();
            void this.syncCartBadge();
            const tabBar = (_b = (_a = this).getTabBar) === null || _b === void 0 ? void 0 : _b.call(_a);
            if (tabBar) {
                tabBar.setData({ active: 'marketing' });
                if (typeof tabBar.syncFromRoute === 'function')
                    tabBar.syncFromRoute();
            }
        },
        hide() {
            this._clearCountdown();
        },
    },
    methods: {
        _clearCountdown() {
            if (_countdownTimer != null) {
                clearInterval(_countdownTimer);
                _countdownTimer = null;
            }
        },
        _startCountdown(endAt) {
            this._clearCountdown();
            const tick = () => {
                const countdown = formatCountdown(endAt);
                this.setData({
                    flashCountdown: countdown,
                    flashCountdownParts: splitCountdown(countdown),
                });
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
        async loadAll() {
            await Promise.allSettled([
                this.loadFlash(),
                this.loadGroup(),
                this.loadCoupons(),
                this.loadPoints(),
            ]);
        },
        async loadFlash() {
            this.setData({ loadingFlash: true, flashEmpty: false });
            try {
                const [windowsResult, hotProducts] = await Promise.all([
                    (0, quick_1.fetchFlashSaleWindows)().catch(() => ({ windows: [] })),
                    (0, app_1.fetchHomeHotProducts)().catch(() => []),
                ]);
                const windows = (windowsResult.windows || []).slice();
                const activeWindow = windows.find((w) => w.status === 'ONGOING') ||
                    windows.find((w) => w.status === 'UPCOMING') ||
                    windows[0] ||
                    null;
                const flashWindow = computeFlashWindowCountdown(activeWindow);
                const countdownTarget = flashWindow.target;
                if (countdownTarget) {
                    this.setData({
                        flashCountdownLabel: flashWindow.label,
                    });
                    this.setData({ flashEndAt: countdownTarget });
                    this._startCountdown(countdownTarget);
                }
                else {
                    this.setData({
                        flashCountdown: '--:--:--',
                        flashCountdownParts: ['--', '--', '--'],
                        flashCountdownLabel: '下一场',
                        flashEndAt: '',
                    });
                    this._clearCountdown();
                }
                let products = [];
                if (activeWindow) {
                    const itemResult = await (0, quick_1.fetchFlashSaleItems)({ windowId: activeWindow.id, page: 1, pageSize: 3 }).catch(() => null);
                    const realItems = ((itemResult === null || itemResult === void 0 ? void 0 : itemResult.items) || []).slice(0, 3);
                    products = realItems.length ? realItems.map(mapFlash) : [];
                }
                if (!products.length) {
                    products = hotProducts.slice(0, 3).map(mapFallbackFlash);
                }
                this.setData({
                    flashWindowLabel: activeWindow ? activeWindow.label : '',
                    flashProducts: products,
                    flashEmpty: products.length === 0,
                });
            }
            catch {
                this.setData({ flashProducts: [], flashEmpty: true });
            }
            finally {
                this.setData({ loadingFlash: false });
            }
        },
        async loadGroup() {
            this.setData({ loadingGroup: true, groupNoLocation: false, groupEmpty: false });
            try {
                const loc = (0, location_1.loadSelectedLocation)();
                if (typeof (loc === null || loc === void 0 ? void 0 : loc.latitude) !== 'number' || typeof (loc === null || loc === void 0 ? void 0 : loc.longitude) !== 'number') {
                    this.setData({ groupNoLocation: true, groupProducts: [] });
                    return;
                }
                const result = await (0, quick_1.fetchGroupBuyNearby)({ lat: loc.latitude, lng: loc.longitude, limit: 3 });
                const groups = (result.groups || []).slice(0, 3).map(mapGroup);
                this.setData({ groupProducts: groups, groupEmpty: groups.length === 0 });
            }
            catch {
                this.setData({ groupProducts: [], groupEmpty: true });
            }
            finally {
                this.setData({ loadingGroup: false });
            }
        },
        async loadCoupons() {
            var _a;
            this.setData({ loadingCoupons: true });
            try {
                const [recResult, available] = await Promise.all([
                    (0, app_1.fetchRecommendedCoupons)('home', { limit: 3 }).catch(() => ({ items: [] })),
                    (0, app_1.fetchCoupons)().catch(() => []),
                ]);
                const coupons = mapCoupons(available !== null && available !== void 0 ? available : [], (_a = recResult === null || recResult === void 0 ? void 0 : recResult.items) !== null && _a !== void 0 ? _a : []);
                this.setData({ coupons });
            }
            catch {
                this.setData({ coupons: [] });
            }
            finally {
                this.setData({ loadingCoupons: false });
            }
        },
        async loadPoints() {
            var _a;
            this.setData({ loadingPoints: true });
            try {
                const result = await (0, app_1.fetchPointExchangeItems)().catch(() => ({ balance: 0, items: [] }));
                const goods = (result.items || []).slice(0, 4).map((item) => ({
                    id: String(item.couponId),
                    couponId: item.couponId,
                    title: item.name,
                    desc: '',
                    pointsCost: item.pointsCost,
                    received: Boolean(item.received),
                    canRedeem: Boolean(item.canRedeem),
                    imageStyle: buildCoverStyle(typeof item.coverUrl === 'string'
                        ? item.coverUrl
                        : typeof item.imageUrl === 'string'
                            ? item.imageUrl
                            : ''),
                }));
                this.setData({ pointsGoods: goods, pointsBalance: (_a = result.balance) !== null && _a !== void 0 ? _a : 0 });
            }
            catch {
                this.setData({ pointsGoods: [], pointsBalance: 0 });
            }
            finally {
                this.setData({ loadingPoints: false });
            }
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        // ── coupon receive ──────────────────────────────────────────────────────
        async receiveCoupon(e) {
            const { couponId } = e.currentTarget.dataset || {};
            if (!couponId || this.data.couponReceiving)
                return;
            const target = this.data.coupons.find((c) => c.couponId === couponId);
            if (!target)
                return;
            if (target.received) {
                wx.showToast({ title: '已领取过', icon: 'none' });
                return;
            }
            if (!target.canReceive) {
                wx.showToast({ title: '领取条件不满足', icon: 'none' });
                return;
            }
            this.setData({ couponReceiving: true });
            try {
                await (0, app_1.receiveCoupon)(couponId);
                wx.showToast({ title: '领取成功', icon: 'success' });
                // update local state instantly
                const coupons = this.data.coupons.map((c) => c.couponId === couponId ? { ...c, received: true, canReceive: false, tag: '已领取' } : c);
                this.setData({ coupons });
            }
            catch (err) {
                wx.showToast({ title: (err === null || err === void 0 ? void 0 : err.message) || '领取失败，请重试', icon: 'none' });
            }
            finally {
                this.setData({ couponReceiving: false });
            }
        },
        // ── points exchange ─────────────────────────────────────────────────────
        async redeemPoints(e) {
            const { couponId } = e.currentTarget.dataset || {};
            if (!couponId || this.data.pointsExchanging)
                return;
            const target = this.data.pointsGoods.find((g) => g.couponId === couponId);
            if (!target)
                return;
            if (target.received) {
                wx.showToast({ title: '已兑换', icon: 'none' });
                return;
            }
            if (!target.canRedeem) {
                wx.showToast({ title: '积分不足或不满足条件', icon: 'none' });
                return;
            }
            const ok = await new Promise((res) => wx.showModal({
                title: '确认兑换',
                content: `消耗 ${target.pointsCost} 积分兑换「${target.title}」？`,
                success: (r) => res(Boolean(r.confirm)),
                fail: () => res(false),
            }));
            if (!ok)
                return;
            this.setData({ pointsExchanging: true });
            try {
                const result = await (0, app_1.exchangePointsCoupon)(couponId);
                wx.showToast({ title: result.alreadyExchanged ? '已兑换过' : '兑换成功！', icon: 'success' });
                const goods = this.data.pointsGoods.map((g) => g.couponId === couponId ? { ...g, received: true, canRedeem: false } : g);
                this.setData({ pointsGoods: goods, pointsBalance: Math.max(0, this.data.pointsBalance - target.pointsCost) });
                void this.loadPoints();
            }
            catch (err) {
                wx.showToast({ title: (err === null || err === void 0 ? void 0 : err.message) || '兑换失败', icon: 'none' });
            }
            finally {
                this.setData({ pointsExchanging: false });
            }
        },
        // ── navigation ──────────────────────────────────────────────────────────
        goToFlashSale() {
            wx.navigateTo({ url: '/pages/quick/flash-sale/index?title=秒杀专区' });
        },
        goToGroupBuy() {
            wx.navigateTo({ url: '/pages/quick/group-buy/index?title=拼团专区' });
        },
        goToOriginZone() {
            wx.navigateTo({ url: '/pages/quick/origin-zone/index?title=产地直供' });
        },
        goToGiftZone() {
            wx.navigateTo({ url: '/pages/profile/coupons/coupons' });
        },
        goToPointsExchange() {
            wx.navigateTo({ url: '/pages/marketing/points/exchange' });
        },
        openProductDetail(e) {
            const { id } = e.currentTarget.dataset || {};
            if (id)
                wx.navigateTo({ url: `/pages/product/detail/detail?productId=${id}` });
        },
        openGroupDetail(e) {
            const { productId } = e.currentTarget.dataset || {};
            if (productId)
                wx.navigateTo({ url: `/pages/product/detail/detail?productId=${productId}` });
        },
        goToSelectLocation() {
            wx.getSetting({
                success: (res) => {
                    const choose = () => {
                        wx.chooseLocation({
                            success: (r) => {
                                const { loadSelectedLocation: _l, saveSelectedLocation } = require('../../services/location');
                                saveSelectedLocation({
                                    source: 'manual',
                                    name: r.name || '选择的位置',
                                    address: r.address || '',
                                    latitude: Number(r.latitude),
                                    longitude: Number(r.longitude),
                                    updatedAt: Date.now(),
                                });
                                wx.showToast({ title: '位置已更新', icon: 'success' });
                                void this.loadGroup();
                            },
                            fail: () => { },
                        });
                    };
                    if (res.authSetting['scope.userLocation']) {
                        choose();
                    }
                    else {
                        wx.authorize({
                            scope: 'scope.userLocation',
                            success: choose,
                            fail: () => wx.showModal({
                                title: '需要定位权限',
                                content: '请在设置中授权小程序使用位置信息',
                                confirmText: '去设置',
                                success: (mr) => { if (mr.confirm)
                                    wx.openSetting(); },
                            }),
                        });
                    }
                },
            });
        },
    },
});
