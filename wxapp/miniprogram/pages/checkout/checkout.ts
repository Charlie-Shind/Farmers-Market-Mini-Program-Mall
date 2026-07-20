import { iconPaths } from '../../config/icons';
import {
  fetchAddresses,
  fetchCart,
  fetchAssetsSummary,
  fetchProductDetail,
  fetchUserCoupons,
  previewOrder,
  createOrder,
  createWechatPayment,
  fetchWechatPaymentStatus,
  mockPaySuccess,
  type AppAddress,
  type AppCoupon,
  type AppUserCoupon,
  type AppCartGroup,
  type AppCartItem,
  type AppProductDetail,
} from '../../services/app';
import { fetchPickupPoints, type PickupPoint } from '../../services/leader';
import { buildPageTopStyle } from '../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome } from '../../utils/auth-route';

type CheckoutItemView = {
  cartId: number;
  productId: number;
  skuId: number;
  title: string;
  skuName: string;
  price: string;
  originalPrice?: string;
  quantity: number;
  coverUrl: string;
  storeName: string;
};

type CheckoutMode = 'cart' | 'groupBuy' | 'flashSale';

type GroupBuyCheckoutContext = {
  groupBuyId: number;
  productId: number;
  skuId: number;
  title: string;
  skuName: string;
  coverUrl: string;
  groupPrice: string;
};

type FlashSaleCheckoutContext = {
  flashSaleItemId: number;
  skuId: number;
  quantity: number;
  flashPrice: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  originPrice: string;
};

type DeliveryMethod = {
  type: number;
  name: string;
};

const DELIVERY_METHODS: DeliveryMethod[] = [
  { type: 1, name: '标准快递' },
  { type: 2, name: '同城冷链' },
  { type: 3, name: '自提点自提' },
];

