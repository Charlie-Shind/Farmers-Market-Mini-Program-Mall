import { buildPageTopStyle } from '../../../utils/page-layout';
import { syncMerchantProductDraft } from '../../../services/merchant';

const DRAFTS_STORAGE_KEY = 'merchant_product_drafts';
const DRAFTS_V2_KEY = 'merchant-product-draft-v2';

interface DraftItem {
  id: string;
  title: string;
  icon: string;
  desc: string;
  savedAt: number;
  action: 'edit' | 'images' | 'sku' | 'publish';
  actionLabel: string;
  actionType: string;
  payload: Record<string, any>;
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    slug: 'product-drafts',
    searchKeyword: '',
    filterTab: 'all',
    showFilter: false,
    sheetCompleteness: 'all',
    sheetTime: 'recent',
    allDrafts: [] as DraftItem[],
    drafts: [] as DraftItem[],
  },

  onLoad() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
    this.loadDrafts();
  },

  loadDrafts() {
    try {
      const allDrafts: DraftItem[] = [];

      // V1 草稿（旧 publish 页面的简单格式）
      const raw1 = wx.getStorageSync(DRAFTS_STORAGE_KEY);
      if (raw1) {
        const v1Drafts = JSON.parse(raw1) as DraftItem[];
        allDrafts.push(...v1Drafts.map((d) => ({ ...d, _source: 'v1' as const })));
      }

      // V2 草稿（products/edit/edit 完整格式）
      const raw2 = wx.getStorageSync(DRAFTS_V2_KEY);
      if (raw2) {
        const v2 = typeof raw2 === 'string' ? JSON.parse(raw2) : raw2;
        if (v2 && v2.form) {
          allDrafts.push({
            id: `v2_${Date.now()}`,
            title: v2.form?.title || '未命名商品',
            icon: 'edit',
            desc: `保存于 ${new Date(v2.savedAt || Date.now()).toLocaleTimeString()}`,
            savedAt: v2.savedAt || Date.now(),
            action: 'edit',
            actionLabel: '继续编辑',
            actionType: 'primary',
            payload: v2,
            _source: 'v2' as const,
          } as DraftItem & { _source: string });
        }
      }

      this.setData({ allDrafts }, () => this.applyFilter());
    } catch {
      this.setData({ allDrafts: [], drafts: [] });
    }
  },

  applyFilter() {
    const allDrafts = this.data.allDrafts as (DraftItem & { _source?: string })[];
    const tab = this.data.filterTab as string;
    const keyword = (this.data.searchKeyword as string || '').toLowerCase();

    let list = allDrafts;

    function getPayload(d: typeof list[0]) {
      const p = d.payload;
      // v2 格式: { form: { title, price, images, ... }, ... }
      if (p.form) {
        const f = p.form as Record<string, any>;
        return {
          title: f.title || d.title,
          price: f.price || '',
          images: Array.isArray(f.images) ? f.images : [],
          skus: Array.isArray(p.generatedSkuRows) ? p.generatedSkuRows : [],
        };
      }
      // v1 格式: { title, price, images, skus, ... }
      return p as Record<string, any>;
    }

    // 筛选 Tab
    if (tab === 'noimage') {
      list = list.filter((d) => {
        const p = getPayload(d);
        return !p.images || !(p.images as any[]).length;
      });
    } else if (tab === 'noprice') {
      list = list.filter((d) => {
        const p = getPayload(d);
        return !p.price;
      });
    } else if (tab === 'nosku') {
      list = list.filter((d) => {
        const p = getPayload(d);
        return !p.skus || !(p.skus as any[]).length;
      });
    } else if (tab === 'ready') {
      list = list.filter((d) => {
        const p = getPayload(d);
        return p.title && p.price && (p.images as any[])?.length;
      });
    }

    // 搜索
    if (keyword) {
      list = list.filter((d) => d.title.toLowerCase().includes(keyword));
    }

    // 排序
    list.sort((a, b) => b.savedAt - a.savedAt);

    this.setData({ drafts: list });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/products/products' });
  },

  goPublish() {
    wx.navigateTo({ url: '/pages/merchant/publish/publish' });
  },

  onSearchInput(e: any) {
    this.setData({ searchKeyword: e.detail.value }, () => this.applyFilter());
  },

  onFilterTabTap(e: any) {
    this.setData({ filterTab: e.currentTarget.dataset.tab }, () => this.applyFilter());
  },

  onDraftAction(e: any) {
    const { id, action } = e.currentTarget.dataset;
    if (action === 'edit') {
      const allDrafts = (this.data.allDrafts as (DraftItem & { _source?: string })[]);
      const draft = allDrafts.find((d) => d.id === id);
      if (draft?._source === 'v2') {
        // v2 草稿: edit 页面会自动 restore
        wx.navigateTo({ url: '/pages/merchant/products/edit/edit' });
      } else if (draft?._source === 'v1') {
        // v1 草稿: 转换为 v2 格式写入 storage，再跳转
        const p = draft.payload || {};
        const v2 = {
          form: {
            title: p.title || '',
            subtitle: p.subtitle || '',
            coverUrl: (Array.isArray(p.images) ? p.images[0] : '') || p.coverUrl || '',
            skuName: p.weight || '规格项',
            price: p.price || '',
            originalPrice: '',
            stock: String(p.stock || 0),
            originPlace: p.originPlace || '',
            traceCode: '',
            traceDesc: '',
            detailDesc: p.detailDesc || p.description || '',
            images: Array.isArray(p.images) ? p.images : [],
            videoUrl: '',
            videoCover: '',
            serviceTagKeys: Array.isArray(p.serviceTags) ? p.serviceTags : [],
            isPreSale: false,
            offlinePrice: '',
            safetyStock: '',
          },
          selectedCategory: p.categoryId ? { id: p.categoryId, name: '', iconUrl: '', sortOrder: 0, children: [] } : null,
          isMultiSpec: p.skuMode === 'MULTI',
          specGroups: [],
          generatedSkuRows: Array.isArray(p.skus) ? p.skus.map((s: any) => ({
            key: s.skuName || '规格项',
            label: s.skuName || '规格项',
            skuName: s.skuName || '规格项',
            specJson: s.specJson || {},
            price: s.price || p.price || '0',
            originalPrice: s.originalPrice || '',
            stock: String(s.stock || 0),
            skuImageUrl: '',
          })) : [],
          savedAt: Date.now(),
        };
        wx.setStorageSync('merchant-product-draft-v2', v2);
        wx.navigateTo({ url: '/pages/merchant/products/edit/edit' });
      } else {
        wx.navigateTo({ url: '/pages/merchant/products/edit/edit' });
      }
    } else if (action === 'images') {
      wx.navigateTo({ url: '/pages/merchant/publish-images/publish-images' });
    } else if (action === 'sku') {
      wx.navigateTo({ url: '/pages/merchant/publish-sku/publish-sku' });
    } else if (action === 'publish') {
      // 尝试发布草稿
      this.publishDraft(id);
    }
  },

  async publishDraft(draftId: string) {
    const allDrafts = (this.data.allDrafts as (DraftItem & { _source?: string })[]).slice();
    const draft = allDrafts.find((d) => d.id === draftId);
    if (!draft) return;

    try {
      if (draft._source === 'v2') {
        // v2 草稿：使用 createMerchantProduct 直接发布
        const { createMerchantProduct } = require('../../../services/merchant');
        await createMerchantProduct(draft.payload);
      } else {
        // v1 草稿：使用旧 sync 接口
        const result = await syncMerchantProductDraft(draft.payload);
        if (!result) {
          wx.showToast({ title: '后端草稿接口未就绪', icon: 'none' });
          return;
        }
      }
      // 发布成功，从本地删除
      const remaining = allDrafts.filter((d) => d.id !== draftId);
      this.saveDraftsToStorage(remaining);
      wx.showToast({ title: '已发布', icon: 'success' });
    } catch {
      wx.showToast({ title: '发布失败，请检查商品信息', icon: 'none' });
    }
  },

  cleanDrafts() {
    wx.showModal({
      title: '清理无效草稿',
      content: '将删除缺少标题或价格的草稿，确定继续？',
      success: (res) => {
        if (res.confirm) {
          const allDrafts = (this.data.allDrafts as (DraftItem & { _source?: string })[]).slice();
          const remaining = allDrafts.filter((d) => {
            if (d._source === 'v2') {
              const f = d.payload?.form as Record<string, any> | undefined;
              return f?.title && f?.price;
            }
            return d.payload?.title && d.payload?.price;
          });
          this.saveDraftsToStorage(remaining);
          wx.showToast({ title: `已清理 ${allDrafts.length - remaining.length} 条`, icon: 'success' });
        }
      },
    });
  },

  saveDraftsToStorage(drafts: (DraftItem & { _source?: string })[]) {
    try {
      const v1 = drafts.filter((d) => d._source === 'v1');
      const v2 = drafts.filter((d) => d._source === 'v2');
      wx.setStorageSync(DRAFTS_STORAGE_KEY, JSON.stringify(v1));
      if (v2.length > 0) {
        wx.setStorageSync(DRAFTS_V2_KEY, v2[v2.length - 1].payload);
      } else {
        try { wx.removeStorageSync(DRAFTS_V2_KEY); } catch { /* */ }
      }
      this.setData({ allDrafts: drafts }, () => this.applyFilter());
    } catch {
      wx.showToast({ title: '存储空间不足', icon: 'none' });
    }
  },

  openFilter() {
    this.setData({ showFilter: true });
  },

  closeFilter() {
    this.setData({ showFilter: false });
  },

  setCompleteness(e: any) {
    this.setData({ sheetCompleteness: e.currentTarget.dataset.val });
  },

  setTimeFilter(e: any) {
    this.setData({ sheetTime: e.currentTarget.dataset.val });
  },

  resetFilter() {
    this.setData({ sheetCompleteness: 'all', sheetTime: 'recent' });
  },

  applySheetFilter() {
    const completeness = this.data.sheetCompleteness as string;
    if (completeness === 'ready') {
      this.setData({ filterTab: 'ready' });
    } else if (completeness === 'noimage') {
      this.setData({ filterTab: 'noimage' });
    } else if (completeness === 'nosku') {
      this.setData({ filterTab: 'nosku' });
    } else {
      this.setData({ filterTab: 'all' });
    }
    this.setData({ showFilter: false }, () => this.applyFilter());
  },
});
