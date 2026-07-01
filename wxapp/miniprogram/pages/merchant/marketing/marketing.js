"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
const TYPE_MAP = {
    SECKILL: '限时秒杀', GROUP_BUY: '拼团活动', CASHBACK: '满减优惠券', PRESALE: '预售活动',
};
function mapRules(item) {
    var _a, _b;
    if (item.coupon)
        return [
            { value: `¥${item.coupon.thresholdAmount}`, label: '使用门槛' },
            { value: `¥${item.coupon.discountAmount}`, label: '优惠金额' },
            { value: `${item.coupon.stock}张`, label: '库存' },
        ];
    return [
        { value: `${item.productCount}件`, label: '关联商品' },
        { value: ((_a = item.startAt) === null || _a === void 0 ? void 0 : _a.slice(0, 10)) || '-', label: '开始' },
        { value: ((_b = item.endAt) === null || _b === void 0 ? void 0 : _b.slice(0, 10)) || '-', label: '结束' },
    ];
}
Page({
    data: {
        pageStyle: '',
        loading: true,
        searchValue: '',
        weekAmount: '0',
        runningCount: 0,
        stockRate: 0,
        tabs: [
            { name: '全部', active: true }, { name: '进行中', active: false },
            { name: '草稿', active: false }, { name: '已结束', active: false },
        ],
        allActivities: [],
        activities: [],
        nav: [
            { name: '首页', icon: 'home', url: '/pages/merchant/dashboard/dashboard?tab=0', active: false, tab: 0 },
            { name: '聊天', icon: 'message', url: '/pages/merchant/messages/messages?tab=1', active: false, tab: 1 },
            { name: '订单', icon: 'invoice', url: '/pages/merchant/orders/orders?tab=2', active: false, tab: 2 },
            { name: '库存', icon: 'package', url: '/pages/merchant/products/products?tab=3', active: false, tab: 3 },
            { name: '账号', icon: 'profile', url: '/pages/merchant/shop/shop?tab=4', active: false, tab: 4 },
        ],
    },
    onLoad() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); },
    onShow() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); this.loadActivities(); },
    async loadActivities() {
        this.setData({ loading: true });
        try {
            const result = await (0, merchant_1.fetchMerchantActivities)();
            const items = (result.items || result || []);
            const all = items.map((a) => {
                var _a;
                return ({
                    id: String(a.id || a.activityId),
                    name: a.title,
                    typeName: TYPE_MAP[a.type || a.activityType] || a.type || a.activityType || '活动',
                    timeText: a.startAt ? `${a.startAt.slice(0, 10)} - ${((_a = a.endAt) === null || _a === void 0 ? void 0 : _a.slice(0, 10)) || ''}` : '',
                    statusText: a.status === 'PUBLISHED' ? '进行中' : a.status === 'DRAFT' ? '草稿' : a.status || '',
                    statusClass: a.status === 'PUBLISHED' ? 'success' : a.status === 'DRAFT' ? 'warning' : 'info',
                    cover: '/assets/goods/g2.svg',
                    rules: mapRules(a),
                    percent: Math.min(100, ((a.orderCount || 0) / Math.max(1, a.productCount || 1)) * 100),
                    progressText: a.orderCount ? `已售 ${a.orderCount} 单` : '',
                });
            });
            const running = all.filter((a) => a.statusText === '进行中').length;
            this.setData({ allActivities: all, activities: all, runningCount: running, loading: false }, () => this.applyFilter());
        }
        catch (e) {
            wx.showToast({ title: e.message || '加载失败', icon: 'none' });
            this.setData({ loading: false });
        }
    },
    applyFilter() {
        const all = this.data.allActivities;
        const activeTab = this.data.tabs.find((t) => t.active);
        const tab = activeTab === null || activeTab === void 0 ? void 0 : activeTab.name;
        let filtered;
        if (!tab || tab === '全部')
            filtered = all;
        else if (tab === '进行中')
            filtered = all.filter((a) => a.statusText === '进行中');
        else if (tab === '草稿')
            filtered = all.filter((a) => a.statusText === '草稿');
        else
            filtered = all.filter((a) => a.statusText === '已结束');
        const kw = (this.data.searchValue || '').toLowerCase();
        if (kw)
            filtered = filtered.filter((a) => a.name.toLowerCase().includes(kw));
        this.setData({ activities: filtered });
    },
    goBack() { if (getCurrentPages().length > 1) {
        wx.navigateBack({ delta: 1 });
    } },
    goPage(e) { const url = e.currentTarget.dataset.url; if (url)
        wx.navigateTo({ url }); },
    goPublish() { wx.navigateTo({ url: '/pages/merchant/marketing-edit/marketing-edit' }); },
    goDrafts() { wx.navigateTo({ url: '/pages/merchant/marketing-drafts/marketing-drafts' }); },
    goStatistics() { wx.navigateTo({ url: '/pages/merchant/marketing-statistics/marketing-statistics' }); },
    goDetail(e) { const id = e.currentTarget.dataset.id; wx.navigateTo({ url: `/pages/merchant/marketing-detail/marketing-detail?id=${id}` }); },
    goEdit(e) { const id = e.currentTarget.dataset.id; wx.navigateTo({ url: `/pages/merchant/marketing-edit/marketing-edit?id=${id}` }); },
    async deleteActivity(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认删除', content: '删除后活动数据将无法恢复', confirmColor: '#A6453A',
            success: async (res) => {
                if (!res.confirm)
                    return;
                try {
                    await (0, merchant_1.deleteMerchantActivity)(Number(id));
                    wx.showToast({ title: '已删除', icon: 'success' });
                    this.loadActivities();
                }
                catch (err) {
                    wx.showToast({ title: err.message || '删除失败', icon: 'none' });
                }
            },
        });
    },
    onSearchInput(e) { this.setData({ searchValue: e.detail.value }, () => this.applyFilter()); },
    onTabTap(e) {
        const index = Number(e.currentTarget.dataset.index);
        const tabs = this.data.tabs.map((item, idx) => ({ ...item, active: idx === index }));
        this.setData({ tabs }, () => this.applyFilter());
    },
});
