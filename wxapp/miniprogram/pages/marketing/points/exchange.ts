import { iconPaths } from '../../../config/icons';
import { exchangePointsCoupon, fetchPointExchangeItems } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

type PointsExchangeItem = {
  id: string;
  couponId: number;
  title: string;
  desc: string;
  pointsCost: number;
  received: boolean;
  canRedeem: boolean;
  imageStyle: string;
};

function buildCoverStyle(url?: string): string {
  return url
    ? `background-image: url(${url}); background-size: cover; background-position: center;`
    : '';
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    loading: true,
    loadingText: '正在加载积分兑换',
    pointsBalance: 0,
    pointsGoods: [] as PointsExchangeItem[],
    redeeming: false,
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
      if (!(this as any)._hasLoaded) {
        void this.loadPoints();
      }
    },
  },
  methods: {
    goBack() {
      navigateBackOrHome();
    },
    async loadPoints() {
      this.setData({
        loading: true,
        loadingText: '正在加载积分兑换',
      });

      try {
        const result = await fetchPointExchangeItems().catch(() => ({ balance: 0, items: [] as any[] }));
        const goods: PointsExchangeItem[] = (result.items || []).map((item: any) => ({
          id: String(item.couponId),
          couponId: item.couponId,
          title: item.name,
          desc: [
            item.matchReason || '',
            item.thresholdAmount != null ? `满 ${item.thresholdAmount} 元可用` : '',
          ]
            .filter(Boolean)
            .join(' · ') || '后台配置的积分兑换商品',
          pointsCost: Number(item.pointsCost || 0),
          received: Boolean(item.received),
          canRedeem: Boolean(item.canRedeem),
          imageStyle: buildCoverStyle(
            typeof item.coverUrl === 'string'
              ? item.coverUrl
              : typeof item.imageUrl === 'string'
                ? item.imageUrl
                : '',
          ),
        }));

        this.setData({
          pointsBalance: Number(result.balance || 0),
          pointsGoods: goods,
        });
        (this as any)._hasLoaded = true;
      } catch {
        this.setData({
          pointsBalance: 0,
          pointsGoods: [],
        });
      } finally {
        this.setData({
          loading: false,
        });
      }
    },
    async redeemPoints(e: WechatMiniprogram.BaseEvent) {
      const { couponId } = (e.currentTarget.dataset as { couponId?: number }) || {};
      if (!couponId || this.data.redeeming) {
        return;
      }

      const target = this.data.pointsGoods.find((item) => item.couponId === couponId);
      if (!target) {
        return;
      }

      if (target.received) {
        wx.showToast({ title: '已兑换', icon: 'none' });
        return;
      }

      if (!target.canRedeem) {
        wx.showToast({ title: '积分不足或不满足条件', icon: 'none' });
        return;
      }

      const confirmed = await new Promise<boolean>((resolve) =>
        wx.showModal({
          title: '确认兑换',
          content: `消耗 ${target.pointsCost} 积分兑换「${target.title}」？`,
          success: (res) => resolve(Boolean(res.confirm)),
          fail: () => resolve(false),
        }),
      );

      if (!confirmed) {
        return;
      }

      this.setData({
        redeeming: true,
      });

      try {
        const result = await exchangePointsCoupon(couponId);
        wx.showToast({ title: result.alreadyExchanged ? '已兑换过' : '兑换成功', icon: 'success' });
        await this.loadPoints();
      } catch (err: any) {
        wx.showToast({ title: err?.message || '兑换失败', icon: 'none' });
      } finally {
        this.setData({
          redeeming: false,
        });
      }
    },
  },
});