Component({
  data: {
    checkoutMode: 'cart' as CheckoutMode,
    cartIds: [] as number[],
    groupBuyContext: null as GroupBuyCheckoutContext | null,
    flashSaleContext: null as FlashSaleCheckoutContext | null,
    address: null as AppAddress | null,
    items: [] as CheckoutItemView[],
    deliveryMethods: DELIVERY_METHODS,
    selectedDelivery: DELIVERY_METHODS[0],
    pickupPoints: [] as PickupPoint[],
    selectedPickupPoint: null as PickupPoint | null,
    selectedPickupPointId: 0,
    availableCoupons: [] as AppCoupon[],
    selectedCoupon: null as AppCoupon | null,
    selectedCouponId: 0,
    usePoints: false,
    points: {
      balance: 0,
      usable: 0,
      money: '0.00',
      redeemEnabled: true,
      redeemRate: 100,
    },
    summary: {
      productAmount: '0.00',
      freightAmount: '0.00',
      couponDiscount: '0.00',
      pointsDiscount: '0.00',
      payAmount: '0.00',
    },
    icons: iconPaths,
    pageStyle: '',
    activeSheet: '',
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
      this.hideStackedTabBar();
      void this.bootstrapPage();
    },
    hide() {
      this.restoreStackedTabBar();
    },
  },
  methods: {
    hideStackedTabBar() {
      const pages = getCurrentPages();
      for (let i = pages.length - 1; i >= 0; i -= 1) {
        const page = pages[i] as { getTabBar?: () => WechatMiniprogram.Component.TrivialInstance | null };
        const tabBar = page.getTabBar?.();
        if (tabBar) {
          tabBar.setData({ visible: false });
          return;
        }
      }
    },
    restoreStackedTabBar() {
      const pages = getCurrentPages();
      for (let i = pages.length - 1; i >= 0; i -= 1) {
        const page = pages[i] as { getTabBar?: () => WechatMiniprogram.Component.TrivialInstance & { syncFromRoute?: () => void } | null };
        const tabBar = page.getTabBar?.();
        if (tabBar?.syncFromRoute) {
          tabBar.syncFromRoute();
          return;
        }
      }
    },
    async bootstrapPage() {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const pages = getCurrentPages();
      const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
      const options = current?.options || {};
      const cartIdsStr = options.cartIds || '';
      const groupBuyIdStr = options.groupBuyId || '';
      const productIdStr = options.productId || '';
      const skuIdStr = options.skuId || '';

      const modeStr = options.mode || '';

      if (!cartIdsStr && !groupBuyIdStr && modeStr !== 'flashSale' && modeStr !== 'groupBuy') {
        wx.showToast({ title: '参数错误', icon: 'none' });
        setTimeout(() => this.goBack(), 1500);
        return;
      }

      if (modeStr === 'flashSale') {
        const flashSaleItemId = Number(options.flashSaleItemId);
        const skuId = Number(options.skuId);
        const quantity = Number(options.quantity || 1);
        const flashPrice = options.flashPrice || '0.00';
        const title = options.title ? decodeURIComponent(options.title) : '';
        const subtitle = options.subtitle ? decodeURIComponent(options.subtitle) : '';
        const coverUrl = options.coverUrl ? decodeURIComponent(options.coverUrl) : '';
        const originPrice = options.originPrice ? decodeURIComponent(options.originPrice) : '';

        if (![flashSaleItemId, skuId].every((v) => Number.isFinite(v) && v > 0)) {
          wx.showToast({ title: '秒杀参数错误', icon: 'none' });
          setTimeout(() => this.goBack(), 1500);
          return;
        }

        this.setData({
          checkoutMode: 'flashSale',
          cartIds: [],
          groupBuyContext: null,
          flashSaleContext: { flashSaleItemId, skuId, quantity, flashPrice, title, subtitle, coverUrl, originPrice },
        });
        await this.initCheckoutData();
        return;
      }

      if (groupBuyIdStr) {
        const groupBuyId = Number(groupBuyIdStr);
        const productId = Number(productIdStr);
        const skuId = Number(skuIdStr);
        if (![groupBuyId, productId, skuId].every((value) => Number.isFinite(value) && value > 0)) {
          wx.showToast({ title: '拼团参数错误', icon: 'none' });
          setTimeout(() => this.goBack(), 1500);
          return;
        }

        const sameGroupBuy =
          this.data.checkoutMode === 'groupBuy' &&
          this.data.groupBuyContext?.groupBuyId === groupBuyId &&
          this.data.groupBuyContext?.productId === productId &&
          this.data.groupBuyContext?.skuId === skuId &&
          this.data.items.length > 0;
        if (sameGroupBuy) {
          return;
        }

        this.setData({
          checkoutMode: 'groupBuy',
          cartIds: [],
          groupBuyContext: {
            groupBuyId,
            productId,
            skuId,
            title: '',
            skuName: '',
            coverUrl: '',
            groupPrice: '0.00',
          },
        });
        await this.initCheckoutData();
        return;
      }

      if (modeStr === 'groupBuy') {
        const productId = Number(productIdStr);
        const skuId = Number(skuIdStr);
        if (![productId, skuId].every((value) => Number.isFinite(value) && value > 0)) {
          wx.showToast({ title: '拼团参数错误', icon: 'none' });
          setTimeout(() => this.goBack(), 1500);
          return;
        }

        this.setData({
          checkoutMode: 'groupBuy',
          cartIds: [],
          groupBuyContext: {
            groupBuyId: 0,
            productId,
            skuId,
            title: '',
            skuName: '',
            coverUrl: '',
            groupPrice: '0.00',
          },
        });
        await this.initCheckoutData();
        return;
      }

      const cartIds = cartIdsStr.split(',').map(Number).filter(Boolean);
      const sameCartIds =
        this.data.checkoutMode === 'cart' &&
        cartIds.length === this.data.cartIds.length &&
        cartIds.every((id, index) => id === this.data.cartIds[index]);
      if (sameCartIds && this.data.items.length > 0) {
        return;
      }

      this.setData({
        checkoutMode: 'cart',
        cartIds,
        groupBuyContext: null,
      });

      await this.initCheckoutData();
    },
    goBack() {
      navigateBackOrHome();
    },
    async initCheckoutData() {
      wx.showLoading({ title: '加载中…' });

      try {
        const addresses = await fetchAddresses();
        const defaultAddress = addresses.find((a: AppAddress) => a.isDefault) || addresses[0] || null;

        let flatItems: CheckoutItemView[] = [];
        let totalGoodsAmount = 0;

        if (this.data.checkoutMode === 'flashSale') {
          const context = this.data.flashSaleContext;
          if (!context) {
            wx.showToast({ title: '秒杀参数缺失', icon: 'none' });
            setTimeout(() => this.goBack(), 1500);
            return;
          }
          flatItems = [
            {
              cartId: 0,
              productId: 0,
              skuId: context.skuId,
              title: context.title || '秒杀商品',
              skuName: context.subtitle || '',
              price: context.flashPrice,
              originalPrice: context.originPrice || undefined,
              quantity: context.quantity,
              coverUrl: context.coverUrl || '',
              storeName: '',
            },
          ];
          totalGoodsAmount = Number(context.flashPrice) * context.quantity;
        } else if (this.data.checkoutMode === 'groupBuy') {
          const context = this.data.groupBuyContext;
          if (!context) {
            wx.showToast({ title: '拼团参数缺失', icon: 'none' });
            setTimeout(() => this.goBack(), 1500);
            return;
          }

          const product: AppProductDetail = await fetchProductDetail(context.productId);
          const selectedSku = product.skus.find((item) => Number(item.id) === Number(context.skuId)) || product.skus[0];
          if (!selectedSku) {
            wx.showToast({ title: '拼团规格失效', icon: 'none' });
            setTimeout(() => this.goBack(), 1500);
            return;
          }
          const groupConfig = product.groupBuyConfig;
          if (!groupConfig || !groupConfig.enabled) {
            wx.showToast({ title: '该商品暂不支持拼团', icon: 'none' });
            setTimeout(() => this.goBack(), 1500);
            return;
          }

          const groupPrice = (Number(selectedSku.price) * groupConfig.discountRate).toFixed(2);
          flatItems = [
            {
              cartId: 0,
              productId: Number(product.id),
              skuId: Number(selectedSku.id),
              title: product.title,
              skuName: selectedSku.skuName || '默认规格',
              price: groupPrice,
              quantity: 1,
              coverUrl: selectedSku.imageUrl || product.coverUrl,
              storeName: product.merchantName || '',
            },
          ];
          totalGoodsAmount = Number(groupPrice);
          this.setData({
            groupBuyContext: {
              ...context,
              title: product.title,
              skuName: selectedSku.skuName || '默认规格',
              coverUrl: selectedSku.imageUrl || product.coverUrl,
              groupPrice,
            },
          });
        } else {
          const cartResult = await fetchCart();
          (cartResult.groups || []).forEach((group: AppCartGroup) => {
            group.items.forEach((item: AppCartItem) => {
              if (this.data.cartIds.includes(item.cartId)) {
                flatItems.push({
                  cartId: item.cartId,
                  productId: item.productId,
                  skuId: item.skuId,
                  title: item.title,
                  skuName: item.skuName || '默认规格',
                  price: item.price,
                  quantity: item.quantity,
                  coverUrl: item.coverUrl,
                  storeName: group.storeName,
                });
              }
            });
          });

          if (flatItems.length === 0) {
            wx.showToast({ title: '结算商品失效', icon: 'none' });
            setTimeout(() => this.goBack(), 1500);
            return;
          }

          totalGoodsAmount = flatItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
        }

        const userCoupons = await fetchUserCoupons().catch(() => [] as AppUserCoupon[]);
        const nowMs = Date.now();
        const availableCoupons: AppCoupon[] = userCoupons
          .filter((uc) => uc.status === 'RECEIVED')
          .filter((uc) => !uc.validEndAt || new Date(uc.validEndAt).getTime() >= nowMs)
          .filter((uc) => Number(uc.thresholdAmount) <= totalGoodsAmount)
          .map((uc) => ({
            couponId: uc.couponId,
            name: uc.name,
            type: uc.type,
            thresholdAmount: uc.thresholdAmount,
            discountAmount: uc.discountAmount,
            stock: 0,
            issuedStock: 0,
            received: true,
          }));

        const assets = await fetchAssetsSummary().catch(() => null);
        const pointsBalance = assets?.points.balance || 0;
        const pointsRedeemEnabled = assets?.points.redeemEnabled !== false;
        const pointsRedeemRate = Math.max(Number(assets?.points.redeemRate ?? 100) || 100, 1);

        this.setData({
          address: defaultAddress,
          items: flatItems,
          availableCoupons,
          selectedCouponId: this.data.selectedCoupon?.couponId || 0,
          usePoints: pointsRedeemEnabled ? this.data.usePoints : false,
          points: {
            balance: pointsBalance,
            usable: pointsRedeemEnabled ? Math.min(pointsBalance, Math.floor(totalGoodsAmount * pointsRedeemRate)) : 0,
            money: pointsRedeemEnabled
              ? (Math.min(pointsBalance, Math.floor(totalGoodsAmount * pointsRedeemRate)) / pointsRedeemRate).toFixed(2)
              : '0.00',
            redeemEnabled: pointsRedeemEnabled,
            redeemRate: pointsRedeemRate,
          },
        });

        await this.loadOrderPreview();
      } catch {
        wx.showToast({ title: '获取订单信息失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },
    async loadPickupPoints() {
      try {
        const result = await fetchPickupPoints({ pageSize: 50 });
        const list = (result?.list || []).map((p) => ({
          ...p,
          name: p.storeName,
          address: p.storeAddress,
          contactPhone: p.leaderPhone,
          distance: p.distanceLabel,
        }));
        this.setData({
          pickupPoints: list as any,
        });
      } catch {
        this.setData({
          pickupPoints: [],
        });
      }
    },
    async loadOrderPreview() {
      const address = this.data.address;
      const cartIds = this.data.cartIds;
      const deliveryType = this.data.selectedDelivery.type;
      const couponId = this.data.selectedCoupon?.couponId || null;
      const usePointsVal = this.data.points.redeemEnabled && this.data.usePoints ? this.data.points.usable : 0;
      const groupBuyContext = this.data.groupBuyContext;
      const pickupPointId = this.data.selectedPickupPointId || null;

      let freightAmount = 0;
      if (deliveryType === 1) {
        freightAmount = 8.0;
      } else if (deliveryType === 2) {
        freightAmount = 15.0;
      }

      try {
        const previewPayload: Record<string, unknown> = {
          addressId: address?.id || null,
          couponId,
          usePoints: usePointsVal,
          deliveryType,
          freightAmount,
          pickupPointId,
        };
        if (this.data.checkoutMode === 'flashSale' && this.data.flashSaleContext) {
          Object.assign(previewPayload, {
            flashSaleItemId: this.data.flashSaleContext.flashSaleItemId,
            skuId: this.data.flashSaleContext.skuId,
            quantity: this.data.flashSaleContext.quantity,
          });
        } else if (this.data.checkoutMode === 'groupBuy' && groupBuyContext) {
          Object.assign(previewPayload, {
            orderMode: 'GROUP_BUY',
            groupBuyId: groupBuyContext.groupBuyId,
            productId: groupBuyContext.productId,
            skuId: groupBuyContext.skuId,
            quantity: 1,
          });
        } else {
          Object.assign(previewPayload, {
            cartIds,
          });
        }

        const preview = await previewOrder(previewPayload);
        const couponDiscount = preview.coupon?.usable ? String(preview.coupon.discountAmount ?? '0.00') : '0.00';
        const pointsDiscount = Math.max(
          Number(preview.summary.productAmount) + Number(preview.summary.freightAmount) - Number(preview.summary.payAmount) - Number(couponDiscount),
          0,
        ).toFixed(2);

        this.setData({
          summary: {
            productAmount: preview.summary.productAmount,
            freightAmount: preview.summary.freightAmount,
            couponDiscount,
            pointsDiscount,
            payAmount: preview.summary.payAmount,
          },
        });
      } catch {
        wx.showToast({ title: '价格预估失败，请稍后重试', icon: 'none' });
      }
    },
    selectAddress() {
      wx.navigateTo({
        url: '/pages/address/list/list?mode=select',
        events: {
          selectAddress: (address: AppAddress) => {
            this.setData({
              address,
            });
            void this.loadOrderPreview();
          },
        },
        success: (res) => {
          const eventChannel = res.eventChannel;
          if (eventChannel && typeof eventChannel.on === 'function') {
            eventChannel.on('selectAddress', (address: AppAddress) => {
              this.setData({
                address,
              });
              void this.loadOrderPreview();
            });
          }
        },
      });
    },
    async onDeliveryChange(e: WechatMiniprogram.CustomEvent & { detail?: { value?: string } }) {
      const index = Number(e.detail?.value || 0);
      const selectedDelivery = DELIVERY_METHODS[index] || DELIVERY_METHODS[0];

      this.setData({
        selectedDelivery,
      });

      if (selectedDelivery.type === 3 && this.data.pickupPoints.length === 0) {
        await this.loadPickupPoints();
      }

      void this.loadOrderPreview();
    },
    async onPointsToggle(e: WechatMiniprogram.CustomEvent & { detail?: { value?: boolean } }) {
      if (!this.data.points.redeemEnabled) {
        this.setData({
          usePoints: false,
        });
        return;
      }
      this.setData({
        usePoints: e.detail?.value === true,
      });

      void this.loadOrderPreview();
    },
    openCouponSheet() {
      this.setData({
        activeSheet: 'coupon',
      });
    },
    async openPickupPointSheet() {
      if (this.data.pickupPoints.length === 0) {
        await this.loadPickupPoints();
      }
      this.setData({
        activeSheet: 'pickup',
      });
    },
    closeSheet() {
      this.setData({
        activeSheet: '',
      });
    },
    preventBubble() {},
    preventTouchMove() {},
    selectCoupon(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id;
      if (id === 'none' || !id) {
        this.setData({
          selectedCoupon: null,
          selectedCouponId: 0,
          activeSheet: '',
        });
      } else {
        const coupon = this.data.availableCoupons.find((c) => c.couponId === Number(id));
        this.setData({
          selectedCoupon: coupon || null,
          selectedCouponId: coupon?.couponId || 0,
          activeSheet: '',
        });
      }

      void this.loadOrderPreview();
    },
    selectPickupPoint(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id;
      const point = this.data.pickupPoints.find((p) => p.id === Number(id));
      if (point) {
        this.setData({
          selectedPickupPoint: point,
          selectedPickupPointId: point.id,
          activeSheet: '',
        });
        void this.loadOrderPreview();
      }
    },
    async submitOrder() {
      if (!ensureCustomerAccess('/pages/checkout/checkout')) {
        return;
      }

      const deliveryType = this.data.selectedDelivery.type;

      if (deliveryType === 3) {
        if (!this.data.selectedPickupPointId) {
          wx.showToast({ title: '请选择自提点', icon: 'none' });
          return;
        }
      } else {
        const address = this.data.address;
        if (!address) {
          wx.showToast({ title: '请先选择收货地址', icon: 'none' });
          return;
        }
      }

      wx.showLoading({ title: '正在提交订单…' });
      let createdOrderNo = '';
      let detailOrderNo = '';

      try {
        const couponId = this.data.selectedCoupon?.couponId || null;
        const usePointsVal = this.data.points.redeemEnabled && this.data.usePoints ? this.data.points.usable : 0;
        const groupBuyContext = this.data.groupBuyContext;
        const pickupPointId = this.data.selectedPickupPointId || null;
        let freightAmount = 0;
        if (deliveryType === 1) freightAmount = 8.0;
        else if (deliveryType === 2) freightAmount = 15.0;

        const orderPayload: Record<string, unknown> = {
          addressId: this.data.address?.id || null,
          couponId,
          usePoints: usePointsVal,
          deliveryType,
          freightAmount,
          pickupPointId,
          remark: '',
        };
        if (this.data.checkoutMode === 'flashSale' && this.data.flashSaleContext) {
          Object.assign(orderPayload, {
            flashSaleItemId: this.data.flashSaleContext.flashSaleItemId,
            skuId: this.data.flashSaleContext.skuId,
            quantity: this.data.flashSaleContext.quantity,
          });
        } else if (this.data.checkoutMode === 'groupBuy' && groupBuyContext) {
          Object.assign(orderPayload, {
            orderMode: 'GROUP_BUY',
            groupBuyId: groupBuyContext.groupBuyId,
            productId: groupBuyContext.productId,
            skuId: groupBuyContext.skuId,
            quantity: 1,
          });
        } else {
          Object.assign(orderPayload, {
            cartIds: this.data.cartIds,
          });
        }

        const orderResult = await createOrder(orderPayload);
        createdOrderNo = orderResult.orderNo;
        detailOrderNo = orderResult.childOrderNos?.[0] || orderResult.orderNo;

        const payment = await createWechatPayment({ orderNo: orderResult.orderNo });
        const paymentStatus = await fetchWechatPaymentStatus(orderResult.orderNo);

        wx.hideLoading();

        wx.showModal({
          title: '支付单已创建',
          content:
            paymentStatus.tradeState === 'SUCCESS'
              ? `实付金额：¥${this.data.summary.payAmount}\n支付单号：${payment.paymentNo}\n支付状态：已支付。`
              : `实付金额：¥${this.data.summary.payAmount}\n支付单号：${payment.paymentNo}\n支付状态：待支付，可稍后继续支付。`,
          showCancel: false,
          confirmText: '知道了',
          confirmColor: '#2c4a39',
          success: async () => {
            if (paymentStatus.tradeState === 'SUCCESS') {
              wx.showToast({ title: '订单已支付', icon: 'none' });
              setTimeout(() => {
                wx.reLaunch({ url: `/pages/order/detail/detail?orderNo=${detailOrderNo}` });
              }, 1200);
              return;
            }
            wx.showLoading({ title: '正在支付…' });
            try {
              await mockPaySuccess(orderResult.orderNo);
              wx.hideLoading();
              wx.showToast({ title: '支付成功', icon: 'success' });
            } catch {
              wx.hideLoading();
              wx.showToast({ title: '模拟支付失败', icon: 'none' });
            }
            setTimeout(() => {
              wx.reLaunch({ url: `/pages/order/detail/detail?orderNo=${detailOrderNo}` });
            }, 1200);
          },
        });
      } catch (err: any) {
        wx.hideLoading();
        if (createdOrderNo) {
          wx.showToast({
            title: err?.message || '订单已生成，可稍后继续支付',
            icon: 'none',
          });
          setTimeout(() => {
            wx.reLaunch({
              url: `/pages/order/detail/detail?orderNo=${detailOrderNo || createdOrderNo}`,
            });
          }, 1200);
          return;
        }
        wx.showToast({
          title: err?.message || '下单失败，请重试',
          icon: 'none',
        });
      }
    },
  },
});
