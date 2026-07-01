"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
const TYPE_MAP = {
    seckill: '限时秒杀', group: '拼团活动', coupon: '满减优惠券', presell: '预售活动',
};
function resolveActivityType(type) {
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
function pad(n) {
    return n < 10 ? `0${n}` : `${n}`;
}
function buildTimeRange() {
    const now = new Date();
    const year = now.getFullYear();
    const years = [];
    for (let y = year; y <= year + 2; y++)
        years.push(`${y}`);
    const months = [];
    for (let m = 1; m <= 12; m++)
        months.push(pad(m));
    const days = [];
    for (let d = 1; d <= 31; d++)
        days.push(pad(d));
    const hours = [];
    for (let h = 0; h <= 23; h++)
        hours.push(pad(h));
    const minutes = [];
    for (let mi = 0; mi <= 59; mi += 5)
        minutes.push(pad(mi));
    return { years, months, days, hours, minutes };
}
function formatTimeFromRange(range, indices) {
    const y = range.years[indices[0]] || range.years[0];
    const mo = range.months[indices[1]] || range.months[0];
    const d = range.days[indices[2]] || range.days[0];
    const h = range.hours[indices[3]] || range.hours[0];
    const mi = range.minutes[indices[4]] || range.minutes[0];
    return `${y}-${mo}-${d} ${h}:${mi}`;
}
function defaultStartIndices(range) {
    const now = new Date();
    const yi = range.years.indexOf(`${now.getFullYear()}`);
    const mi_idx = range.months.indexOf(pad(now.getMonth() + 1));
    const di = range.days.indexOf(pad(now.getDate()));
    const hi = range.hours.indexOf(pad(now.getHours()));
    const mini = 0;
    return [yi >= 0 ? yi : 0, mi_idx >= 0 ? mi_idx : 0, di >= 0 ? di : 0, hi >= 0 ? hi : 0, mini];
}
Page({
    data: {
        pageStyle: '',
        currentType: 'seckill',
        typeName: '限时秒杀',
        activityName: '',
        startTimeText: '',
        endTimeText: '',
        startTimeRange: [],
        endTimeRange: [],
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
        selectedProducts: [],
    },
    _timeRange: null,
    _startIndices: [],
    _endIndices: [],
    onLoad() {
        const range = buildTimeRange();
        const startIdx = defaultStartIndices(range);
        const endIdx = [...startIdx];
        endIdx[3] = Math.min(startIdx[3] + 2, range.hours.length - 1);
        this._timeRange = range;
        this._startIndices = startIdx;
        this._endIndices = endIdx;
        this.setData({
            pageStyle: (0, page_layout_1.buildPageTopStyle)(8),
            startTimeRange: [range.years, range.months, range.days, range.hours, range.minutes],
            endTimeRange: [range.years, range.months, range.days, range.hours, range.minutes],
            startTimeText: formatTimeFromRange(range, startIdx),
            endTimeText: formatTimeFromRange(range, endIdx),
        });
    },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
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
        }
        else {
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
    onTypeChange(e) {
        const type = e.currentTarget.dataset.type;
        this.setData({ currentType: type, typeName: TYPE_MAP[type] || '' });
    },
    onNameInput(e) {
        this.setData({ activityName: e.detail.value });
    },
    onWarmupChange(e) {
        this.setData({ warmupText: this.data.warmupOptions[e.detail.value] });
    },
    // seckill
    onSeckillInput(e) {
        const field = e.currentTarget.dataset.field;
        const seckill = { ...this.data.seckill, [field]: e.detail.value };
        this.setData({ seckill });
    },
    onSeckillSlotChange(e) {
        const seckill = { ...this.data.seckill, timeSlot: this.data.seckillTimeSlots[e.detail.value] };
        this.setData({ seckill });
    },
    onStockDeductChange(e) {
        this.setData({ stockDeductText: this.data.stockDeductOptions[e.detail.value] });
    },
    onSeckillAutoEnd(e) {
        const seckill = { ...this.data.seckill, autoEnd: e.detail.value };
        this.setData({ seckill });
    },
    // group
    onGroupInput(e) {
        const field = e.currentTarget.dataset.field;
        const group = { ...this.data.group, [field]: e.detail.value };
        this.setData({ group });
    },
    onGroupModeChange(e) {
        const group = { ...this.data.group, mode: this.data.groupModes[e.detail.value] };
        this.setData({ group });
    },
    onGroupShare(e) {
        const group = { ...this.data.group, allowShare: e.detail.value };
        this.setData({ group });
    },
    // coupon
    onCouponInput(e) {
        const field = e.currentTarget.dataset.field;
        const coupon = { ...this.data.coupon, [field]: e.detail.value };
        this.setData({ coupon });
    },
    onValidityChange(e) {
        const coupon = { ...this.data.coupon, validity: this.data.validityOptions[e.detail.value] };
        this.setData({ coupon });
    },
    onScopeChange(e) {
        const coupon = { ...this.data.coupon, scope: this.data.scopeOptions[e.detail.value] };
        this.setData({ coupon });
    },
    // presell
    onPresellInput(e) {
        const field = e.currentTarget.dataset.field;
        const presell = { ...this.data.presell, [field]: e.detail.value };
        this.setData({ presell });
    },
    onPresellFinalStart(e) {
        const presell = { ...this.data.presell, finalStart: e.detail.value };
        this.setData({ presell });
    },
    onPresellFinalEnd(e) {
        const presell = { ...this.data.presell, finalEnd: e.detail.value };
        this.setData({ presell });
    },
    onPresellShip(e) {
        const presell = { ...this.data.presell, shipDate: e.detail.value };
        this.setData({ presell });
    },
    // generic time pickers
    onStartTimeChange(e) {
        const indices = e.detail && e.detail.value;
        if (!indices || !this._timeRange)
            return;
        this._startIndices = indices;
        this.setData({ startTimeText: formatTimeFromRange(this._timeRange, indices) });
    },
    onEndTimeChange(e) {
        const indices = e.detail && e.detail.value;
        if (!indices || !this._timeRange)
            return;
        this._endIndices = indices;
        this.setData({ endTimeText: formatTimeFromRange(this._timeRange, indices) });
    },
    buildPayload() {
        const activityType = resolveActivityType(this.data.currentType);
        const startAt = this.data.startTimeText;
        const endAt = this.data.endTimeText;
        const base = { title: this.data.activityName, activityType, startAt, endAt };
        const selectedProducts = this.data.selectedProducts.filter((item) => item && item.id);
        if (selectedProducts.length) {
            base.products = selectedProducts.slice(0, 1).map((item) => ({
                productId: Number(item.id),
                title: item.name,
                coverUrl: item.cover,
                originalPrice: item.originPrice,
                activityPrice: item.activityPrice,
                stock: Number(item.stock) || 0,
            }));
        }
        else {
            base.products = [];
        }
        const ct = this.data.currentType;
        if (ct === 'seckill') {
            const s = this.data.seckill;
            base.ruleJson = { type: 'SECKILL', startAt, endAt, limitPerUser: Number(s.limit), stockMode: 'ACTIVITY_STOCK', warningStock: Number(s.alert) };
        }
        else if (ct === 'group') {
            const g = this.data.group;
            base.ruleJson = { type: 'GROUP_BUY', startAt, endAt, needed: Number(g.size), expireHours: Number(g.duration), limitPerUser: Number(g.limit) };
        }
        else if (ct === 'coupon') {
            const c = this.data.coupon;
            base.ruleJson = { type: 'CASHBACK', startAt, endAt, thresholdAmount: c.threshold, discountAmount: c.amount, couponStock: Number(c.stock), perUserLimit: Number(c.limit) };
        }
        else if (ct === 'presell') {
            const p = this.data.presell;
            base.ruleJson = { type: 'PRESALE', startAt, endAt, depositAmount: p.deposit, finalPaymentStartAt: p.finalStart, finalPaymentEndAt: p.finalEnd, deliveryStartAt: p.shipDate, limitPerUser: Number(p.limit) };
        }
        return base;
    },
    async saveDraft() {
        if (!this.data.activityName) {
            wx.showToast({ title: '请输入活动名称', icon: 'none' });
            return;
        }
        if (!this.data.selectedProducts.length) {
            wx.showToast({ title: '请先选择 1 个商品', icon: 'none' });
            return;
        }
        try {
            await (0, merchant_1.createMerchantActivityDraft)(this.buildPayload());
        }
        catch (_a) { }
        wx.showToast({ title: '已保存活动草稿', icon: 'success' });
    },
    async publishActivity() {
        if (!this.data.activityName) {
            wx.showToast({ title: '请输入活动名称', icon: 'none' });
            return;
        }
        if (!this.data.startTimeText) {
            wx.showToast({ title: '请选择开始时间', icon: 'none' });
            return;
        }
        if (!this.data.endTimeText) {
            wx.showToast({ title: '请选择结束时间', icon: 'none' });
            return;
        }
        if (!this.data.selectedProducts.length) {
            wx.showToast({ title: '请先选择 1 个商品', icon: 'none' });
            return;
        }
        try {
            await (0, merchant_1.createMerchantActivity)(this.buildPayload());
            wx.showToast({ title: '已创建活动', icon: 'success' });
            setTimeout(() => { wx.navigateBack({ delta: 1 }); }, 800);
        }
        catch (e) {
            wx.showToast({ title: e.message || '创建失败', icon: 'none' });
        }
    },
});
