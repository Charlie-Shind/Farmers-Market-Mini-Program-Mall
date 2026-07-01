import { buildPageTopStyle } from '../../../utils/page-layout';
import { updateMerchantActivity, createMerchantActivity, createMerchantActivityDraft, fetchMerchantActivityDetail } from '../../../services/merchant';

const TYPE_MAP: Record<string, string> = {
  seckill: '限时秒杀',
  group: '拼团活动',
  coupon: '满减优惠券',
  presell: '预售活动',
};

function resolveActivityType(type: string) {
  switch (type) {
    case 'group':
      return 'GROUP_BUY';
    case 'coupon':
      return 'CASHBACK';
    case 'presell':
      return 'PRESALE';
    case 'seckill':
    default:
      return 'SECKILL';
  }
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    activityId: 0,
    pane: 'basic',
    currentType: 'seckill',
    typeName: '限时秒杀',
    activityName: '',
    startDate: '',
    endDate: '',
    enabled: true,
    warmupText: '不预热',
    warmupOptions: ['开始前 2 小时展示', '开始前 6 小时展示', '不预热'],

    seckill: { price: '', stock: '', limit: '', alert: '', timeSlot: '晚间场 20:00-23:00', autoEnd: true },
    seckillTimeSlots: ['全天场', '上午场 09:00-12:00', '晚间场 20:00-23:00'],

    group: { price: '', size: '', duration: '', limit: '', mode: '满员成团', allowShare: true },
    groupModes: ['满员成团', '到时自动成团'],

    coupon: { threshold: '', amount: '', stock: '', limit: '', validity: '领取后 7 天内', scope: '已选商品可用' },
    validityOptions: ['领取后 7 天内', '领取后 3 天内', '活动结束前'],

    presell: { price: '', deposit: '', stock: '', limit: '', finalStart: '', shipDate: '' },

    selectedProducts: [] as any[],

    previewProduct: { cover: '', price: '', meta: '请选择 1 个商品后查看预览' },
  },

  onLoad(options: Record<string, string>) {
    this.setData({ pageStyle: buildPageTopStyle(8) });
    // 默认时间：今天 + 7 天
    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const next = new Date(now.getTime() + 7 * 86400000);
    const nextDate = `${next.getFullYear()}-${pad2(next.getMonth() + 1)}-${pad2(next.getDate())}`;
    this.setData({ startDate: today, endDate: nextDate });

    const id = Number(options.id) || 0;
    if (id) {
      this.setData({ activityId: id });
      this.loadActivityDetail(id);
    }
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
    const selected = wx.getStorageSync('merchant_activity_selected_product');
    if (selected && selected.id) {
      this.setData({
        selectedProducts: [{
          id: String(selected.id),
          name: selected.name,
          cover: selected.cover,
          stock: selected.stock,
          activityPrice: selected.activityPrice,
        }],
        previewProduct: {
          cover: selected.cover,
          price: selected.activityPrice || '',
          meta: `原价 ¥${selected.originPrice || '-'} · 库存 ${selected.stock || 0}`,
        },
      });
    } else {
      this.setData({
        selectedProducts: [],
        previewProduct: { cover: '', price: '', meta: '请选择 1 个商品后查看预览' },
      });
    }
  },

  async loadActivityDetail(id: number) {
    try {
      const detail = await fetchMerchantActivityDetail(id);
      if (!detail) return;
      const d = detail as Record<string, any>;
      this.setData({
        activityId: Number(d.id || d.activityId || id),
        activityName: d.title || d.activityName || '',
        currentType: d.activityType === 'GROUP_BUY' ? 'group' : d.activityType === 'CASHBACK' ? 'coupon' : d.activityType === 'PRESALE' ? 'presell' : 'seckill',
        typeName: TYPE_MAP[d.activityType === 'GROUP_BUY' ? 'group' : d.activityType === 'CASHBACK' ? 'coupon' : d.activityType === 'PRESALE' ? 'presell' : 'seckill'],
        startDate: (d.startAt || '').slice(0, 10),
        endDate: (d.endAt || '').slice(0, 10),
        enabled: d.status === 'PUBLISHED',
      });
    } catch {}
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/marketing/marketing' });
  },

  goDetail() {
    wx.navigateTo({ url: '/pages/merchant/marketing-detail/marketing-detail' });
  },

  goSelectProducts() {
    wx.navigateTo({ url: '/pages/merchant/marketing-products/marketing-products' });
  },

  onPaneChange(e: any) {
    this.setData({ pane: e.currentTarget.dataset.pane });
  },

  onTypeChange(e: any) {
    const type = e.currentTarget.dataset.type as string;
    this.setData({ currentType: type, typeName: TYPE_MAP[type] || '' });
  },

  onNameInput(e: any) {
    this.setData({ activityName: e.detail.value });
  },

  onStartDate(e: any) {
    this.setData({ startDate: e.detail.value });
  },

  onEndDate(e: any) {
    this.setData({ endDate: e.detail.value });
  },

  onWarmupChange(e: any) {
    this.setData({ warmupText: this.data.warmupOptions[e.detail.value] });
  },

  onEnabledChange(e: any) {
    this.setData({ enabled: e.detail.value });
  },

  // seckill
  onSeckillInput(e: any) {
    const field = e.currentTarget.dataset.field;
    const seckill = { ...(this.data.seckill as any), [field]: e.detail.value };
    this.setData({ seckill });
  },

  onSeckillSlotChange(e: any) {
    const seckill = { ...(this.data.seckill as any), timeSlot: this.data.seckillTimeSlots[e.detail.value] };
    this.setData({ seckill });
  },

  onSeckillAutoEnd(e: any) {
    const seckill = { ...(this.data.seckill as any), autoEnd: e.detail.value };
    this.setData({ seckill });
  },

  // group
  onGroupInput(e: any) {
    const field = e.currentTarget.dataset.field;
    const group = { ...(this.data.group as any), [field]: e.detail.value };
    this.setData({ group });
  },

  onGroupModeChange(e: any) {
    const group = { ...(this.data.group as any), mode: this.data.groupModes[e.detail.value] };
    this.setData({ group });
  },

  // coupon
  onCouponInput(e: any) {
    const field = e.currentTarget.dataset.field;
    const coupon = { ...(this.data.coupon as any), [field]: e.detail.value };
    this.setData({ coupon });
  },

  onValidityChange(e: any) {
    const coupon = { ...(this.data.coupon as any), validity: this.data.validityOptions[e.detail.value] };
    this.setData({ coupon });
  },

  // presell
  onPresellInput(e: any) {
    const field = e.currentTarget.dataset.field;
    const presell = { ...(this.data.presell as any), [field]: e.detail.value };
    this.setData({ presell });
  },

  onPresellFinalStart(e: any) {
    const presell = { ...(this.data.presell as any), finalStart: e.detail.value };
    this.setData({ presell });
  },

  onPresellShip(e: any) {
    const presell = { ...(this.data.presell as any), shipDate: e.detail.value };
    this.setData({ presell });
  },

  async saveDraft() {
    if (!this.data.activityName) { wx.showToast({ title: '请输入活动名称', icon: 'none' }); return; }
    if (!this.data.startDate) { wx.showToast({ title: '请选择开始时间', icon: 'none' }); return; }
    if (!(this.data.selectedProducts as any[]).length) { wx.showToast({ title: '请先选择 1 个商品', icon: 'none' }); return; }
    try {
      const selected = (this.data.selectedProducts as any[])[0];
      await createMerchantActivityDraft({
        title: this.data.activityName,
        activityType: resolveActivityType(String(this.data.currentType || 'seckill')),
        startAt: `${this.data.startDate} 00:00`,
        endAt: `${this.data.endDate} 23:59`,
        products: [{
          productId: Number(selected.id),
          title: selected.name,
          coverUrl: selected.cover,
          activityPrice: selected.activityPrice,
          stock: Number(selected.stock) || 0,
        }],
        ruleJson: {
          type: resolveActivityType(String(this.data.currentType || 'seckill')),
          warmupText: this.data.warmupText,
          enabled: this.data.enabled,
        },
      });
    } catch {}
    wx.showToast({ title: '已保存草稿', icon: 'success' });
  },

  async saveActivity() {
    if (!this.data.activityName) { wx.showToast({ title: '请输入活动名称', icon: 'none' }); return; }
    if (!this.data.startDate) { wx.showToast({ title: '请选择开始时间', icon: 'none' }); return; }
    if (!this.data.endDate) { wx.showToast({ title: '请选择结束时间', icon: 'none' }); return; }
    if (!(this.data.selectedProducts as any[]).length) { wx.showToast({ title: '请先选择 1 个商品', icon: 'none' }); return; }
    try {
      const selected = (this.data.selectedProducts as any[])[0];
      const activityId = this.data.activityId;
      if (activityId) {
        // 编辑已有活动
        await updateMerchantActivity(activityId, {
          title: this.data.activityName,
          startAt: `${this.data.startDate} 00:00`,
          endAt: `${this.data.endDate} 23:59`,
          products: [{
            productId: Number(selected.id),
            title: selected.name,
            coverUrl: selected.cover,
            activityPrice: selected.activityPrice,
            stock: Number(selected.stock) || 0,
          }],
        });
      } else {
        // 新建活动
        await createMerchantActivity({
          title: this.data.activityName,
          activityType: resolveActivityType(String(this.data.currentType || 'seckill')),
          startAt: `${this.data.startDate} 00:00`,
          endAt: `${this.data.endDate} 23:59`,
          status: 'PUBLISHED',
          products: [{
            productId: Number(selected.id),
            title: selected.name,
            coverUrl: selected.cover,
            activityPrice: selected.activityPrice,
            stock: Number(selected.stock) || 0,
          }],
          ruleJson: {
            warmupText: this.data.warmupText,
            enabled: this.data.enabled,
          },
        });
      }
      wx.showToast({ title: activityId ? '已保存活动' : '已发布活动', icon: 'success' });
    } catch (e: any) { wx.showToast({ title: e.message || '保存失败', icon: 'none' }); }
  },
});
