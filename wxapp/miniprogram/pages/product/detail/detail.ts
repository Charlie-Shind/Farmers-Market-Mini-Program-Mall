import { iconPaths } from '../../../config/icons';
import {
  fetchProductDetail,
  addFavorite,
  removeFavorite,
  addToCart,
  fetchCartItemCount,
  type AppProductDetail,
} from '../../../services/app';
import { joinGroupBuy, isAlreadyJoinedGroupError, navigateToJoinedGroupProgress, buildGroupBuyCheckoutUrl } from '../../../services/quick';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';
import { getAuthTokenType } from '../../../services/token';
import { buildProfileLoginUrl } from '../../../utils/auth-route';
import { buildTracePageUrl, buildQrCodeImageUrl } from '../../../config/env';

type SkuItem = {
  id: number;
  skuName: string;
  imageUrl?: string;
  price: string;
  originalPrice: string;
  offlinePrice?: string | null;
  stock: number;
  safetyStock?: number | null;
  specJson: Record<string, string>;
  specSummary?: string;
};

type StoryBadgeItem = {
  key: string;
  title: string;
  desc: string;
  icon: keyof typeof iconPaths;
};

type ProductDetailView = Omit<AppProductDetail, 'skus'> & {
  skus: SkuItem[];
  detailIsHtml?: boolean;
  detailHtml?: string;
};

function looksLikeHtml(content?: string | null) {
  return /<\s*(p|img|div|br|h[1-6]|span|section|ul|ol|li)\b/i.test(String(content || ''));
}

function normalizeDetailHtml(content?: string | null) {
  const raw = String(content || '').trim();
  if (!raw) return '';
  // 给图片补全宽度样式，方便小程序 rich-text 展示
  return raw.replace(
    /<img\b([^>]*?)\/?>/gi,
    (_match, attrs: string) => {
      if (/style=/i.test(attrs)) {
        return `<img${attrs}>`;
      }
      return `<img${attrs} style="width:100%;display:block;margin:12px 0;">`;
    },
  );
}

function buildSkuSpecSummary(specJson?: Record<string, string>) {
  if (!specJson) {
    return '';
  }

  return Object.entries(specJson)
    .filter(([key, value]) => key && value)
    .map(([key, value]) => `${key}：${value}`)
    .join(' · ');
}

function buildStoryBadges(product: ProductDetailView): StoryBadgeItem[] {
  const serviceTags = Array.isArray(product.serviceTags) ? product.serviceTags : [];
  const matched = new Map<string, StoryBadgeItem>();
  const normalized = serviceTags.map((tag, index) => {
    const title = String(tag.title || '').trim();
    const desc = String(tag.desc || '').trim();
    const icon = (tag.icon && tag.icon in iconPaths ? tag.icon : 'shield') as keyof typeof iconPaths;
    const item: StoryBadgeItem = {
      key: tag.key || `badge-${index}`,
      title: title || '标签',
      desc: desc || '',
      icon,
    };

    if (/品牌|品牌保障|品牌直供/.test(title)) {
      matched.set('brand', { ...item, key: 'brand', title: title || '品牌保障', desc: desc || '源头直供', icon: 'shield' });
    } else if (/坏果|破损|包赔|赔付/.test(title)) {
      matched.set('compensation', { ...item, key: 'compensation', title: title || '坏果包赔', desc: desc || '安心售后', icon: 'shield' });
    } else if (/冷链|冷藏|直发|速发|保鲜/.test(title)) {
      matched.set('coldchain', { ...item, key: 'coldchain', title: title || '冷链直发', desc: desc || '全程保鲜', icon: 'cart' });
    }

    return item;
  });

  const brandName = String(product.brand || product.merchant?.storeName || '').trim();
  const brandBadge: StoryBadgeItem =
    brandName
      ? { key: 'brand', title: brandName, desc: '品牌标签', icon: 'shield' }
      : matched.get('brand') || normalized[0] || { key: 'brand', title: '品牌标签', desc: '', icon: 'shield' };

  const result = [
    brandBadge,
    matched.get('compensation') || normalized[1] || { key: 'compensation', title: '坏果包赔', desc: '安心售后', icon: 'shield' },
    matched.get('coldchain') || normalized[2] || { key: 'coldchain', title: '冷链直发', desc: '全程保鲜', icon: 'cart' },
  ];

  return result.slice(0, 3);
}

function formatSalesCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) {
    return '已售 0件';
  }

  if (count >= 10000) {
    return `已售 ${(count / 10000).toFixed(count % 10000 === 0 ? 0 : 1)}万件`;
  }

  if (count >= 1000) {
    return `已售 ${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}千件`;
  }

  return `已售 ${count}件`;
}

function normalizeImageUrl(url?: string) {
  const value = String(url ?? '').trim();
  if (!value) {
    return '';
  }

  return encodeURI(value);
}

function resolveMediaPreviewUrl(media?: { kind: 'image' | 'video'; src: string; poster?: string } | null): string {
  if (!media) {
    return '';
  }

  return media.kind === 'video' ? (media.poster || media.src || '') : (media.src || '');
}

function extractTraceCode(rawValue?: string) {
  const value = String(rawValue ?? '').trim();
  if (!value) {
    return '';
  }

  const queryValue = (() => {
    if (!value.includes('?')) {
      return '';
    }

    const query = value.split('?')[1] || '';
    const pairs = query.split('&');
    for (const pair of pairs) {
      const [rawKey, rawVal = ''] = pair.split('=');
      const key = decodeURIComponent(rawKey || '');
      if (key === 'traceCode' || key === 'trace_code' || key === 'code') {
        return decodeURIComponent(rawVal || '').trim();
      }
    }

    return '';
  })();

  const directMatch = value.match(/[A-Za-z0-9_-]{6,}/);
  const pathSegments = value.split('/').filter(Boolean);
  const pathMatch = pathSegments[pathSegments.length - 1] || '';

  return (queryValue || directMatch?.[0] || pathMatch || value).trim();
}

type BrowseHistoryItem = {
  productId: number;
  title: string;
  subtitle: string;
  price: string;
  coverUrl: string;
  visitedAt: number;
};

const BROWSE_HISTORY_KEY = 'farm.browse.history.v1';
const BROWSE_HISTORY_LIMIT = 20;

function recordBrowseHistory(product: AppProductDetail) {
  try {
    const current = wx.getStorageSync(BROWSE_HISTORY_KEY);
    const list: BrowseHistoryItem[] = Array.isArray(current) ? current : [];
    const skus = product.skus || [];
    const prices = skus.map((s) => Number(s.price)).filter((p) => p > 0).sort((a, b) => a - b);
    const derivedPrice =
      product.minPrice ||
      product.maxPrice ||
      (prices.length > 0 ? prices[0].toFixed(2) : '');
    const next: BrowseHistoryItem = {
      productId: product.id,
      title: product.title,
      subtitle: product.subtitle || product.originPlace || '浏览过的商品',
      price: derivedPrice,
      coverUrl: product.coverUrl || product.images?.[0] || '',
      visitedAt: Date.now(),
    };

    const merged = [next, ...list.filter((item) => item.productId !== next.productId)].slice(0, BROWSE_HISTORY_LIMIT);
    wx.setStorageSync(BROWSE_HISTORY_KEY, merged);
  } catch {
    // Ignore storage failures and keep the page usable.
  }
}

