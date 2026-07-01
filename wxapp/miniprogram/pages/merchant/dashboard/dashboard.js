"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
function buildTrendChart(items, metric) {
    if (!items.length) {
        return [];
    }
    const values = items.map((item) => {
        if (metric === 'payAmount') {
            return Number(item.payAmount) || 0;
        }
        return Number(item[metric]) || 0;
    });
    const maxValue = Math.max(...values, 1);
    return items.map((item, index) => {
        const rawValue = metric === 'payAmount'
            ? Number(item.payAmount) || 0
            : Number(item[metric]) || 0;
        return {
            name: (item.date === null || item.date === void 0 ? void 0 : item.date.slice(-2).replace(/^0/, '')) || item.date || String(index + 1),
            value: metric === 'payAmount' ? `${Math.round(rawValue / 1000)}k` : String(rawValue),
            height: `${Math.max(12, Math.round((rawValue / maxValue) * 100))}%`,
        };
    });
}
function resolveTodoPresentation(todo) {
    const text = `${(todo === null || todo === void 0 ? void 0 : todo.title) || ''}${(todo === null || todo === void 0 ? void 0 : todo.value) || ''}`;
    const isStockTodo = /库存|预警|缺货|补货|售罄/.test(text);
    const isActivityTodo = /活动|秒杀|补贴|报名/.test(text);
    const isOrderTodo = /订单|发货|售后|退款/.test(text);
    if (isStockTodo) {
        return {
            tone: 'warn',
            icon: 'package',
            url: '/pages/merchant/products/products',
        };
    }
    if (isActivityTodo) {
        return {
            tone: 'activity',
            icon: 'star',
            url: '/pages/merchant/marketing/marketing',
        };
    }
    if (isOrderTodo) {
        return {
            tone: 'info',
            icon: 'invoice',
            url: '/pages/merchant/orders/orders',
        };
    }
    return {
        tone: (todo === null || todo === void 0 ? void 0 : todo.tone) === 'warn' ? 'warn' : (todo === null || todo === void 0 ? void 0 : todo.tone) === 'danger' ? 'danger' : 'info',
        icon: (todo === null || todo === void 0 ? void 0 : todo.tone) === 'warn' ? 'package' : 'invoice',
        url: (todo === null || todo === void 0 ? void 0 : todo.tone) === 'warn' ? '/pages/merchant/products/products' : '/pages/merchant/orders/orders',
    };
}
Page({
    data: {
        pageStyle: '',
        loading: true,
        shopName: '湾源农仓',
        shopStatus: '经营正常',
        dashboardMetrics: [],
        dashboardActions: [
            { title: '发布商品', icon: 'plus', tone: '', url: '/pages/merchant/publish/publish' },
            { title: '发布活动', icon: 'star', tone: 'activity', url: '/pages/merchant/marketing-publish/marketing-publish' },
            { title: '处理订单', icon: 'invoice', tone: 'info', url: '/pages/merchant/orders/orders' },
            { title: '工作台', icon: 'package', tone: 'warn', url: '/pages/merchant/workbench/workbench' },
        ],
        chartMetricLabel: '成交额',
        chartUnitLabel: '单位：千元',
        chartTabs: [
            { name: '成交', active: true },
            { name: '访客', active: false },
            { name: '订单', active: false },
        ],
        trendSource: [],
        dashboardTrend: [],
        todoItems: [],
        hotProducts: [],
        commonFunctions: [
            { title: '发布商品', icon: 'plus', url: '/pages/merchant/publish/publish' },
            { title: '发布活动', icon: 'star', url: '/pages/merchant/marketing-publish/marketing-publish' },
            { title: '商品草稿', icon: 'edit', url: '/pages/merchant/product-drafts/product-drafts' },
            { title: '活动草稿', icon: 'clock', url: '/pages/merchant/marketing-drafts/marketing-drafts' },
            { title: '资金', icon: 'wallet', url: '/pages/merchant/finance/finance' },
            { title: '配送', icon: 'truck', url: '/pages/merchant/delivery/delivery' },
            { title: '数据', icon: 'discover', url: '/pages/merchant/statistics/statistics' },
            { title: '店铺', icon: 'profile', url: '/pages/merchant/shop/shop' },
        ],
        nav: [
            { name: '首页', icon: 'home', url: '/pages/merchant/dashboard/dashboard?tab=0', active: true, tab: 0 },
            { name: '聊天', icon: 'message', url: '/pages/merchant/messages/messages?tab=1', active: false, tab: 1 },
            { name: '订单', icon: 'invoice', url: '/pages/merchant/orders/orders?tab=2', active: false, tab: 2 },
            { name: '库存', icon: 'package', url: '/pages/merchant/products/products?tab=3', active: false, tab: 3 },
            { name: '账号', icon: 'profile', url: '/pages/merchant/shop/shop?tab=4', active: false, tab: 4 },
        ],
    },
    onLoad() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
    },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        this.loadDashboard();
    },
    async loadDashboard() {
        this.setData({ loading: true });
        try {
            const [data, overview] = await Promise.all([
                (0, merchant_1.fetchMerchantDashboard)(),
                (0, merchant_1.fetchMerchantStatisticsOverview)('7d').catch(() => null),
            ]);
            if (!data) {
                this.setData({ loading: false });
                return;
            }
            const trendSource = (((overview === null || overview === void 0 ? void 0 : overview.trend) || [])).slice(-7);
            this.setData({
                shopName: (data.shop === null || data.shop === void 0 ? void 0 : data.shop.name) || '湾源农仓',
                shopStatus: (data.shop === null || data.shop === void 0 ? void 0 : data.shop.status) || '经营正常',
                dashboardMetrics: (data.heroStats || []).map((s) => ({
                    value: s.value,
                    label: s.label,
                    trend: '',
                })),
                trendSource,
                chartMetricLabel: '成交额',
                chartUnitLabel: '单位：千元',
                chartTabs: [
                    { name: '成交', active: true },
                    { name: '访客', active: false },
                    { name: '订单', active: false },
                ],
                dashboardTrend: buildTrendChart(trendSource, 'payAmount'),
                todoItems: (data.todos || []).map((t) => {
                    const presentation = resolveTodoPresentation(t);
                    return {
                        title: t.title,
                        status: t.value,
                        tag: t.tone === 'warn' ? 'warning' : t.tone === 'danger' ? 'danger' : 'info',
                        tone: presentation.tone,
                        icon: presentation.icon,
                        url: presentation.url,
                    };
                }),
                loading: false,
            });
        }
        catch (e) {
            wx.showToast({ title: e.message || '加载失败', icon: 'none' });
            this.setData({ loading: false });
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
        if (url)
            wx.navigateTo({ url });
    },
    goNotice() {
        wx.navigateTo({ url: '/pages/merchant/notice/notice' });
    },
    goOrders() {
        wx.navigateTo({ url: '/pages/merchant/orders/orders' });
    },
    goMarketing() {
        wx.navigateTo({ url: '/pages/merchant/marketing/marketing' });
    },
    onChartTabTap(e) {
        const index = Number(e.currentTarget.dataset.index);
        const chartTabs = this.data.chartTabs.map((item, idx) => ({ ...item, active: idx === index }));
        const labels = [
            { chartMetricLabel: '成交额', chartUnitLabel: '单位：千元' },
            { chartMetricLabel: '访客数', chartUnitLabel: '单位：人' },
            { chartMetricLabel: '订单数', chartUnitLabel: '单位：单' },
        ];
        const metricKeys = ['payAmount', 'visitorCount', 'orderCount'];
        this.setData({
            chartTabs,
            ...labels[index],
            dashboardTrend: buildTrendChart(this.data.trendSource || [], metricKeys[index] || 'payAmount'),
        });
    },
    showToast() {
        wx.showToast({ title: '功能待接入', icon: 'none' });
    },
});
