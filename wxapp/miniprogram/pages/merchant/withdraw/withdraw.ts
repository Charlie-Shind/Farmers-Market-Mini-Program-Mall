import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantWallet, fetchMerchantWithdraws, createMerchantWithdraw, type MerchantWithdrawRecord } from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    loading: true,
    balance: '0.00',
    amountPreset: 'all',
    withdrawAmount: '',
    accountName: '微信商家零钱',
    accountDesc: '已绑定',
    accountType: 'merchant',
    showAccountSheet: false,
    submitting: false,
    withdrawHistory: [] as any[],
  },

  onLoad() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const [wallet, records] = await Promise.all([
        fetchMerchantWallet().catch(() => null),
        fetchMerchantWithdraws().catch(() => [] as MerchantWithdrawRecord[]),
      ]);
      if (wallet) {
        this.setData({
          balance: wallet.availableAmount || '0',
          withdrawAmount: wallet.availableAmount || '0',
        });
      }
      if (records) {
        this.setData({
          withdrawHistory: (records as MerchantWithdrawRecord[]).map((r) => ({
            date: r.createdAt ? r.createdAt.slice(0, 10) : '',
            status: r.status || '处理中',
            amount: r.amount || '0',
            applyNo: r.withdrawNo || r.applyNo || '',
          })),
        });
      }
      this.setData({ loading: false });
    } catch {
      this.setData({ loading: false });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/finance/finance' });
  },

  onAmountPreset(e: any) {
    const preset = e.currentTarget.dataset.preset as string;
    let amount = this.data.withdrawAmount;
    if (preset === 'all') amount = this.data.balance as string;
    else if (preset === '500') amount = '500.00';
    else if (preset === '1000') amount = '1000.00';
    this.setData({ amountPreset: preset, withdrawAmount: amount });
  },

  onAmountInput(e: any) {
    this.setData({ withdrawAmount: e.detail.value, amountPreset: 'custom' });
  },

  openAccountSheet() { this.setData({ showAccountSheet: true }); },
  closeAccountSheet() { this.setData({ showAccountSheet: false }); },

  selectAccount(e: any) {
    this.setData({ accountType: e.currentTarget.dataset.type });
  },

  confirmAccount() {
    const typeMap: Record<string, { name: string; desc: string }> = {
      merchant: { name: '微信商家零钱', desc: '已绑定' },
      corp: { name: '对公银行卡', desc: '尾号 6632' },
      personal: { name: '微信零钱', desc: '已绑定' },
    };
    const info = typeMap[this.data.accountType as string] || typeMap.merchant;
    this.setData({ showAccountSheet: false, accountName: info.name, accountDesc: info.desc });
  },

  async submitWithdraw() {
    const amount = this.data.withdrawAmount as string;
    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({ title: '请输入有效提现金额', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      await createMerchantWithdraw({
        amount,
        account: this.data.accountName as string,
        accountName: this.data.accountName as string,
        accountType: this.data.accountType as string,
        accountNo: this.data.accountType === 'corp' ? 'merchant-corp-account' : 'merchant-balance',
        remark: '商家提现申请',
      });
      wx.showToast({ title: '已提交提现申请', icon: 'success' });
      setTimeout(() => { wx.navigateBack({ delta: 1 }); }, 800);
    } catch (e: any) {
      wx.showToast({ title: e.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
