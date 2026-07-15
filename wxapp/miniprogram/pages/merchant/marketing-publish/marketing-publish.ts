import { buildPageTopStyle } from '../../../utils/page-layout';
import { createMerchantActivity, createMerchantActivityDraft } from '../../../services/merchant';

const TYPE_MAP: Record<string, string> = {
  seckill: '限时秒杀', group: '拼团活动', coupon: '满减优惠券', presell: '预售活动',
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

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function buildTimeRange() {
  const now = new Date();
  const year = now.getFullYear();
  const years: string[] = [];
  for (let y = year; y <= year + 2; y++) years.push(`${y}`);
  const months: string[] = [];
  for (let m = 1; m <= 12; m++) months.push(pad(m));
  const days: string[] = [];
  for (let d = 1; d <= 31; d++) days.push(pad(d));
  const hours: string[] = [];
  for (let h = 0; h <= 23; h++) hours.push(pad(h));
  const minutes: string[] = [];
  for (let mi = 0; mi <= 59; mi += 5) minutes.push(pad(mi));
  return { years, months, days, hours, minutes };
}

function formatTimeFromRange(
  range: { years: string[]; months: string[]; days: string[]; hours: string[]; minutes: string[] },
  indices: number[],
) {
  const y = range.years[indices[0]] || range.years[0];
  const mo = range.months[indices[1]] || range.months[0];
  const d = range.days[indices[2]] || range.days[0];
  const h = range.hours[indices[3]] || range.hours[0];
  const mi = range.minutes[indices[4]] || range.minutes[0];
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

function defaultStartIndices(range: ReturnType<typeof buildTimeRange>) {
  const now = new Date();
  const yi = range.years.indexOf(`${now.getFullYear()}`);
  const mi_idx = range.months.indexOf(pad(now.getMonth() + 1));
  const di = range.days.indexOf(pad(now.getDate()));
  const hi = range.hours.indexOf(pad(now.getHours()));
  const mini = 0;
  return [yi >= 0 ? yi : 0, mi_idx >= 0 ? mi_idx : 0, di >= 0 ? di : 0, hi >= 0 ? hi : 0, mini];
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    currentType: 'seckill',
    typeName: '限时秒杀',
    activityName: '',
    startTimeText: '',
    endTimeText: '',
    startTimeRange: [] as string[][],
    endTimeRange: [] as string[][],
    warmupText: '不预热',
    warmupOptions: ['开始前 2 小时展示', '开始前 6 小时展示', '不预热'],
    stockDeductText: '下单扣减',
    stockDeductOptions: ['下单扣减', '支付扣减'],

    seckill: { price: '', stock: '', limit: '', alert: '', timeSlot: '全天场', autoEnd: true },
    seckillTimeSlots: ['全天场', '上午场 09:00-12:00', '晚间场 20:00-23:00'],

    group: { price: '', size: '', duration: '', limit: '', mode: '满员成团', allowShare: true },
    groupModes: ['满员成团', '到时自动成团'],

    coupon: { threshold: '', amount: '', stock: '', limit: '', validity: '领取后 7 天内', scope: '已选商品可用' },
    validityOptions: ['领取后 7 天内', '领取后 3 天内', '活动结束前'],
    scopeOptions: ['已选商品可用', '全店商品可用'],

    presell: { price: '', deposit: '', stock: '', limit: '', finalStart: '', finalEnd: '', shipDate: '' },

    selectedProducts: [] as any[],
  },

  _timeRange: null as ReturnType<typeof buildTimeRange> | null,
  _startIndices: [] as number[],
  _endIndices: [] as number[],

  onLoad() {
    const range = buildTimeRange();
    const startIdx = defaultStartIndices(range);
    const endIdx = [...startIdx];
    endIdx[3] = Math.min(startIdx[3] + 2, range.hours.length - 1);
    this._timeRange = range;
    this._startIndices = startIdx;
    this._endIndices = endIdx;
    this.setData({
      pageStyle: buildPageTopStyle(0),
      startTimeRange: [range.years, range.months, range.days, range.hours, range.minutes],
      endTimeRange: [range.years, range.months, range.days, range.hours, range.minutes],
      startTimeText: formatTimeFromRange(range, startIdx),
      endTimeText: formatTimeFromRange(range, endIdx),
    });
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
    const selected = wx.getStorageSync('merchant_activity_selected_product');
    if (selected && selected.id) {
      this.setData({
        selectedProducts: [{
          id: String(selected.id),
          name: selected.name,
          cover: selected.cover,
          stock: selected.stock,
          originPrice: selected.originPrice,
          activityPrice: selected.activityPrice,
        }],
      });
    } else {
      this.setData({ selectedProducts: [] });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/marketing/marketing' });
  },

  goDrafts() {
    wx.navigateTo({ url: '/pages/merchant/marketing-drafts/marketing-drafts' });
  },

  goSelectProducts() {
    wx.navigateTo({ url: '/pages/merchant/marketing-products/marketing-products' });
  },

  onTypeChange(e: any) {
    const type = e.currentTarget.dataset.type as string;
    this.setData({ currentType: type, typeName: TYPE_MAP[type] || '' });
  },

  onNameInput(e: any) {
    this.setData({ activityName: e.detail.value });
  },

  onWarmupChange(e: any) {
    this.setData({ warmupText: this.data.warmupOptions[e.detail.value] });
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

  onStockDeductChange(e: any) {
    this.setData({ stockDeductText: this.data.stockDeductOptions[e.detail.value] });
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

  onGroupShare(e: any) {
    const group = { ...(this.data.group as any), allowShare: e.detail.value };
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

  onScopeChange(e: any) {
    const coupon = { ...(this.data.coupon as any), scope: this.data.scopeOptions[e.detail.value] };
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

  onPresellFinalEnd(e: any) {
    const presell = { ...(this.data.presell as any), finalEnd: e.detail.value };
    this.setData({ presell });
  },

  onPresellShip(e: any) {
    const presell = { ...(this.data.presell as any), shipDate: e.detail.value };
    this.setData({ presell });
  },

  // generic time pickers
  onStartTimeChange(e: any) {
    const indices = e.detail?.value as number[] | undefined;
    if (!indices || !this._timeRange) return;
    this._startIndices = indices;
    this.setData({ startTimeText: formatTimeFromRange(this._timeRange, indices) });
  },

  onEndTimeChange(e: any) {
    const indices = e.detail?.value as number[] | undefined;
    if (!indices || !this._timeRange) return;
    this._endIndices = indices;
    this.setData({ endTimeText: formatTimeFromRange(this._timeRange, indices) });
  },

  buildPayload() {
    const activityType = resolveActivityType(this.data.currentType as string);
    const startAt = this.data.startTimeText as string;
    const endAt = this.data.endTimeText as string;
    const base: any = { title: this.data.activityName, activityType, startAt, endAt };
    const selectedProducts = (this.data.selectedProducts as any[]).filter((item) => item && item.id);
    if (selectedProducts.length) {
      base.products = selectedProducts.slice(0, 1).map((item) => ({
        productId: Number(item.id),
        title: item.name,
        coverUrl: item.cover,
        originalPrice: item.originPrice,
        activityPrice: item.activityPrice,
        stock: Number(item.stock) || 0,
      }));
    } else {
      base.products = [];
    }
    const ct = this.data.currentType as string;
    if (ct === 'seckill') {
      const s = this.data.seckill as any;
      base.ruleJson = { type: 'SECKILL', startAt, endAt, limitPerUser: Number(s.limit), stockMode: 'ACTIVITY_STOCK', warningStock: Number(s.alert) };
    } else if (ct === 'group') {
      const g = this.data.group as any;
      base.ruleJson = { type: 'GROUP_BUY', startAt, endAt, needed: Number(g.size), expireHours: Number(g.duration), limitPerUser: Number(g.limit) };
    } else if (ct === 'coupon') {
      const c = this.data.coupon as any;
      base.ruleJson = { type: 'CASHBACK', startAt, endAt, thresholdAmount: c.threshold, discountAmount: c.amount, couponStock: Number(c.stock), perUserLimit: Number(c.limit) };
    } else if (ct === 'presell') {
      const p = this.data.presell as any;
      base.ruleJson = { type: 'PRESALE', startAt, endAt, depositAmount: p.deposit, finalPaymentStartAt: p.finalStart, finalPaymentEndAt: p.finalEnd, deliveryStartAt: p.shipDate, limitPerUser: Number(p.limit) };
    }
    return base;
  },

  async saveDraft() {
    if (!this.data.activityName) { wx.showToast({ title: '请输入活动名称', icon: 'none' }); return; }
    if (!(this.data.selectedProducts as any[]).length) { wx.showToast({ title: '请先选择 1 个商品', icon: 'none' }); return; }
    try {
      await createMerchantActivityDraft(this.buildPayload());
    } catch {}
    wx.showToast({ title: '已保存活动草稿', icon: 'success' });
  },

  async publishActivity() {
    if (!this.data.activityName) { wx.showToast({ title: '请输入活动名称', icon: 'none' }); return; }
    if (!this.data.startTimeText) { wx.showToast({ title: '请选择开始时间', icon: 'none' }); return; }
    if (!this.data.endTimeText) { wx.showToast({ title: '请选择结束时间', icon: 'none' }); return; }
    if (!(this.data.selectedProducts as any[]).length) { wx.showToast({ title: '请先选择 1 个商品', icon: 'none' }); return; }
    try {
      await createMerchantActivity(this.buildPayload());
      wx.showToast({ title: '已创建活动', icon: 'success' });
      setTimeout(() => { wx.navigateBack({ delta: 1 }); }, 800);
    } catch (e: any) {
      wx.showToast({ title: e.message || '创建失败', icon: 'none' });
    }
  },
});
