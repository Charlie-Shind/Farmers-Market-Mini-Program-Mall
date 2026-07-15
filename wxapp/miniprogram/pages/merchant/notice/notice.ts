import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantNotices, type MerchantNotice } from '../../../services/merchant';
import { iconPaths } from '../../../config/icons';

function formatTime(raw: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    loading: true,
    loadingMore: false,
    noMore: false,
    tabs: [
      { key: 'all', name: '全部', active: true, unread: 0 },
      { key: 'order', name: '订单', active: false, unread: 0 },
      { key: 'official', name: '官方', active: false, unread: 0 },
      { key: 'risk', name: '风险', active: false, unread: 0 },
    ],
    activeTab: 'all',
    allNotices: [] as any[],
    filteredNotices: [] as any[],
    page: 1,
    pageSize: 20,
    icons: iconPaths,
  },

  onLoad() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
    this.loadNotices(true);
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
  },

  async loadNotices(reset = true) {
    const page = reset ? 1 : this.data.page;
    this.setData({ [reset ? 'loading' : 'loadingMore']: true } as any);

    try {
      const res = await fetchMerchantNotices({ page, pageSize: this.data.pageSize });
      const items = (res?.items || []) as MerchantNotice[];
      const isValidOrderNo = (v: string) => /^NO/i.test(v) || /^\d+$/.test(v);
      const isStockRiskNotice = (notice: MerchantNotice) =>
        /库存|预警/.test(`${notice.title || ''}${notice.summary || ''}${notice.content || ''}`);
      let mapped = items.map((n) => ({
        id: n.id || n.noticeId,
        type: n.type === 'ORDER' ? 'order' : (n.type === 'SYSTEM' || n.type === 'AUDIT') ? 'official' : 'risk',
        typeLabel: n.typeLabel || (n.type === 'ORDER' ? '订单通知' : n.type === 'SYSTEM' ? '平台公告' : '风险提醒'),
        title: n.title,
        desc: n.summary || n.content || '',
        timeText: formatTime(n.createdAt),
        isRead: n.isRead || n.read !== false,
        icon: n.type === 'ORDER'
          ? 'invoice'
          : n.type === 'RISK'
            ? (isStockRiskNotice(n) ? 'package' : iconPaths.warning)
            : 'bell',
        iconClass: n.type === 'RISK'
          ? (isStockRiskNotice(n) ? 'ok' : 'warn')
          : n.type === 'ORDER'
            ? 'ok'
            : '',
        link: n.orderNo && isValidOrderNo(String(n.orderNo)) ? `/pages/merchant/order-detail/order-detail?orderNo=${encodeURIComponent(String(n.orderNo))}` : '',
      }));
      // 后端暂无消息时，拉取订单/售后数据生成实时通知
      if (mapped.length === 0 && reset) {
        try {
          const { fetchMerchantOrders } = require('../../../services/merchant');
          const ordersRes = await fetchMerchantOrders({ page: 1, pageSize: 5 });
          const orderItems = (ordersRes?.items || ordersRes || []) as any[];
          const now = new Date().toISOString();
          const orderNotices = orderItems.slice(0, 5).map((o: any, i: number) => ({
            id: 1000 + i,
            type: 'order',
            typeLabel: '订单通知',
            title: `${o.userName || '买家'} 下单`,
            desc: `${o.itemPreview?.[0]?.title || o.payAmount || '新订单'} · ${o.status || '待处理'}`,
            timeText: formatTime(o.createdAt || now),
            isRead: i > 0,
            icon: 'invoice',
            iconClass: 'ok',
            link: o.orderNo && isValidOrderNo(String(o.orderNo)) ? `/pages/merchant/order-detail/order-detail?orderNo=${encodeURIComponent(String(o.orderNo))}` : '',
          }));
          mapped = orderNotices;
        } catch { /* fallback */ }
      }
      const allNotices = reset ? mapped : [...(this.data.allNotices as any[]), ...mapped];
      const total = res?.total ?? allNotices.length;
      this.setData({
        allNotices,
        page: page + 1,
        noMore: allNotices.length >= total || mapped.length === 0,
        loading: false,
        loadingMore: false,
      }, () => this.applyFilters());
    } catch {
      this.setData({ loading: false, loadingMore: false, noMore: true });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.navigateTo({ url: '/pages/merchant/dashboard/dashboard' });
  },

  goPage(e: any) {
    const url = e.currentTarget.dataset.url as string;
    if (!url) return;
    wx.navigateTo({ url });
  },

  onTabTap(e: any) {
    const key = e.currentTarget.dataset.key as string;
    const tabs = (this.data.tabs as any[]).map((t) => ({ ...t, active: t.key === key }));
    this.setData({ tabs, activeTab: key }, () => this.applyFilters());
  },

  applyFilters() {
    const { allNotices, activeTab } = this.data;
    let list = (allNotices as any[]).slice();
    if (activeTab === 'order') list = list.filter((n) => n.type === 'order');
    else if (activeTab === 'official') list = list.filter((n) => n.type === 'official');
    else if (activeTab === 'risk') list = list.filter((n) => n.type === 'risk');

    // 更新各 tab 未读数
    const tabs = (this.data.tabs as any[]).map((t) => {
      if (t.key === 'all') return { ...t, unread: allNotices.filter((n) => !n.isRead).length };
      if (t.key === 'order') return { ...t, unread: allNotices.filter((n) => n.type === 'order' && !n.isRead).length };
      if (t.key === 'official') return { ...t, unread: allNotices.filter((n) => n.type === 'official' && !n.isRead).length };
      if (t.key === 'risk') return { ...t, unread: allNotices.filter((n) => n.type === 'risk' && !n.isRead).length };
      return t;
    });

    this.setData({ filteredNotices: list, tabs });
  },

  openNotice(e: any) {
    const item = e.currentTarget.dataset.item;
    if (item.link) wx.navigateTo({ url: item.link });
  },

  loadMore() {
    if (this.data.noMore || this.data.loading || this.data.loadingMore) return;
    this.loadNotices(false);
  },
});
