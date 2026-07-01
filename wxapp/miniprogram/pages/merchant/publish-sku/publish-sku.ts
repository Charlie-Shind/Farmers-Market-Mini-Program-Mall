import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantProductDetail, updateMerchantProduct, updateMerchantSkuStock, type MerchantProductDetail } from '../../../services/merchant';

function cartesian(arrays: string[][]): string[] {
  if (!arrays.length) return [];
  return arrays.reduce<string[]>((acc, arr) => {
    if (!arr.length) return acc;
    const result: string[] = [];
    for (const a of acc) {
      for (const b of arr) {
        result.push(a ? `${a} / ${b}` : b);
      }
    }
    return result;
  }, ['']);
}

function generateSkuId() {
  return `sku_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    productId: 0,
    loading: true,
    specMode: 'multi',
    specGroups: [] as any[],
    skuList: [] as any[],
    singleSku: {
      price: '',
      originalPrice: '',
      stock: '',
      safetyStock: '',
      limit: '',
      code: '',
    },
  },

  onLoad(options: Record<string, string>) {
    this.setData({ pageStyle: buildPageTopStyle(8) });
    const productId = Number(options.productId) || 0;
    if (productId) {
      this.setData({ productId });
      this.loadProduct(productId);
    }
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
  },

  async loadProduct(productId: number) {
    this.setData({ loading: true });
    try {
      const detail: MerchantProductDetail = await fetchMerchantProductDetail(productId);
      if (!detail) { this.setData({ loading: false }); return; }

      if (detail.specJson && detail.specJson !== null && typeof detail.specJson === 'object' && Object.keys(detail.specJson).length > 0) {
        // 有规格数据 → 多规格模式
        const groups = Object.entries(detail.specJson).map(([name, values]) => ({
          name,
          options: Array.isArray(values) ? values : [String(values)],
        }));
        this.setData({ specMode: 'multi', specGroups: groups, loading: false }, () => {
          this.regenerateSkuList();
        });
      } else {
        // 单规格模式
        this.setData({
          specMode: 'single',
          loading: false,
          singleSku: {
            price: detail.price || '',
            originalPrice: detail.originalPrice || '',
            stock: String(detail.stock || ''),
            safetyStock: '',
            limit: '',
            code: '',
          },
        });
      }
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  regenerateSkuList() {
    const groups = this.data.specGroups as any[];
    if (!groups.length) { this.setData({ skuList: [] }); return; }

    const optionArrays = groups.map((g: any) => g.options as string[]);
    const combinations = cartesian(optionArrays);
    // 保留已有的价格/库存数据
    const oldMap: Record<string, any> = {};
    (this.data.skuList as any[]).forEach((sku: any) => { oldMap[sku.name] = sku; });

    const skuList = combinations.map((name) => {
      const old = oldMap[name];
      return {
        id: old?.id || generateSkuId(),
        name,
        code: old?.code || '',
        price: old?.price || '',
        stock: old?.stock || '',
        activityPrice: old?.activityPrice || '',
        limit: old?.limit || '',
        enabled: old?.enabled !== false,
      };
    });
    this.setData({ skuList });
  },

  goBack() {
    if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.navigateTo({ url: '/pages/merchant/publish/publish' });
  },

  // === 模式切换 ===
  onSpecModeChange(e: any) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ specMode: mode });
    if (mode === 'multi' && !(this.data.specGroups as any[]).length) {
      this.setData({ specGroups: [{ name: '规格项', options: ['选项 1'] }] }, () => this.regenerateSkuList());
    }
  },

  // === 单规格输入 ===
  onSingleSkuInput(e: any) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`singleSku.${field}`]: e.detail.value });
  },

  // === 多规格：规格组操作 ===
  addSpecGroup() {
    wx.showModal({
      title: '新增规格组',
      editable: true,
      placeholderText: '如：重量、口味',
      success: (res) => {
        if (!res.confirm || !res.content?.trim()) return;
        const groups = (this.data.specGroups as any[]).slice();
        groups.push({ name: res.content.trim(), options: ['选项 1'] });
        this.setData({ specGroups: groups }, () => this.regenerateSkuList());
      },
    });
  },

  renameSpecGroup(e: any) {
    const idx = Number(e.currentTarget.dataset.groupIndex);
    const current = (this.data.specGroups as any[])[idx]?.name || '';
    wx.showModal({
      title: '编辑规格组名称',
      editable: true,
      content: current,
      success: (res) => {
        if (!res.confirm || !res.content?.trim()) return;
        const groups = (this.data.specGroups as any[]).slice();
        groups[idx] = { ...groups[idx], name: res.content.trim() };
        this.setData({ specGroups: groups }, () => this.regenerateSkuList());
      },
    });
  },

  deleteSpecGroup(e: any) {
    const idx = Number(e.currentTarget.dataset.groupIndex);
    wx.showModal({
      title: '删除规格组',
      content: '确定删除该规格组？关联的 SKU 组合将被移除。',
      success: (res) => {
        if (!res.confirm) return;
        const groups = (this.data.specGroups as any[]).filter((_, i) => i !== idx);
        this.setData({ specGroups: groups }, () => this.regenerateSkuList());
      },
    });
  },

  // === 多规格：选项操作 ===
  addSpecOption(e: any) {
    const idx = Number(e.currentTarget.dataset.groupIndex);
    wx.showModal({
      title: '新增选项',
      editable: true,
      placeholderText: '如：大份、中份',
      success: (res) => {
        if (!res.confirm || !res.content?.trim()) return;
        const groups = (this.data.specGroups as any[]).slice();
        groups[idx] = { ...groups[idx], options: [...groups[idx].options, res.content.trim()] };
        this.setData({ specGroups: groups }, () => this.regenerateSkuList());
      },
    });
  },

  renameSpecOption(e: any) {
    const gi = Number(e.currentTarget.dataset.groupIndex);
    const oi = Number(e.currentTarget.dataset.optIndex);
    const current = (this.data.specGroups as any[])[gi]?.options?.[oi] || '';
    wx.showModal({
      title: '编辑选项',
      editable: true,
      content: current,
      success: (res) => {
        if (!res.confirm || !res.content?.trim()) return;
        const groups = (this.data.specGroups as any[]).slice();
        const opts = groups[gi].options.slice();
        opts[oi] = res.content.trim();
        groups[gi] = { ...groups[gi], options: opts };
        this.setData({ specGroups: groups }, () => this.regenerateSkuList());
      },
    });
  },

  deleteSpecOption(e: any) {
    const gi = Number(e.currentTarget.dataset.groupIndex);
    const oi = Number(e.currentTarget.dataset.optIndex);
    wx.showModal({
      title: '删除选项',
      content: '确定删除该选项？相关 SKU 将被移除。',
      success: (res) => {
        if (!res.confirm) return;
        const groups = (this.data.specGroups as any[]).slice();
        groups[gi] = { ...groups[gi], options: groups[gi].options.filter((_: any, i: number) => i !== oi) };
        this.setData({ specGroups: groups }, () => this.regenerateSkuList());
      },
    });
  },

  // === SKU 操作 ===
  onSkuInput(e: any) {
    const { id, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const list = (this.data.skuList as any[]).map((item: any) =>
      item.id === id ? { ...item, [field]: value } : item,
    );
    this.setData({ skuList: list });
  },

  toggleSku(e: any) {
    const id = e.currentTarget.dataset.id;
    const list = (this.data.skuList as any[]).map((item: any) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item,
    );
    this.setData({ skuList: list });
  },

  deleteSku(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除 SKU',
      content: '确定删除该规格组合？',
      success: (res) => {
        if (!res.confirm) return;
        const list = (this.data.skuList as any[]).filter((item: any) => item.id !== id);
        this.setData({ skuList: list });
      },
    });
  },

  syncPrice() {
    const firstPrice = (this.data.skuList as any[])[0]?.price || '';
    if (!firstPrice) { wx.showToast({ title: '请先填写首个 SKU 价格', icon: 'none' }); return; }
    const list = (this.data.skuList as any[]).map((item: any) => ({ ...item, price: firstPrice }));
    this.setData({ skuList: list });
    wx.showToast({ title: '已同步价格', icon: 'success' });
  },

  batchFill() {
    const firstPrice = (this.data.skuList as any[])[0]?.price || '';
    const firstStock = (this.data.skuList as any[])[0]?.stock || '';
    wx.showModal({
      title: '批量填充',
      content: `将全部 SKU 填充为：价格 ${firstPrice || '空'}、库存 ${firstStock || '空'}`,
      success: (res) => {
        if (!res.confirm) return;
        const list = (this.data.skuList as any[]).map((item: any) => ({
          ...item, price: firstPrice, stock: firstStock,
        }));
        this.setData({ skuList: list });
        wx.showToast({ title: '已批量填充', icon: 'success' });
      },
    });
  },

  // === 保存 ===
  saveDraft() {
    const data = this.data.specMode === 'single'
      ? { specMode: 'single', singleSku: this.data.singleSku }
      : { specMode: 'multi', specGroups: this.data.specGroups, skuList: this.data.skuList };
    wx.setStorageSync('sku_draft', data);
    wx.showToast({ title: '已保存草稿', icon: 'success' });
  },

  async saveAndBack() {
    const specMode = this.data.specMode as string;
    const productId = this.data.productId as number;

    if (specMode === 'single') {
      const s = this.data.singleSku as any;
      if (productId) {
        try {
          await updateMerchantProduct(productId, {
            price: s.price,
            originalPrice: s.originalPrice || undefined,
            stock: Number(s.stock) || 0,
            skuMode: 'SINGLE',
            skus: [{
              skuName: '规格项',
              price: s.price,
              originalPrice: s.originalPrice || undefined,
              stock: Number(s.stock) || 0,
              safetyStock: Number(s.safetyStock) || 0,
              limitPerUser: Number(s.limit) || 0,
              skuCode: s.code || undefined,
              specJson: {},
              status: 1,
            }],
          }).catch(() => {});
        } catch { /* */ }
      }
    } else {
      const skuList = this.data.skuList as any[];
      if (productId && skuList.length) {
        try {
          for (const sku of skuList) {
            if (sku.skuId) {
              await updateMerchantSkuStock(sku.skuId, Number(sku.stock) || 0).catch(() => {});
            }
          }
          await updateMerchantProduct(productId, {
            skuMode: 'MULTI',
            price: skuList[0]?.price || '',
            skus: skuList.map((s: any) => ({
              skuName: s.name,
              skuCode: s.code || undefined,
              price: s.price,
              activityPrice: s.activityPrice || undefined,
              stock: Number(s.stock) || 0,
              limitPerUser: Number(s.limit) || 0,
              specJson: {},
              status: s.enabled ? 1 : 0,
            })),
          }).catch(() => {});
        } catch { /* */ }
      }
    }

    // 回传上一页
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev) {
      prev.setData({
        specMode,
        skuList: specMode === 'multi' ? this.data.skuList : [],
        specGroups: specMode === 'multi' ? this.data.specGroups : [],
        singleSku: specMode === 'single' ? this.data.singleSku : null,
      });
      if (typeof (prev as any).syncSkuSummary === 'function') {
        (prev as any).syncSkuSummary();
      }
    }

    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => { wx.navigateBack({ delta: 1 }); }, 500);
  },
});
