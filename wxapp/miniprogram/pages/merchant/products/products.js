"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
function mapStatus(p) {
    var _a, _b;
    const s = String((_a = p.status) !== null && _a !== void 0 ? _a : '');
    const a = String((_b = p.auditStatus) !== null && _b !== void 0 ? _b : '');
    const normalizedStatus = s === '0' ? '已下架' : s === '1' ? '上架中' : s;
    const normalizedAudit = a === '1' ? '待审核' : a === '2' ? '已通过' : a === '3' ? '已驳回' : a;
    if (normalizedStatus === 'OFF_SHELF' || normalizedStatus === '已下架') {
        return { status: '已下架', statusType: 'danger', actionText: '上架', action: 'online', actionType: 'primary' };
    }
    if (normalizedAudit === 'PENDING' || normalizedAudit === '待审核') {
        return { status: '审核中', statusType: 'info', actionText: '下架', action: 'offline', actionType: 'ghost' };
    }
    if (normalizedAudit === 'REJECTED' || normalizedAudit === '已驳回') {
        return { status: '审核驳回', statusType: 'danger', actionText: '下架', action: 'offline', actionType: 'ghost' };
    }
    const sv = Number(p.stockValue || p.stock || 0);
    if (sv <= 0)
        return { status: '库存低', statusType: 'warning', actionText: '下架', action: 'offline', actionType: 'ghost' };
    if (sv < 10)
        return { status: '库存低', statusType: 'warning', actionText: '下架', action: 'offline', actionType: 'ghost' };
    return { status: '出售中', statusType: 'success', actionText: '下架', action: 'offline', actionType: 'ghost' };
}
function mapToggledStatus(currentAction) {
    if (currentAction === 'online') {
        return { status: '出售中', statusType: 'success', actionText: '下架', action: 'offline', actionType: 'ghost' };
    }
    return { status: '已下架', statusType: 'danger', actionText: '上架', action: 'online', actionType: 'primary' };
}
Page({
    data: {
        pageStyle: '',
        loading: true,
        nav: [
            { name: '首页', icon: 'home', url: '/pages/merchant/dashboard/dashboard?tab=0', active: false, tab: 0 },
            { name: '聊天', icon: 'message', url: '/pages/merchant/messages/messages?tab=1', active: false, tab: 1 },
            { name: '订单', icon: 'invoice', url: '/pages/merchant/orders/orders?tab=2', active: false, tab: 2 },
            { name: '库存', icon: 'package', url: '/pages/merchant/products/products?tab=3', active: true, tab: 3 },
            { name: '账号', icon: 'profile', url: '/pages/merchant/shop/shop?tab=4', active: false, tab: 4 },
        ],
        tabs: [
            { name: '全部', active: true }, { name: '出售中', active: false },
            { name: '审核中', active: false }, { name: '已下架', active: false }, { name: '库存低', active: false },
        ],
        filters: [
            { name: '最新排序', active: true }, { name: '销量优先', active: false },
            { name: '库存低', active: false }, { name: '活动商品', active: false },
        ],
        allProducts: [],
        products: [],
        draftCount: 0,
    },
    onLoad() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        this.loadProducts();
        this.updateDraftCount();
    },
    async loadProducts() {
        this.setData({ loading: true });
        try {
            const result = await (0, merchant_1.fetchMerchantProducts)({ page: 1, pageSize: 100 });
            const items = (result.items || result || []);
            const dedupedItems = Array.from(new Map(items.map((item) => [String(item.productId || item.skuId || item.title || ''), item])).values());
            const allProducts = dedupedItems.map((p) => {
                const mapped = mapStatus(p);
                return {
                    id: String(p.productId),
                    productId: p.productId,
                    image: p.coverUrl || '/assets/goods/g1.svg',
                    title: p.title,
                    meta: `${p.categoryName || '未分类'} · ${p.subtitle || ''}`,
                    inventory: `库存 ${p.stockValue || p.stock || 0}`,
                    sales: `已售 -`,
                    extra: p.updatedAt ? `更新于 ${p.updatedAt.slice(5, 10)}` : '',
                    price: `¥${p.price || '0'}`,
                    status: mapped.status,
                    statusType: mapped.statusType,
                    actionText: mapped.actionText,
                    action: mapped.action,
                    actionType: mapped.actionType,
                };
            });
            this.setData({ allProducts, loading: false });
            this.applyFilter();
        }
        catch (e) {
            wx.showToast({ title: e.message || '加载失败', icon: 'none' });
            this.setData({ loading: false });
        }
    },
    updateDraftCount() {
        try {
            const raw1 = wx.getStorageSync('merchant_product_drafts') || '[]';
            const raw2 = wx.getStorageSync('merchant-product-draft-v2');
            const count1 = JSON.parse(raw1).length;
            const count2 = raw2 ? 1 : 0;
            this.setData({ draftCount: count1 + count2 });
        }
        catch {
            this.setData({ draftCount: 0 });
        }
    },
    applyFilter() {
        const all = this.data.allProducts;
        const activeTab = this.data.tabs.find((t) => t.active);
        const tabName = activeTab === null || activeTab === void 0 ? void 0 : activeTab.name;
        let filtered;
        if (!tabName || tabName === '全部')
            filtered = all;
        else if (tabName === '库存低')
            filtered = all.filter((p) => p.statusType === 'warning');
        else
            filtered = all.filter((p) => p.status === tabName);
        this.setData({ products: filtered });
    },
    goPage(e) { const url = e.currentTarget.dataset.url; if (url)
        wx.navigateTo({ url }); },
    goPublish() { wx.navigateTo({ url: '/pages/merchant/products/edit/edit' }); },
    goDrafts() { wx.navigateTo({ url: '/pages/merchant/product-drafts/product-drafts' }); },
    showSearch() { wx.showToast({ title: '搜索商品', icon: 'none' }); },
    showFilter() { wx.showToast({ title: '筛选已打开', icon: 'none' }); },
    onTabTap(e) {
        const index = Number(e.currentTarget.dataset.index);
        const tabs = this.data.tabs.map((item, idx) => ({ ...item, active: idx === index }));
        this.setData({ tabs }, () => this.applyFilter());
    },
    onFilterTap(e) {
        const index = Number(e.currentTarget.dataset.index);
        const filters = this.data.filters.map((item, idx) => ({ ...item, active: idx === index }));
        let filtered = this.data.allProducts;
        if (index === 2)
            filtered = filtered.filter((p) => p.statusType === 'warning');
        else if (index === 3)
            filtered = filtered.filter((p) => p.status === '出售中');
        this.setData({ filters, products: filtered });
    },
    editProduct(e) {
        var _a, _b;
        const productId = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.productId;
        if (productId)
            wx.navigateTo({ url: `/pages/merchant/products/edit/edit?productId=${productId}` });
        else
            wx.showToast({ title: '缺少商品ID', icon: 'none' });
    },
    async toggleProduct(e) {
        const action = e.currentTarget.dataset.action;
        const productId = Number(e.currentTarget.dataset.productId);
        if (!productId) {
            wx.showToast({ title: '缺少商品ID', icon: 'none' });
            return;
        }
        const newStatus = action === 'online' ? 'ON_SHELF' : 'OFF_SHELF';
        const optimistic = mapToggledStatus(action);
        const allProducts = this.data.allProducts.map((item) => {
            if (Number(item.productId) !== productId)
                return item;
            return { ...item, ...optimistic };
        });
        this.setData({ allProducts }, () => this.applyFilter());
        try {
            await (0, merchant_1.updateMerchantProductStatus)(productId, newStatus);
            wx.showToast({ title: action === 'online' ? '已上架' : '已下架', icon: 'success' });
        }
        catch (e) {
            wx.showToast({ title: e.message || '操作失败', icon: 'none' });
        }
    },
});
