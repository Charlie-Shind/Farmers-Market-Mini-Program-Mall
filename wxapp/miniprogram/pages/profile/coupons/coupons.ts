import { iconPaths } from '../../../config/icons';
import { fetchUserCoupons, type AppUserCoupon } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

type CouponFilter = 'RECEIVED' | 'EXPIRED';

type CouponView = AppUserCoupon & {
  statusLabel: string;
  statusTone: string;
  periodText: string;
  periodShort: string;
  usableHint: string;
  discountText: string;
};

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
  const statusTone =
    status === 'USED' ? 'coupon-status--used' : status === 'EXPIRED' ? 'coupon-status--expired' : 'coupon-status--ready';
  const start = formatDate(item.validStartAt);
  const end = formatDate(item.validEndAt || item.expiredAt);
  const periodText = start && end ? `有效期：${start} - ${end}` : end ? `有效期至：${end}` : '长期有效';
  const periodShort = end ? `至 ${end}` : start && end ? `${start} - ${end}` : '长期有效';
  const threshold = Number(item.thresholdAmount ?? 0);
  const usableHint =
    status === 'USED'
      ? '已在订单中使用'
      : status === 'EXPIRED'
        ? '卡券已过期'
        : threshold > 0
          ? `满 ${threshold.toFixed(2)} 元可用`
          : '可在结算页使用';
  const discountText = String(item.discountAmount ?? '0').replace(/\.00$/, '');

  return {
    ...item,
    statusLabel,
    statusTone,
    periodText,
    periodShort,
    usableHint,
    discountText,
  };
}

function filterCoupons(list: CouponView[], filter: CouponFilter) {
  if (filter === 'RECEIVED') {
    return list.filter((item) => item.statusTone === 'coupon-status--ready');
  }
  // 已过期：包含过期与已使用（均不可再使用）
  return list.filter((item) => item.statusTone !== 'coupon-status--ready');
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    loading: false,
    loadingText: '正在加载卡券',
    coupons: [] as CouponView[],
    visibleCoupons: [] as CouponView[],
    activeFilter: 'RECEIVED' as CouponFilter,
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
    },
  },
  pageLifetimes: {
    show() {
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
        this.setData({
          coupons: mapped,
          visibleCoupons: filterCoupons(mapped, this.data.activeFilter),
        });
      } catch {
        this.setData({
          coupons: [],
          visibleCoupons: [],
        });
      } finally {
        this.setData({
          loading: false,
        });
      }
    },
    switchFilter(e: WechatMiniprogram.BaseEvent) {
      const { key } = (e.currentTarget.dataset as { key?: CouponFilter }) || {};
      if (!key || key === this.data.activeFilter) {
        return;
      }

      this.setData({
        activeFilter: key,
        visibleCoupons: filterCoupons(this.data.coupons, key),
      });
    },
  },
});