Component({
  data: {
    product: {
      images: [],
      videos: [],
      skus: [],
    } as unknown as ProductDetailView,
    mediaList: [] as Array<{ kind: 'image' | 'video'; src: string; poster?: string }>,
    currentMediaUrl: '',
    displayPrice: '',
    displayPriceInteger: '',
    displayPriceFraction: '',
    heroImageUrl: '',
    selectedSkuSpecSummary: '',
    totalStock: 0,
    cartCount: 0,
    icons: iconPaths,
    pageStyle: '',
    activeSheet: '',
    selectedSku: null as SkuItem | null,
    purchaseQty: 1,
    sheetAction: 'cart' as 'cart' | 'buy' | 'groupBuy',
    traceQrUrl: '',
    bannerIndex: 0,
    bannerTotal: 1,
    coreTags: [] as string[],
    storyBadges: [] as StoryBadgeItem[],
    displayOriginalPrice: '',
    displaySalesText: '已售 0件',
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
      void this.syncCartCount();
      void this.bootstrapProductDetail();
    },
  },
  methods: {
    async resolveRouteProductId() {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const pages = getCurrentPages();
      const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
      const options = current?.options || {};
      return Number(options.productId || options.id || 0);
    },
    async bootstrapProductDetail() {
      const productId = await this.resolveRouteProductId();
      const currentProductId = this.data.product?.id || 0;

      if (productId > 0 && productId === currentProductId) {
        void this.loadProductDetail(productId, true);
        return;
      }

      if (productId > 0) {
        await this.loadProductDetail(productId);
        return;
      }

      wx.showToast({ title: '商品不存在或已被下架', icon: 'none' });
      setTimeout(() => {
        this.goBack();
      }, 1500);
    },
    async loadProductDetail(productId: number, silent = false) {
      if (!silent) {
        wx.showLoading({ title: '加载中…' });
      }

      try {
        const product = await fetchProductDetail(productId);
        if (!product) {
          wx.showToast({ title: '商品已被下架', icon: 'none' });
          setTimeout(() => this.goBack(), 1500);
          return;
        }

        const skus = (product.skus || []).map((sku) => ({
          ...sku,
          specSummary: buildSkuSpecSummary(sku.specJson),
        }));
        const galleryImages = (Array.isArray(product.images) ? product.images : [])
          .map((image) => normalizeImageUrl(image))
          .filter(Boolean);
        const galleryVideos = (Array.isArray(product.videos) ? product.videos : []).map((video) => ({
          ...video,
          videoUrl: normalizeImageUrl(video.videoUrl),
          coverUrl: normalizeImageUrl(video.coverUrl),
        }));
        const mediaList = [
          ...galleryImages.map((src) => ({ kind: 'image' as const, src })),
          ...galleryVideos.map((item) => ({
            kind: 'video' as const,
            src: item.videoUrl,
            poster: item.coverUrl || galleryImages[0] || '',
          })),
        ];

        // Generate trace QR code URL
        let traceQrUrl = '';
        if (product.traceInfo?.traceCode) {
          const tracePageUrl = buildTracePageUrl(product.traceInfo.traceCode);
          traceQrUrl = buildQrCodeImageUrl(tracePageUrl);
        }

        // Calculate total stock and display price
        const totalStock = skus.reduce((sum, s) => sum + Number(s.stock || 0), 0);
        let displayPrice = '0.00';
        let displayPriceInteger = '0';
        let displayPriceFraction = '00';
        const salesCount = Number((product as any).saleCount ?? (product as any).salesCount ?? 0);
        const coreTags = (() => {
          const serviceTagTexts = (Array.isArray(product.serviceTags) && product.serviceTags.length > 0
            ? product.serviceTags
                .map((tag) => String(tag.title || tag.desc || '').trim())
                .filter(Boolean)
            : []);

          if (serviceTagTexts.length > 0) {
            return serviceTagTexts.slice(0, 3);
          }

          return [
            String(product.brand || '').trim(),
            String(product.originPlace || '').trim(),
            String(product.merchant?.storeName || product.supplierName || '').trim(),
          ]
            .filter(Boolean)
            .slice(0, 3);
        })();
        const storyBadges = buildStoryBadges(product);
        if (product.minPrice && product.maxPrice && product.minPrice !== product.maxPrice) {
          displayPrice = `${product.minPrice} - ${product.maxPrice}`;
          displayPriceInteger = displayPrice;
          displayPriceFraction = '';
        } else {
          displayPrice = product.minPrice || (skus[0]?.price) || '0.00';
          const priceText = String(displayPrice);
          const [integerPart = '0', fractionPart = ''] = priceText.split('.');
          displayPriceInteger = integerPart;
          displayPriceFraction = fractionPart;
        }

        const displayOriginalPrice = (() => {
          const originalPrice = (product as AppProductDetail & { originalPrice?: string }).originalPrice;
          return originalPrice && originalPrice !== displayPrice ? originalPrice : '';
        })();

        this.setData({
          product: {
            ...product,
            skus,
            images: galleryImages,
            videos: galleryVideos,
            detailIsHtml: looksLikeHtml(product.detailDesc),
            detailHtml: normalizeDetailHtml(product.detailDesc),
          },
          mediaList: mediaList.length ? mediaList : [{ kind: 'image', src: product.coverUrl || galleryImages[0] || '' }],
          currentMediaUrl: resolveMediaPreviewUrl(mediaList[0] || { kind: 'image', src: product.coverUrl || galleryImages[0] || '' }),
          totalStock,
          displayPrice,
          displayPriceInteger,
          displayPriceFraction,
          displayOriginalPrice,
          displaySalesText: formatSalesCount(salesCount),
          selectedSku: skus[0] || null,
          heroImageUrl: normalizeImageUrl(product.coverUrl) || galleryImages[0] || '',
          selectedSkuSpecSummary: skus[0]?.specSummary || '',
          traceQrUrl,
          bannerIndex: 0,
          bannerTotal: Math.max(mediaList.length, 1),
          coreTags,
          storyBadges,
        });
        recordBrowseHistory(product);
      } catch {
        if (!silent) {
          wx.showToast({ title: '加载失败，请重试', icon: 'none' });
        }
      } finally {
        if (!silent) {
          wx.hideLoading();
        }
      }
    },
    async syncCartCount() {
      try {
        const count = await fetchCartItemCount();
        this.setData({
          cartCount: count,
        });
      } catch {
        this.setData({
          cartCount: 0,
        });
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    navToHome() {
      wx.reLaunch({
        url: '/pages/index/index',
      });
    },
    navToCategory() {
      wx.reLaunch({
        url: '/pages/category/category',
      });
    },
    openSearch() {
      wx.navigateTo({
        url: '/pages/search/search',
      });
    },
    shareProduct() {
      const title = this.data.product?.title || '商品详情';
      const subtitle = this.data.product?.subtitle || '';
      wx.setClipboardData({
        data: `${title}${subtitle ? ` - ${subtitle}` : ''}`,
        success: () => {
          wx.showToast({ title: '已复制商品标题', icon: 'success' });
        },
      });
    },
    openStoreInfo() {
      const merchant = this.data.product?.merchant;
      const merchantId = Number(this.data.product?.merchant?.id || this.data.product?.merchantId || 0);
      if (!merchant || !merchantId) {
        wx.showToast({ title: '暂无店铺信息', icon: 'none' });
        return;
      }

      wx.navigateTo({
        url: `/pages/merchant-public/detail/index?merchantId=${merchantId}`,
      });
    },
    navToCart() {
      wx.reLaunch({
        url: '/pages/cart/cart',
      });
    },
    contactMerchant() {
      if (!this.ensureAccess()) {
        return;
      }

      const merchant = this.data.product?.merchant;
      wx.navigateTo({
        url: `/pages/chat/chat?sceneType=OFFICIAL&productId=${encodeURIComponent(String(this.data.product?.id || ''))}&sceneLabel=${encodeURIComponent('来自商品详情')}&sceneSource=${encodeURIComponent(this.data.product?.title || merchant?.storeName || '商品咨询')}`,
      });
    },
    ensureAccess() {
      if (getAuthTokenType() === 'access') {
        return true;
      }

      const pages = getCurrentPages();
      const current = pages[pages.length - 1];
      const route = current ? `/${current.route}` : '/pages/index/index';

      wx.navigateTo({
        url: buildProfileLoginUrl(route),
      });
      return false;
    },
    async toggleFavorite() {
      if (!this.ensureAccess()) {
        return;
      }

      const product = this.data.product;
      const isFavorite = product.isFavorite;

      try {
        if (isFavorite) {
          await removeFavorite(product.id);
          wx.showToast({ title: '已取消收藏', icon: 'success' });
        } else {
          await addFavorite(product.id);
          wx.showToast({ title: '收藏成功', icon: 'success' });
        }

        this.setData({
          product: {
            ...product,
            isFavorite: !isFavorite,
          },
        });
      } catch {
        wx.showToast({ title: '操作失败', icon: 'none' });
      }
    },
    viewTraceUrl() {
      const traceInfo = this.data.product.traceInfo;
      if (!traceInfo) {
        return;
      }

      wx.navigateTo({
        url: `/pages/trace/detail/detail?traceCode=${encodeURIComponent(traceInfo.traceCode)}`,
      });
    },
    playStoryVideo() {
      const video = this.data.product?.videos?.[0];
      if (!video?.videoUrl) {
        wx.showToast({ title: '暂无可播放视频', icon: 'none' });
        return;
      }

      const previewMedia = (wx as any).previewMedia;
      if (typeof previewMedia === 'function') {
        previewMedia({
          sources: [
            {
              url: video.videoUrl,
              type: 'video',
              poster: video.coverUrl || this.data.heroImageUrl || this.data.product.coverUrl || '',
            },
          ],
          current: 0,
        });
        return;
      }

      wx.showToast({ title: '当前版本暂不支持预览视频', icon: 'none' });
    },
    scanTraceCode() {
      wx.scanCode({
        onlyFromCamera: false,
        success: (res) => {
          const traceCode = extractTraceCode(res.path || res.result);
          if (!traceCode) {
            wx.showToast({ title: '未识别到溯源码', icon: 'none' });
            return;
          }

          wx.navigateTo({
            url: `/pages/trace/detail/detail?traceCode=${encodeURIComponent(traceCode)}`,
          });
        },
        fail: () => {
          wx.showToast({ title: '扫码已取消', icon: 'none' });
        },
      });
    },
    openSkuDrawerForCart() {
      this.setData({
        activeSheet: 'sku',
        sheetAction: 'cart',
        purchaseQty: 1,
      });
    },
    openSkuDrawerForBuy() {
      this.setData({
        activeSheet: 'sku',
        sheetAction: 'buy',
        purchaseQty: 1,
      });
    },
    openGroupBuyZone() {
      const { product } = this.data;
      if (!product?.id) {
        return;
      }
      wx.navigateTo({
        url: `/pages/quick/group-buy/index?title=${encodeURIComponent(product.title || '拼团专区')}&productId=${product.id}`,
      });
    },
    openGroupBuyQuick() {
      const product = this.data.product;
      if (!product?.id) return;
      const skus = product.skus || [];
      const singleSku = skus.length === 1 ? skus[0] : null;
      if (singleSku) {
        this.createGroupBuyAndCheckout(singleSku);
        return;
      }
      this.setData({ sheetAction: 'groupBuy', activeSheet: 'sku' });
    },
    async createGroupBuyAndCheckout(skuInfo: { id: number }) {
      if (!this.ensureAccess()) return;
      const product = this.data.product;
      if (!product) return;
      const groupBuyId = Number((product as any).groupBuyId || 0);
      wx.showLoading({ title: '发起拼团…' });
      try {
        const res = await joinGroupBuy({
          productId: product.id,
          skuId: skuInfo.id,
          ...(groupBuyId > 0 ? { groupId: groupBuyId } : {}),
        });
        if (res.alreadyJoined) {
          wx.hideLoading();
          await navigateToJoinedGroupProgress({ groupId: res.groupId || groupBuyId, orderNo: res.orderNo });
          return;
        }
        const gbId = Number((res as any).groupId || (res as any).groupBuyId || groupBuyId);
        wx.hideLoading();
        wx.navigateTo({
          url: buildGroupBuyCheckoutUrl({
            productId: product.id,
            skuId: skuInfo.id,
            groupId: gbId,
          }),
        });
      } catch (err: any) {
        wx.hideLoading();
        if (isAlreadyJoinedGroupError(err)) {
          await navigateToJoinedGroupProgress({ groupId: groupBuyId > 0 ? groupBuyId : undefined });
          return;
        }
        wx.showToast({ title: err?.message || '拼团发起失败', icon: 'none' });
      }
    },
    closeSheet() {
      this.setData({
        activeSheet: '',
      });
    },
    preventBubble() {},
    preventTouchMove() {},
    selectSku(e: WechatMiniprogram.BaseEvent) {
      const { index } = (e.currentTarget.dataset as { index?: number }) || {};
      if (index === undefined) {
        return;
      }

      const sku = this.data.product.skus[index];
      this.setData({
        selectedSku: sku,
        heroImageUrl: normalizeImageUrl(sku.imageUrl) || normalizeImageUrl(this.data.product.coverUrl) || this.data.product.images[0] || '',
        selectedSkuSpecSummary: sku.specSummary || '',
      });
    },
    increaseQty() {
      const selectedSku = this.data.selectedSku;
      const limit = selectedSku ? selectedSku.stock : this.data.totalStock;

      if (this.data.purchaseQty >= limit) {
        wx.showToast({ title: '超出最大库存', icon: 'none' });
        return;
      }

      this.setData({
        purchaseQty: this.data.purchaseQty + 1,
      });
    },
    decreaseQty() {
      if (this.data.purchaseQty <= 1) {
        return;
      }

      this.setData({
        purchaseQty: this.data.purchaseQty - 1,
      });
    },
    async confirmSheetAction() {
      const selectedSku = this.data.selectedSku;
      if (!selectedSku) {
        wx.showToast({ title: '请先选择规格', icon: 'none' });
        return;
      }

      if (selectedSku.stock <= 0) {
        wx.showToast({ title: '该规格库存不足', icon: 'none' });
        return;
      }

      if (this.data.sheetAction === 'groupBuy') {
        this.setData({ activeSheet: '' });
        this.createGroupBuyAndCheckout(selectedSku);
      } else if (this.data.sheetAction === 'cart') {
        // Add to Cart
        wx.showLoading({ title: '正在加入购物车…' });
        try {
          const result = await addToCart(selectedSku.id, this.data.purchaseQty);
          wx.showToast({ title: '已加入购物车', icon: 'success' });
          this.setData({
            cartCount: result.cartCount,
            activeSheet: '',
          });
        } catch {
          wx.showToast({ title: '加入购物车失败', icon: 'none' });
        }
      } else {
        // Buy Now (adds to cart first, then redirects to Checkout)
        if (!this.ensureAccess()) {
          return;
        }

        wx.showLoading({ title: '正在提交商品…' });

        try {
          const result = await addToCart(selectedSku.id, this.data.purchaseQty);
          this.setData({
            activeSheet: '',
          });

          wx.navigateTo({
            url: `/pages/checkout/checkout?cartIds=${result.cartId}`,
          });
        } catch {
          wx.showToast({ title: '提交订单失败，请重试', icon: 'none' });
        } finally {
          wx.hideLoading();
        }
      }
    },
    onBannerChange(e: WechatMiniprogram.BaseEvent & { detail?: { current?: number } }) {
      const detail = (e.detail || {}) as { current?: number };
      const current = Number(detail.current || 0);
      const nextMedia = this.data.mediaList[current] || this.data.mediaList[0];
      this.setData({
        bannerIndex: Number.isFinite(current) && current >= 0 ? current : 0,
        currentMediaUrl: resolveMediaPreviewUrl(nextMedia),
      });
    },
    onPageScroll(e: WechatMiniprogram.CustomEvent) {
      void e;
    },
  },
});
