import { iconPaths } from '../../../config/icons';

Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
      observer(newVal) {
        if (newVal) {
          this.initData();
        }
      },
    },
    product: {
      type: Object,
      value: null as any,
      observer(newVal) {
        if (newVal) {
          this.initData();
        }
      },
    },
  },
  data: {
    selectedSku: null as any,
    heroImageUrl: '',
    selectedSkuSpecSummary: '',
    purchaseQty: 1,
    totalStock: 0,
    icons: iconPaths,
  },
  methods: {
    initData() {
      const { product } = this.properties;
      if (!product) {
        return;
      }

      const skus = product.skus || [];
      const defaultSku = skus[0] || null;
      let totalStock = 0;
      skus.forEach((s: any) => {
        totalStock += s.stock || 0;
      });

      this.setData({
        selectedSku: defaultSku,
        heroImageUrl: defaultSku?.imageUrl || product.coverUrl || (product.images && product.images[0]) || '',
        selectedSkuSpecSummary: defaultSku?.specSummary || '',
        purchaseQty: 1,
        totalStock,
      });
    },
    onSelectSku(e: WechatMiniprogram.BaseEvent) {
      const { index } = (e.currentTarget.dataset as { index?: number }) || {};
      if (index == null) return;
      const { product } = this.properties;
      const sku = product.skus[index];
      if (sku) {
        this.setData({
          selectedSku: sku,
          heroImageUrl: sku.imageUrl || product.coverUrl || (product.images && product.images[0]) || '',
          selectedSkuSpecSummary: sku.specSummary || '',
        });
      }
    },
    onDecreaseQty() {
      const nextQty = Math.max(1, this.data.purchaseQty - 1);
      this.setData({ purchaseQty: nextQty });
    },
    onIncreaseQty() {
      const stock = this.data.selectedSku ? this.data.selectedSku.stock : this.data.totalStock;
      if (this.data.purchaseQty >= stock) {
        wx.showToast({ title: '已达到最大库存', icon: 'none' });
        return;
      }
      this.setData({ purchaseQty: this.data.purchaseQty + 1 });
    },
    onClose() {
      this.triggerEvent('close');
    },
    onConfirm() {
      const { selectedSku, purchaseQty } = this.data;
      if (!selectedSku) {
        wx.showToast({ title: '请选择规格', icon: 'none' });
        return;
      }
      this.triggerEvent('confirm', {
        sku: selectedSku,
        qty: purchaseQty,
      });
    },
    preventBubble() {
      // Prevents event bubbling to catchtap mask close trigger
    },
    preventTouchMove() {
      // Prevents background page scrolling
    },
  },
});
