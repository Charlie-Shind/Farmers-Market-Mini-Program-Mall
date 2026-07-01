import { buildPageTopStyle } from '../../../utils/page-layout';
import { createMerchantProduct, syncMerchantProductDraft } from '../../../services/merchant';
import { upload } from '../../../services/request';

function toSpecJsonFromName(specGroups: any[], skuName: string) {
  const names = Array.isArray(specGroups) ? specGroups.map((group: any) => String(group?.name || '').trim()) : [];
  const values = String(skuName || '').split(' / ').map((item) => item.trim()).filter(Boolean);
  const specJson: Record<string, string> = {};

  names.forEach((name, index) => {
    if (name && values[index]) {
      specJson[name] = values[index];
    }
  });

  return specJson;
}

Page<Record<string, any>, Record<string, any>>({
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
    specMode: 'multi',
    skuList: [] as any[],
    specGroups: [] as any[],
    singleSku: null as any,
    gallery: [] as string[],
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
    this.setData({ pageStyle: buildPageTopStyle(8) });
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
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
      if (!tempFile) return;

      wx.showLoading({ title: '视频上传中...' });
      const result = await upload<{ url: string }>({
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
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'none' });
      console.error('Failed to upload product video:', err);
    }
  },

  onTitleInput(e: any) {
    this.setData({ title: e.detail.value });
  },

  onSubtitleInput(e: any) {
    this.setData({ subtitle: e.detail.value });
  },

  onDescInput(e: any) {
    this.setData({ description: e.detail.value });
  },

  onSpecModeChange(e: any) {
    this.setData({ specMode: e.currentTarget.dataset.mode }, () => this.syncSkuSummary());
  },

  syncSkuSummary() {
    const specMode = this.data.specMode as string;

    if (specMode === 'single' && this.data.singleSku) {
      const singleSku = this.data.singleSku as any;
      this.setData({
        price: singleSku.price || '',
        stock: singleSku.stock || '',
        weight: singleSku.code || '单规格',
      });
      return;
    }

    const skuList = ((this.data.skuList as any[]) || []).filter((item: any) => item && item.enabled !== false);
    if (!skuList.length) {
      this.setData({
        price: '',
        stock: '',
        weight: '',
      });
      return;
    }

    const priceValues = skuList
      .map((item: any) => Number(item.price))
      .filter((value: number) => Number.isFinite(value) && value >= 0);
    const stockTotal = skuList.reduce((sum: number, item: any) => sum + (Number(item.stock) || 0), 0);

    let priceText = '';
    if (priceValues.length) {
      const minPrice = Math.min(...priceValues);
      const maxPrice = Math.max(...priceValues);
      priceText = minPrice === maxPrice ? String(minPrice) : `${minPrice}-${maxPrice}`;
    }

    this.setData({
      price: priceText,
      stock: String(stockTotal),
      weight: skuList.length === 1 ? (skuList[0].name || skuList[0].skuName || '单规格') : `${skuList.length}个规格`,
    });
  },

  onServiceTagTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const tags = (this.data.serviceTags as any[]).slice();
    tags[index] = { ...tags[index], active: !tags[index].active };
    this.setData({ serviceTags: tags });
  },

  onPresaleSwitch(e: any) {
    this.setData({ presaleEnabled: e.detail.value });
  },

  onTraceSwitch(e: any) {
    this.setData({ traceEnabled: e.detail.value });
  },

  onVideoSwitch(e: any) {
    this.setData({ videoEnabled: e.detail.value });
  },

  buildPayload() {
    const activeTags = (this.data.serviceTags as any[])
      .filter((t: any) => t.active)
      .map((t: any) => t.name);

    const specMode = this.data.specMode === 'multi' ? 'MULTI' : 'SINGLE';
    const specGroups = (this.data.specGroups as any[]) || [];
    const singleSku = (this.data.singleSku as any) || null;
    const enabledSkuList = ((this.data.skuList as any[]) || []).filter((item: any) => item && item.enabled !== false);
    const skus = specMode === 'MULTI'
      ? enabledSkuList.map((item: any) => ({
          skuName: item.name || item.skuName || '规格项',
          skuCode: item.code || undefined,
          price: item.price || this.data.price || '0',
          originalPrice: item.originalPrice || undefined,
          stock: Number(item.stock) || 0,
          safetyStock: item.safetyStock ? Number(item.safetyStock) : undefined,
          specJson: toSpecJsonFromName(specGroups, item.name || item.skuName || ''),
          status: item.enabled === false ? 2 : 1,
        }))
      : [
          {
            skuName: this.data.weight || singleSku?.skuName || '规格项',
            skuCode: singleSku?.code || undefined,
            price: singleSku?.price || this.data.price || '0',
            originalPrice: singleSku?.originalPrice || undefined,
            stock: Number(singleSku?.stock ?? this.data.stock) || 0,
            safetyStock: singleSku?.safetyStock ? Number(singleSku.safetyStock) : undefined,
            specJson: {},
            status: 1,
          },
        ];
    const basePrice = skus[0]?.price || this.data.price || '0';
    const baseStock = Number(skus[0]?.stock ?? this.data.stock) || 0;

    return {
      title: this.data.title,
      subtitle: this.data.subtitle || undefined,
      categoryId: this.data.categoryId,
      coverUrl: (this.data.gallery as string[])[0] || undefined,
      images: this.data.gallery,
      videos: this.data.videoEnabled && this.data.video.url
        ? [{ videoUrl: this.data.video.url, coverUrl: this.data.video.cover }]
        : undefined,
      detailDesc: this.data.description || undefined,
      originPlace: undefined,
      serviceTags: activeTags,
      price: basePrice,
      stock: baseStock,
      skuMode: specMode,
      specJson: specMode === 'MULTI' ? (skus[0]?.specJson || {}) : {},
      skus,
    };
  },

  async saveDraft() {
    const payload = this.buildPayload();
    // 写入共享本地草稿存储
    this.saveToLocalDrafts(payload);

    try {
      const result = await syncMerchantProductDraft(payload);
      if (result) {
        wx.showToast({ title: '已保存草稿', icon: 'success' });
      } else {
        wx.showToast({ title: '已保存到本地', icon: 'success' });
      }
    } catch {
      wx.showToast({ title: '已保存到本地', icon: 'success' });
    }
  },

  saveToLocalDrafts(payload: Record<string, any>) {
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
    } catch { /* 静默 */ }
  },

  async submitPublish() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请填写商品标题', icon: 'none' });
      return;
    }
    if (!this.data.price) {
      wx.showToast({ title: '请先填写规格价格', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await createMerchantProduct(this.buildPayload());
      wx.showToast({ title: '已提交上架审核', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({ delta: 1 });
      }, 800);
    } catch (e: any) {
      wx.showToast({ title: e.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
