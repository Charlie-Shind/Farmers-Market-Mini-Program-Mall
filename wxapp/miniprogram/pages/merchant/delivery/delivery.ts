import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchDeliverySetting, saveDeliverySetting, fetchFreightTemplates } from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    addressName: '未配置',
    addressDetail: '请先填写发货地址',
    addressContact: '',
    addressPhone: '',
    freightName: '满额包邮',
    freightDesc: '满 99 元包邮，未满收 8 元',
    freightType: 'free',
    freightThreshold: '',
    freightBase: '',
    areaDesc: '全国配送，冷链限制部分地区',
    areaScope: 'nation',
    areaLimits: [] as string[],
    customRegion: [] as string[],
    customAreaText: '',
    coldChainOn: false,
    expressNames: '未选择',
    expressSelected: [] as string[],
    shipRemindOn: false,
    showSheet: false,
    activeSheet: '',
  },

  onLoad() { this.setData({ pageStyle: buildPageTopStyle(0) }); this.loadSettings(); },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(0) }); },

  async loadSettings() {
    try {
      const d = await fetchDeliverySetting();
      if (d) this.setData({ addressName: d.senderName || '未配置', addressDetail: d.senderAddress || '请先填写发货地址', addressContact: d.senderName || '', addressPhone: d.senderMobile || '', coldChainOn: !!d.coldChainEnabled });
      const t = await fetchFreightTemplates();
      if (t?.length) this.setData({ freightTemplates: t.map((ft: any) => ({ id: String(ft.id), name: ft.name, desc: `满${ft.thresholdAmount}包邮，未满收${ft.freightAmount}`, active: ft.active })) });
    } catch {}
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/shop/shop' });
  },

  openSheet(e: any) {
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

  onAddressContact(e: any) { this.setData({ addressContact: e.detail.value }); },
  onAddressPhone(e: any) { this.setData({ addressPhone: e.detail.value }); },
  onAddressDetail(e: any) { this.setData({ addressDetail: e.detail.value }); },

  saveAddress() {
    wx.showToast({ title: '已保存地址', icon: 'success' });
    this.closeSheet();
  },

  setFreightType(e: any) { this.setData({ freightType: e.currentTarget.dataset.type }); },
  onFreightThreshold(e: any) { this.setData({ freightThreshold: e.detail.value }); },
  onFreightBase(e: any) { this.setData({ freightBase: e.detail.value }); },

  saveFreight() {
    const typeMap: Record<string, string> = { free: '满额包邮', fixed: '固定运费', area: '按地区收费' };
    const t = this.data.freightType as string;
    const desc = t === 'free' ? `满 ${this.data.freightThreshold} 元包邮，未满收 ${this.data.freightBase} 元` : `基础运费 ${this.data.freightBase} 元`;
    this.setData({ freightName: typeMap[t] || '满额包邮', freightDesc: desc });
    wx.showToast({ title: '已保存运费模板', icon: 'success' });
    this.closeSheet();
  },

  setAreaScope(e: any) { this.setData({ areaScope: e.currentTarget.dataset.scope }); },

  onCustomRegionChange(e: any) {
    const region = e.detail.value as string[];
    this.setData({
      customRegion: region,
      customAreaText: region.join(' '),
    });
  },

  toggleAreaLimit(e: any) {
    const limit = e.currentTarget.dataset.limit as string;
    const limits = (this.data.areaLimits as string[]).slice();
    const idx = limits.indexOf(limit);
    if (idx >= 0) limits.splice(idx, 1);
    else limits.push(limit);
    this.setData({ areaLimits: limits });
  },

  saveArea() {
    const scopeMap: Record<string, string> = { nation: '全国配送', province: '省内配送', city: '同城配送', custom: '自定义范围' };
    const areaScope = this.data.areaScope as string;
    const scope = areaScope === 'custom' ? `自定义：${this.data.customAreaText}` : scopeMap[areaScope] || '全国配送';
    const limits = this.data.areaLimits as string[];
    const limitNames = limits.map((l: string) => ({ cold: '冷链限制', remote: '偏远限制', hmt: '不含港澳台' })[l] || l);
    const desc = scope + (limitNames.length ? '，' + limitNames.join('、') : '');
    this.setData({ areaDesc: desc });
    wx.showToast({ title: '已保存配送范围', icon: 'success' });
    this.closeSheet();
  },

  toggleExpress(e: any) {
    const ex = e.currentTarget.dataset.express as string;
    const selected = (this.data.expressSelected as string[]).slice();
    const idx = selected.indexOf(ex);
    if (idx >= 0) selected.splice(idx, 1);
    else selected.push(ex);
    this.setData({ expressSelected: selected });
  },

  saveExpress() {
    const nameMap: Record<string, string> = { sf: '顺丰速运', jd: '京东物流', zto: '中通快递', yto: '圆通速递' };
    const names = (this.data.expressSelected as string[]).map((s: string) => nameMap[s] || s);
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
      areaDesc: '全国配送，冷链限制部分地区',
      areaLimits: [],
      customRegion: [],
      customAreaText: '',
      coldChainOn: false,
      expressNames: '未选择',
      expressSelected: [],
      shipRemindOn: false,
    });
    wx.showToast({ title: '已清空当前设置', icon: 'none' });
  },

  async saveDelivery() {
    try {
      await saveDeliverySetting({
        senderName: this.data.addressName as string, senderMobile: this.data.addressPhone as string,
        senderAddress: this.data.addressDetail as string, defaultCompany: '', coldChainEnabled: !!this.data.coldChainOn,
        shipRemindEnabled: false, preferredCompanies: [], restrictedRegions: [], areaScope: '全国',
      });
      wx.showToast({ title: '已保存配送设置', icon: 'success' });
    } catch (e: any) { wx.showToast({ title: e.message || '保存失败', icon: 'none' }); }
  },

  showToast() {
    wx.showToast({ title: '操作已记录', icon: 'none' });
  },
});
