"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: {
        pageStyle: '',
        slug: 'inventory',
        stockFilter: 'all',
        showFilter: false,
        sheetStock: 'all',
        sheetCategory: 'all',
        loading: true,
        products: [],
        filteredProducts: [],
    },
    onLoad() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
    },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        this.loadProducts();
    },
    async loadProducts() {
        this.setData({ loading: true });
        try {
            const result = await (0, merchant_1.fetchMerchantProducts)({ page: 1, pageSize: 50 });
            const list = result.items || result || [];
            const products = list.map((p) => ({
                id: String(p.productId),
                skuId: p.skuId,
                img: p.coverUrl || '/assets/goods/g1.svg',
                title: p.title,
                stock: Number(p.stock) || Number(p.stockValue) || 0,
                meta: `${p.categoryName || '未分类'} · ${p.auditStatus === 'APPROVED' ? '已审核' : '审核中'}`,
                listed: p.status === 'ON_SHELF',
            }));
            this.setData({ products, loading: false }, () => this.applyFilter());
        }
        catch (e) {
            wx.showToast({ title: e.message || '加载失败', icon: 'none' });
            this.setData({ loading: false });
        }
    },
    applyFilter() {
        const products = this.data.products;
        const filter = this.data.stockFilter;
        let filtered;
        if (filter === 'low')
            filtered = products.filter((p) => p.stock > 0 && p.stock < 10);
        else if (filter === 'zero')
            filtered = products.filter((p) => p.stock <= 0);
        else if (filter === 'normal')
            filtered = products.filter((p) => p.stock >= 10);
        else
            filtered = products;
        this.setData({ filteredProducts: filtered });
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/products/products' });
    },
    onStockFilterTap(e) {
        this.setData({ stockFilter: e.currentTarget.dataset.filter }, () => this.applyFilter());
    },
    decreaseStock(e) {
        const { skuid, stock: currentStock } = e.currentTarget.dataset;
        wx.showModal({
            title: '减少库存',
            editable: true,
            placeholderText: '请输入减少数量',
            success: async (res) => {
                if (!res.confirm || !res.content)
                    return;
                const delta = parseInt(res.content, 10);
                if (!delta || delta <= 0) {
                    wx.showToast({ title: '请输入有效数量', icon: 'none' });
                    return;
                }
                const newStock = Math.max(0, Number(currentStock) - delta);
                await this.applyStockChange(skuid, newStock);
            },
        });
    },
    increaseStock(e) {
        const { skuid, stock: currentStock } = e.currentTarget.dataset;
        wx.showModal({
            title: '增加库存',
            editable: true,
            placeholderText: '请输入增加数量',
            success: async (res) => {
                if (!res.confirm || !res.content)
                    return;
                const delta = parseInt(res.content, 10);
                if (!delta || delta <= 0) {
                    wx.showToast({ title: '请输入有效数量', icon: 'none' });
                    return;
                }
                const newStock = Number(currentStock) + delta;
                await this.applyStockChange(skuid, newStock);
            },
        });
    },
    async applyStockChange(skuId, stock) {
        try {
            await (0, merchant_1.updateMerchantSkuStock)(skuId, stock);
            wx.showToast({ title: '库存已更新', icon: 'success' });
            this.loadProducts();
        }
        catch (e) {
            wx.showToast({ title: e.message || '更新失败', icon: 'none' });
        }
    },
    openFilter() {
        this.setData({ showFilter: true });
    },
    closeFilter() {
        this.setData({ showFilter: false });
    },
    setSheetStock(e) {
        this.setData({ sheetStock: e.currentTarget.dataset.val });
    },
    setSheetCategory(e) {
        this.setData({ sheetCategory: e.currentTarget.dataset.val });
    },
    resetSheetFilter() {
        this.setData({ sheetStock: 'all', sheetCategory: 'all' });
    },
    applySheetFilter() {
        this.setData({ stockFilter: this.data.sheetStock, showFilter: false });
    },
});
