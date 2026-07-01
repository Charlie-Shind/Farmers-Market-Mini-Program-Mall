"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: {
        pageStyle: '',
        productId: 0,
        loading: true,
        saving: false,
        specMode: 'single',
        skuList: [],
        title: '',
        subtitle: '',
        categoryName: '',
        categoryOptions: ['时令果蔬 / 新鲜水果', '粮油调味 / 大米', '茶饮酒水 / 茶叶', '肉禽蛋奶 / 鸡蛋'],
        price: '',
        crossedPrice: '',
        totalStock: '0',
        description: '',
        origin: '',
        traceCode: '',
        traceDesc: '',
        presaleMode: 'spot',
        gallery: [],
        video: { cover: '', duration: 0 },
        activeSkus: [],
        serviceTags: [],
        extraFilled: 0,
    },
    onLoad(options) {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        const productId = Number(options.productId) || 0;
        if (productId) {
            this.setData({ productId });
            this.loadDetail(productId);
        }
    },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        // 从 publish-sku 回传的数据会通过 prev.setData 注入，这里读取
        this.refreshSkuSummary();
    },
    refreshSkuSummary() {
        var _a, _b;
        const skuList = this.data.skuList;
        const specMode = this.data.specMode;
        if (!skuList.length)
            return;
        if (specMode === 'multi') {
            const active = skuList.filter((s) => s.enabled !== false);
            const totalStock = active.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
            const firstPrice = ((_a = active[0]) === null || _a === void 0 ? void 0 : _a.price) || ((_b = skuList[0]) === null || _b === void 0 ? void 0 : _b.price) || '';
            this.setData({
                totalStock: String(totalStock),
                price: firstPrice,
                activeSkus: active.map((s) => s.name),
            });
        }
        else {
            const s = skuList[0] || {};
            this.setData({
                price: s.price || this.data.price,
                crossedPrice: s.originalPrice || this.data.crossedPrice,
                totalStock: s.stock || this.data.totalStock,
                activeSkus: ['默认'],
            });
        }
    },
    async loadDetail(productId) {
        var _a, _b;
        this.setData({ loading: true });
        try {
            const detail = await (0, merchant_1.fetchMerchantProductDetail)(productId);
            if (!detail) {
                wx.showToast({ title: '商品不存在', icon: 'none' });
                this.setData({ loading: false });
                return;
            }
            const tags = (detail.serviceTags || []).map((t) => ({
                name: t.title || t,
                active: true,
                key: t.key || '',
            }));
            const extraFilled = [detail.originPlace, detail.traceCode, detail.traceDesc].filter(Boolean).length;
            const isMulti = detail.specJson && typeof detail.specJson === 'object' && Object.keys(detail.specJson).length > 0;
            const specMode = isMulti ? 'multi' : 'single';
            const skuList = isMulti
                ? [{
                        id: 'sku1', name: detail.skuName || '默认', code: '', price: detail.price || '',
                        stock: String(detail.stock || 0), activityPrice: '', limit: '', enabled: true,
                    }]
                : [{
                        price: detail.price || '', originalPrice: detail.originalPrice || '',
                        stock: String(detail.stock || 0), safetyStock: '', limit: '', code: '',
                    }];
            const activeSkus = isMulti ? [detail.skuName || '默认'] : ['默认'];
            this.setData({
                title: detail.title || '',
                subtitle: detail.subtitle || '',
                categoryName: detail.categoryName || '',
                price: detail.price || '',
                crossedPrice: detail.originalPrice || '',
                totalStock: String(detail.stock || 0),
                description: detail.detailDesc || '',
                origin: detail.originPlace || '',
                traceCode: detail.traceCode || '',
                traceDesc: detail.traceDesc || '',
                gallery: detail.images || [],
                video: { cover: ((_b = (_a = detail.videos) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.coverUrl) || '', duration: 0 },
                serviceTags: tags.length ? tags : [
                    { name: '坏果包赔', active: true }, { name: '冷链直发', active: true },
                    { name: '产地直发', active: true }, { name: '现货速发', active: false },
                ],
                specMode,
                skuList: isMulti ? skuList : [],
                activeSkus,
                extraFilled,
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
        wx.navigateTo({ url: '/pages/merchant/products/products' });
    },
    goDrafts() { wx.navigateTo({ url: '/pages/merchant/product-drafts/product-drafts' }); },
    goImages() { wx.navigateTo({ url: '/pages/merchant/publish-images/publish-images' }); },
    goSku() {
        wx.navigateTo({ url: `/pages/merchant/publish-sku/publish-sku?productId=${this.data.productId}` });
    },
    scrollTo(e) {
        wx.pageScrollTo({ selector: `#${e.currentTarget.dataset.target}`, duration: 200 });
    },
    chooseImage() { wx.showToast({ title: '接 wx.chooseMedia', icon: 'none' }); },
    reuploadVideo() { wx.showToast({ title: '重新上传视频', icon: 'none' }); },
    deleteVideo() {
        wx.showModal({
            title: '删除视频', content: '确定删除商品视频？',
            success: (res) => {
                if (res.confirm) {
                    this.setData({ 'video.cover': '', 'video.duration': 0 });
                    wx.showToast({ title: '已删除', icon: 'success' });
                }
            },
        });
    },
    onCategoryChange(e) {
        const idx = Number(e.detail.value);
        this.setData({ categoryName: this.data.categoryOptions[idx] });
    },
    onTitleInput(e) { this.setData({ title: e.detail.value }); },
    onSubtitleInput(e) { this.setData({ subtitle: e.detail.value }); },
    onPriceInput(e) { this.setData({ price: e.detail.value }); },
    onCrossedPriceInput(e) { this.setData({ crossedPrice: e.detail.value }); },
    onDescInput(e) { this.setData({ description: e.detail.value }); },
    onOriginInput(e) { this.setData({ origin: e.detail.value }); },
    onTraceCodeInput(e) { this.setData({ traceCode: e.detail.value }); },
    onTraceDescInput(e) { this.setData({ traceDesc: e.detail.value }); },
    onServiceTagTap(e) {
        const idx = Number(e.currentTarget.dataset.index);
        const tags = this.data.serviceTags.slice();
        tags[idx] = { ...tags[idx], active: !tags[idx].active };
        this.setData({ serviceTags: tags });
    },
    onPresaleChange(e) { this.setData({ presaleMode: e.currentTarget.dataset.mode }); },
    buildPayload() {
        const activeTags = this.data.serviceTags.filter((t) => t.active).map((t) => t.name);
        return {
            title: this.data.title, subtitle: this.data.subtitle || undefined, categoryId: 0,
            coverUrl: this.data.gallery[0] || undefined, images: this.data.gallery,
            detailDesc: this.data.description || undefined, originPlace: this.data.origin || undefined,
            serviceTags: activeTags, price: this.data.price, originalPrice: this.data.crossedPrice || undefined,
            traceCode: this.data.traceCode || undefined, traceDesc: this.data.traceDesc || undefined,
            presaleMode: this.data.presaleMode === 'presale',
        };
    },
    async saveDraft() {
        const payload = this.buildPayload();
        try {
            const raw = wx.getStorageSync('merchant_product_drafts') || '[]';
            const drafts = JSON.parse(raw);
            drafts.unshift({ id: `draft_${Date.now()}`, title: payload.title || '未命名商品', icon: 'edit', desc: `保存于 ${new Date().toLocaleTimeString()}`, savedAt: Date.now(), action: 'edit', actionLabel: '继续编辑', actionType: 'primary', payload });
            wx.setStorageSync('merchant_product_drafts', JSON.stringify(drafts.slice(0, 20)));
        }
        catch { /* */ }
        try {
            const result = await (0, merchant_1.syncMerchantProductDraft)(payload);
            wx.showToast({ title: result ? '已保存草稿' : '已保存到本地', icon: 'success' });
        }
        catch {
            wx.showToast({ title: '已保存到本地', icon: 'success' });
        }
    },
    async submitPublish() {
        if (!this.data.title.trim()) {
            wx.showToast({ title: '请填写商品标题', icon: 'none' });
            return;
        }
        const productId = this.data.productId;
        if (!productId) {
            wx.showToast({ title: '缺少商品 ID', icon: 'none' });
            return;
        }
        this.setData({ saving: true });
        try {
            await (0, merchant_1.updateMerchantProduct)(productId, this.buildPayload());
            wx.showToast({ title: '已提交上架', icon: 'success' });
            setTimeout(() => { wx.navigateBack({ delta: 1 }); }, 800);
        }
        catch (e) {
            wx.showToast({ title: e.message || '保存失败', icon: 'none' });
        }
        finally {
            this.setData({ saving: false });
        }
    },
});
