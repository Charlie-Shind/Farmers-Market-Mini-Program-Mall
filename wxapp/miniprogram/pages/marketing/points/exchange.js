"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
function buildCoverStyle(url) {
    return url
        ? `background-image: url(${url}); background-size: cover; background-position: center;`
        : '';
}
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        loading: true,
        loadingText: '正在加载积分兑换',
        pointsBalance: 0,
        pointsGoods: [],
        redeeming: false,
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
            void this.loadPoints();
        },
    },
    pageLifetimes: {
        show() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
            void this.loadPoints();
        },
    },
    methods: {
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        async loadPoints() {
            this.setData({
                loading: true,
                loadingText: '正在加载积分兑换',
            });
            try {
                const result = await (0, app_1.fetchPointExchangeItems)().catch(() => ({ balance: 0, items: [] }));
                const goods = (result.items || []).map((item) => ({
                    id: String(item.couponId),
                    couponId: item.couponId,
                    title: item.name,
                    desc: [
                        item.matchReason || '',
                        item.thresholdAmount != null ? `满 ${item.thresholdAmount} 元可用` : '',
                    ]
                        .filter(Boolean)
                        .join(' · ') || '后台配置的积分兑换商品',
                    pointsCost: Number(item.pointsCost || 0),
                    received: Boolean(item.received),
                    canRedeem: Boolean(item.canRedeem),
                    imageStyle: buildCoverStyle(typeof item.coverUrl === 'string'
                        ? item.coverUrl
                        : typeof item.imageUrl === 'string'
                            ? item.imageUrl
                            : ''),
                }));
                this.setData({
                    pointsBalance: Number(result.balance || 0),
                    pointsGoods: goods,
                });
            }
            catch {
                this.setData({
                    pointsBalance: 0,
                    pointsGoods: [],
                });
            }
            finally {
                this.setData({
                    loading: false,
                });
            }
        },
        async redeemPoints(e) {
            const { couponId } = e.currentTarget.dataset || {};
            if (!couponId || this.data.redeeming) {
                return;
            }
            const target = this.data.pointsGoods.find((item) => item.couponId === couponId);
            if (!target) {
                return;
            }
            if (target.received) {
                wx.showToast({ title: '已兑换', icon: 'none' });
                return;
            }
            if (!target.canRedeem) {
                wx.showToast({ title: '积分不足或不满足条件', icon: 'none' });
                return;
            }
            const confirmed = await new Promise((resolve) => wx.showModal({
                title: '确认兑换',
                content: `消耗 ${target.pointsCost} 积分兑换「${target.title}」？`,
                success: (res) => resolve(Boolean(res.confirm)),
                fail: () => resolve(false),
            }));
            if (!confirmed) {
                return;
            }
            this.setData({
                redeeming: true,
            });
            try {
                const result = await (0, app_1.exchangePointsCoupon)(couponId);
                wx.showToast({ title: result.alreadyExchanged ? '已兑换过' : '兑换成功', icon: 'success' });
                await this.loadPoints();
            }
            catch (err) {
                wx.showToast({ title: (err === null || err === void 0 ? void 0 : err.message) || '兑换失败', icon: 'none' });
            }
            finally {
                this.setData({
                    redeeming: false,
                });
            }
        },
    },
});
