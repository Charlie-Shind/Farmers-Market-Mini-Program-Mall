import { iconPaths } from '../../../config/icons';
import { fetchUserCoupons, type AppUserCoupon } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

type CouponFilter = 'ALL' | 'RECEIVED' | 'USED' | 'EXPIRED';

type CouponTab = {
  key: CouponFilter;
  label: string;
  count: number;
};

type CouponView = AppUserCoupon & {
  statusLabel: string;
  statusTone: string;
  periodText: string;
  usableHint: string;
};

const FILTER_TABS: CouponTab[] = [
  { key: 'ALL', label: '全部', count: 0 },
  { key: 'RECEIVED', label: '可使用', count: 0 },
  { key: 'USED', label: '已使用', count: 0 },
  { key: 'EXPIRED', label: '已过期', count: 0 },
];

function formatDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildCouponView(item: AppUserCoupon): CouponView {
  const status = String(item.status || '').toUpperCase();
  const statusLabel = status === 'USED' ? '已使用' : status === 'EXPIRED' ? '已过期' : '可使用';
  const statusTone = status === 'USED' ? 'coupon-status--used' : status === 'EXPIRED' ? 'coupon-status--expired' : 'coupon-status--ready';
  const start = formatDate(item.validStartAt);
  const end = formatDate(item.validEndAt || item.expiredAt);
  const periodText = start && end ? `有效期：${start} - ${end}` : end ? `有效期至：${end}` : '长期有效';
  const usableHint =
    status === 'USED'
      ? '已在订单中使用'
      : status === 'EXPIRED'
        ? '已过期'
        : '可在结算页使用';

  return {
    ...item,
    statusLabel,
    statusTone,
    periodText,
    usableHint,
  };
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    loading: false,
    loadingText: '正在加载卡券',
    coupons: [] as CouponView[],
    visibleCoupons: [] as CouponView[],
    activeFilter: 'ALL' as CouponFilter,
    filterTabs: FILTER_TABS,
    summary: {
      total: 0,
      available: 0,
      used: 0,
      expired: 0,
    },
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
      void this.loadCoupons();
    },
  },
  methods: {
    goBack() {
      navigateBackOrHome();
    },
    async loadCoupons() {
      this.setData({
        loading: true,
        loadingText: '正在加载卡券',
      });

      try {
        const coupons = await fetchUserCoupons();
        const mapped = (coupons ?? []).map(buildCouponView);
        const summary = {
          total: mapped.length,
          available: mapped.filter((item) => item.statusTone === 'coupon-status--ready').length,
          used: mapped.filter((item) => item.statusTone === 'coupon-status--used').length,
          expired: mapped.filter((item) => item.statusTone === 'coupon-status--expired').length,
        };
        const visibleCoupons = mapped.filter((item) => {
          if (this.data.activeFilter === 'ALL') {
            return true;
          }

          if (this.data.activeFilter === 'RECEIVED') {
            return item.statusTone === 'coupon-status--ready';
          }

          if (this.data.activeFilter === 'USED') {
            return item.statusTone === 'coupon-status--used';
          }

          return item.statusTone === 'coupon-status--expired';
        });

        const tabs = this.data.filterTabs.map((t) => {
          if (t.key === 'ALL') return { ...t, count: mapped.length };
          if (t.key === 'RECEIVED') return { ...t, count: mapped.filter((i) => i.statusTone === 'coupon-status--ready').length };
          if (t.key === 'USED') return { ...t, count: mapped.filter((i) => i.statusTone === 'coupon-status--used').length };
          return { ...t, count: mapped.filter((i) => i.statusTone === 'coupon-status--expired').length };
        });
        this.setData({
          coupons: mapped,
          summary,
          filterTabs: tabs,
          visibleCoupons,
        });
      } catch {
        this.setData({
          coupons: [],
          visibleCoupons: [],
          summary: {
            total: 0,
            available: 0,
            used: 0,
            expired: 0,
          },
        });
      } finally {
        this.setData({
          loading: false,
        });
      }
    },
    applyFilter(filter: CouponFilter) {
      const visibleCoupons = this.data.coupons.filter((item) => {
        if (filter === 'ALL') {
          return true;
        }

        if (filter === 'RECEIVED') {
          return item.statusTone === 'coupon-status--ready';
        }

        if (filter === 'USED') {
          return item.statusTone === 'coupon-status--used';
        }

        return item.statusTone === 'coupon-status--expired';
      });

      this.setData({
        activeFilter: filter,
        visibleCoupons,
      });
    },
    switchFilter(e: WechatMiniprogram.BaseEvent) {
      const { key } = (e.currentTarget.dataset as { key?: CouponFilter }) || {};
      if (!key) {
        return;
      }

      this.applyFilter(key);
    },
  },
});
