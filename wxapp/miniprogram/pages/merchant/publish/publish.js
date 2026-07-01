"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
const request_1 = require("../../../services/request");
function toSpecJsonFromName(specGroups, skuName) {
    if (!Array.isArray(specGroups) || !specGroups.length || !skuName) {
        return {};
    }
    const values = String(skuName)
        .split(/[\/,，|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    const specJson = {};
    specGroups.forEach((group, index) => {
        var _a;
        const groupName = ((_a = group === null || group === void 0 ? void 0 : group.name) !== null && _a !== void 0 ? _a : `规格${index + 1}`);
        const matchedValue = values[index] || '';
        if (matchedValue) {
            specJson[groupName] = matchedValue;
        }
    });
    return specJson;
}
Page({
    data: {
        pageStyle: '',
        slug: 'publish',
        submitting: false,
        categoryName: '',
        categoryDisplayName: '',
        categoryId: 0,
        title: '',
        subtitle: '',
        description: '',
        price: '',
        stock: '',
        weight: '',
        skuList: [],
        specGroups: [],
        singleSku: null,
        specMode: 'multi',
        gallery: [],
        video: { cover: '', url: '' },
        serviceTags: [
            { name: '产地直发', active: false },
            { name: '顺丰冷链', active: false },
            { name: '坏果包赔', active: false },
            { name: '有机认证', active: false },
            { name: '48小时发货', active: false },
        ],
        presaleEnabled: false,
        traceEnabled: true,
        videoEnabled: false,
    },
    onLoad() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
    },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        const categoryDisplayName = String(this.data.categoryDisplayName || this.data.categoryName || '').trim();
        if (categoryDisplayName !== this.data.categoryDisplayName) {
            this.setData({ categoryDisplayName });
        }
        this.syncSkuSummary();
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/products/products' });
    },
    goImages() {
        wx.navigateTo({ url: '/pages/merchant/publish-images/publish-images' });
    },
    goSku() {
        wx.navigateTo({ url: '/pages/merchant/publish-sku/publish-sku' });
    },
    goDrafts() {
        wx.navigateTo({ url: '/pages/merchant/product-drafts/product-drafts' });
    },
    async uploadVideo() {
        try {
            wx.showLoading({ title: '选择视频中...' });
            const res = await wx.chooseMedia({
                count: 1,
                mediaType: ['video'],
                sourceType: ['album', 'camera'],
                maxDuration: 60,
            });
            wx.hideLoading();
            const tempFile = res.tempFiles[0];
            if (!tempFile)
                return;
            wx.showLoading({ title: '视频上传中...' });
            const result = await (0, request_1.upload)({
                url: '/files/upload',
                filePath: tempFile.tempFilePath,
                name: 'file',
            });
            wx.hideLoading();
            this.setData({
                video: {
                    cover: tempFile.thumbTempFilePath || '',
                    url: result.url,
                },
                videoEnabled: true,
            });
            wx.showToast({ title: '视频已上传', icon: 'success' });
        }
        catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '上传失败', icon: 'none' });
            console.error('Failed to upload product video:', err);
        }
    },
    onTitleInput(e) {
        this.setData({ title: e.detail.value });
    },
    onSubtitleInput(e) {
        this.setData({ subtitle: e.detail.value });
    },
    onDescInput(e) {
        this.setData({ description: e.detail.value });
    },
    onSpecModeChange(e) {
        this.setData({ specMode: e.currentTarget.dataset.mode }, () => {
            this.syncSkuSummary();
        });
    },
    onServiceTagTap(e) {
        const index = Number(e.currentTarget.dataset.index);
        const tags = this.data.serviceTags.slice();
        tags[index] = { ...tags[index], active: !tags[index].active };
        this.setData({ serviceTags: tags });
    },
    onPresaleSwitch(e) {
        this.setData({ presaleEnabled: e.detail.value });
    },
    onTraceSwitch(e) {
        this.setData({ traceEnabled: e.detail.value });
    },
    onVideoSwitch(e) {
        this.setData({ videoEnabled: e.detail.value });
    },
    buildPayload() {
        const activeTags = this.data.serviceTags
            .filter((t) => t.active)
            .map((t) => t.name);
        const { specMode, skuList, specGroups, singleSku } = this.data;
        const normalizedSingleSku = singleSku || (Array.isArray(skuList) ? skuList[0] : null);
        const activeSkuList = Array.isArray(skuList)
            ? skuList.filter((item) => item && item.enabled !== false && item.price !== '')
            : [];
        const isMulti = specMode === 'multi';
        const normalizedSkus = isMulti
            ? activeSkuList.map((item, index) => ({
                skuName: item.skuName || item.name || `规格${index + 1}`,
                skuCode: item.skuCode || item.code || '',
                price: item.price || '0',
                stock: Number(item.stock) || 0,
                safetyStock: Number(item.safetyStock) || 0,
                specJson: item.specJson && Object.keys(item.specJson).length
                    ? item.specJson
                    : toSpecJsonFromName(specGroups, item.skuName || item.name || ''),
                status: item.enabled === false ? 'OFFLINE' : 'ONLINE',
            }))
            : normalizedSingleSku && normalizedSingleSku.price !== ''
                ? [
                    {
                        skuName: normalizedSingleSku.skuName || normalizedSingleSku.name || '默认规格',
                        skuCode: normalizedSingleSku.skuCode || normalizedSingleSku.code || '',
                        price: normalizedSingleSku.price || '0',
                        stock: Number(normalizedSingleSku.stock) || 0,
                        safetyStock: Number(normalizedSingleSku.safetyStock) || 0,
                        specJson: normalizedSingleSku.specJson || {},
                        status: normalizedSingleSku.enabled === false ? 'OFFLINE' : 'ONLINE',
                    },
                ]
                : [];
        const summaryPrice = isMulti
            ? (normalizedSkus[0] === null || normalizedSkus[0] === void 0 ? void 0 : normalizedSkus[0].price) || this.data.price || '0'
            : (normalizedSingleSku === null || normalizedSingleSku === void 0 ? void 0 : normalizedSingleSku.price) || this.data.price || '0';
        const summaryStock = isMulti
            ? normalizedSkus.reduce((sum, item) => sum + (Number(item.stock) || 0), 0)
            : Number((normalizedSingleSku === null || normalizedSingleSku === void 0 ? void 0 : normalizedSingleSku.stock) !== null && (normalizedSingleSku === null || normalizedSingleSku === void 0 ? void 0 : normalizedSingleSku.stock) !== void 0 ? normalizedSingleSku === null || normalizedSingleSku === void 0 ? void 0 : normalizedSingleSku.stock : this.data.stock) || 0;
        return {
            title: this.data.title,
            subtitle: this.data.subtitle || undefined,
            categoryId: this.data.categoryId,
            coverUrl: this.data.gallery[0] || undefined,
            images: this.data.gallery,
            videos: this.data.videoEnabled && this.data.video.url
                ? [{ videoUrl: this.data.video.url, coverUrl: this.data.video.cover }]
                : undefined,
            detailDesc: this.data.description || undefined,
            originPlace: undefined,
            serviceTags: activeTags,
            price: summaryPrice,
            stock: summaryStock,
            skuMode: isMulti ? 'MULTI' : 'SINGLE',
            specJson: !isMulti && (normalizedSingleSku === null || normalizedSingleSku === void 0 ? void 0 : normalizedSingleSku.specJson) ? normalizedSingleSku.specJson : {},
            skus: normalizedSkus,
        };
    },
    syncSkuSummary() {
        var _a, _b, _c;
        const { specMode, skuList, singleSku } = this.data;
        if (specMode === 'single') {
            const currentSku = singleSku || (Array.isArray(skuList) ? skuList[0] : null);
            this.setData({
                price: ((_a = currentSku === null || currentSku === void 0 ? void 0 : currentSku.price) !== null && _a !== void 0 ? _a : ''),
                stock: (_b = currentSku === null || currentSku === void 0 ? void 0 : currentSku.stock) !== null && _b !== void 0 ? _b : '',
                weight: ((_c = currentSku === null || currentSku === void 0 ? void 0 : currentSku.skuName) !== null && _c !== void 0 ? _c : currentSku === null || currentSku === void 0 ? void 0 : currentSku.name) || '',
            });
            return;
        }
        const activeSkuList = Array.isArray(skuList)
            ? skuList.filter((item) => item && item.enabled !== false && item.price !== '')
            : [];
        if (!activeSkuList.length) {
            this.setData({
                price: '',
                stock: '',
                weight: '',
            });
            return;
        }
        const prices = activeSkuList
            .map((item) => Number(item.price))
            .filter((value) => Number.isFinite(value));
        const minPrice = prices.length ? Math.min(...prices) : 0;
        const maxPrice = prices.length ? Math.max(...prices) : 0;
        const totalStock = activeSkuList.reduce((sum, item) => sum + (Number(item.stock) || 0), 0);
        const displayPrice = prices.length
            ? minPrice === maxPrice
                ? String((activeSkuList[0] === null || activeSkuList[0] === void 0 ? void 0 : activeSkuList[0].price) || minPrice)
                : `${minPrice}-${maxPrice}`
            : '';
        const firstSku = activeSkuList[0];
        const displayWeight = activeSkuList.length === 1
            ? (firstSku === null || firstSku === void 0 ? void 0 : firstSku.skuName) || (firstSku === null || firstSku === void 0 ? void 0 : firstSku.name) || ''
            : `${activeSkuList.length}个规格`;
        this.setData({
            price: displayPrice,
            stock: totalStock,
            weight: displayWeight,
        });
    },
    async saveDraft() {
        const payload = this.buildPayload();
        // 写入共享本地草稿存储
        this.saveToLocalDrafts(payload);
        try {
            const result = await (0, merchant_1.syncMerchantProductDraft)(payload);
            if (result) {
                wx.showToast({ title: '已保存草稿', icon: 'success' });
            }
            else {
                wx.showToast({ title: '已保存到本地', icon: 'success' });
            }
        }
        catch {
            wx.showToast({ title: '已保存到本地', icon: 'success' });
        }
    },
    saveToLocalDrafts(payload) {
        try {
            const raw = wx.getStorageSync('merchant_product_drafts') || '[]';
            const drafts = JSON.parse(raw);
            drafts.unshift({
                id: `draft_${Date.now()}`,
                title: payload.title || '未命名商品',
                icon: 'edit',
                desc: `保存于 ${new Date().toLocaleTimeString()}`,
                savedAt: Date.now(),
                action: 'edit',
                actionLabel: '继续编辑',
                actionType: 'primary',
                payload,
            });
            // 最多保留 20 条
            wx.setStorageSync('merchant_product_drafts', JSON.stringify(drafts.slice(0, 20)));
        }
        catch { /* 静默 */ }
    },
    async submitPublish() {
        if (!this.data.title.trim()) {
            wx.showToast({ title: '请填写商品标题', icon: 'none' });
            return;
        }
        if (!String(this.data.price || '').trim()) {
            wx.showToast({ title: '请先填写规格价格', icon: 'none' });
            return;
        }
        this.setData({ submitting: true });
        try {
            await (0, merchant_1.createMerchantProduct)(this.buildPayload());
            wx.showToast({ title: '已提交上架审核', icon: 'success' });
            setTimeout(() => {
                wx.navigateBack({ delta: 1 });
            }, 800);
        }
        catch (e) {
            wx.showToast({ title: e.message || '提交失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        }
    },
});
