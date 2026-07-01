"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const merchant_1 = require("../../../services/merchant");
Page({
    data: {
        pageStyle: '',
        addressName: '',
        addressDetail: '',
        addressContact: '',
        addressPhone: '',
        freightName: '',
        freightDesc: '',
        freightType: 'free',
        freightThreshold: '',
        freightBase: '',
        areaDesc: '',
        areaScope: 'nation',
        areaLimits: [],
        customRegion: [],
        customAreaText: '',
        coldChainOn: false,
        expressNames: '',
        expressSelected: [],
        shipRemindOn: false,
        showSheet: false,
        activeSheet: '',
    },
    onLoad() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); this.loadSettings(); },
    onShow() { this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) }); },
    async loadSettings() {
        try {
            const d = await (0, merchant_1.fetchDeliverySetting)();
            if (d)
                this.setData({ addressName: d.senderName || '', addressDetail: d.senderAddress || '', addressContact: d.senderName || '', addressPhone: d.senderMobile || '', coldChainOn: !!d.coldChainEnabled });
            const t = await (0, merchant_1.fetchFreightTemplates)();
            if (t === null || t === void 0 ? void 0 : t.length)
                this.setData({ freightTemplates: t.map((ft) => ({ id: String(ft.id), name: ft.name, desc: `满${ft.thresholdAmount}包邮，未满收${ft.freightAmount}`, active: ft.active })) });
        }
        catch { }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/shop/shop' });
    },
    openSheet(e) {
        this.setData({ showSheet: true, activeSheet: e.currentTarget.dataset.sheet });
    },
    closeSheet() {
        this.setData({ showSheet: false, activeSheet: '' });
    },
    toggleColdChain() {
        this.setData({ coldChainOn: !this.data.coldChainOn });
    },
    toggleShipRemind() {
        this.setData({ shipRemindOn: !this.data.shipRemindOn });
    },
    onAddressContact(e) { this.setData({ addressContact: e.detail.value }); },
    onAddressPhone(e) { this.setData({ addressPhone: e.detail.value }); },
    onAddressDetail(e) { this.setData({ addressDetail: e.detail.value }); },
    saveAddress() {
        wx.showToast({ title: '已保存地址', icon: 'success' });
        this.closeSheet();
    },
    setFreightType(e) { this.setData({ freightType: e.currentTarget.dataset.type }); },
    onFreightThreshold(e) { this.setData({ freightThreshold: e.detail.value }); },
    onFreightBase(e) { this.setData({ freightBase: e.detail.value }); },
    saveFreight() {
        const typeMap = { free: '满额包邮', fixed: '固定运费', area: '按地区收费' };
        const t = this.data.freightType;
        const desc = t === 'free' ? `满 ${this.data.freightThreshold} 元包邮，未满收 ${this.data.freightBase} 元` : `基础运费 ${this.data.freightBase} 元`;
        this.setData({ freightName: typeMap[t] || '满额包邮', freightDesc: desc });
        wx.showToast({ title: '已保存运费模板', icon: 'success' });
        this.closeSheet();
    },
    setAreaScope(e) { this.setData({ areaScope: e.currentTarget.dataset.scope }); },
    onCustomRegionChange(e) {
        const region = e.detail.value;
        this.setData({
            customRegion: region,
            customAreaText: region.join(' '),
        });
    },
    toggleAreaLimit(e) {
        const limit = e.currentTarget.dataset.limit;
        const limits = this.data.areaLimits.slice();
        const idx = limits.indexOf(limit);
        if (idx >= 0)
            limits.splice(idx, 1);
        else
            limits.push(limit);
        this.setData({ areaLimits: limits });
    },
    saveArea() {
        const scopeMap = { nation: '全国配送', province: '省内配送', city: '同城配送', custom: '自定义范围' };
        const areaScope = this.data.areaScope;
        const scope = areaScope === 'custom' ? `自定义：${this.data.customAreaText}` : scopeMap[areaScope] || '全国配送';
        const limits = this.data.areaLimits;
        const limitNames = limits.map((l) => ({ cold: '冷链限制', remote: '偏远限制', hmt: '不含港澳台' })[l] || l);
        const desc = scope + (limitNames.length ? '，' + limitNames.join('、') : '');
        this.setData({ areaDesc: desc });
        wx.showToast({ title: '已保存配送范围', icon: 'success' });
        this.closeSheet();
    },
    toggleExpress(e) {
        const ex = e.currentTarget.dataset.express;
        const selected = this.data.expressSelected.slice();
        const idx = selected.indexOf(ex);
        if (idx >= 0)
            selected.splice(idx, 1);
        else
            selected.push(ex);
        this.setData({ expressSelected: selected });
    },
    saveExpress() {
        const nameMap = { sf: '顺丰速运', jd: '京东物流', zto: '中通快递', yto: '圆通速递' };
        const names = this.data.expressSelected.map((s) => nameMap[s] || s);
        this.setData({ expressNames: names.join(' / ') || '未选择' });
        wx.showToast({ title: '已保存快递偏好', icon: 'success' });
        this.closeSheet();
    },
    resetDefault() {
        this.setData({
            addressName: '',
            addressDetail: '',
            addressContact: '',
            addressPhone: '',
            freightName: '',
            freightDesc: '',
            freightThreshold: '',
            freightBase: '',
            areaDesc: '',
            areaLimits: [],
            customRegion: [],
            customAreaText: '',
            coldChainOn: false,
            expressNames: '',
            expressSelected: [],
            shipRemindOn: false,
        });
        wx.showToast({ title: '已清空当前设置', icon: 'none' });
    },
    async saveDelivery() {
        try {
            await (0, merchant_1.saveDeliverySetting)({
                senderName: this.data.addressName, senderMobile: this.data.addressPhone,
                senderAddress: this.data.addressDetail, defaultCompany: '', coldChainEnabled: !!this.data.coldChain,
                shipRemindEnabled: false, preferredCompanies: [], restrictedRegions: [], areaScope: '全国',
            });
            wx.showToast({ title: '已保存配送设置', icon: 'success' });
        }
        catch (e) {
            wx.showToast({ title: e.message || '保存失败', icon: 'none' });
        }
    },
    showToast() {
        wx.showToast({ title: '操作已记录', icon: 'none' });
    },
});
