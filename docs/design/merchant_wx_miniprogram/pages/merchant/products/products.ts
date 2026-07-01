Page({
  data: {
  "slug": "products",
  "title": "库存商品",
  "subtitle": "管理在售商品、库存预警和上下架状态",
  "mode": "productList",
  "showBack": false,
  "hasBottom": true,
  "pageClass": "has-bottom",
  "nav": [
    {
      "name": "首页",
      "icon": "/assets/icons/home.svg",
      "url": "/pages/merchant/dashboard/dashboard",
      "active": false
    },
    {
      "name": "订单",
      "icon": "/assets/icons/order.svg",
      "url": "/pages/merchant/orders/orders",
      "active": false
    },
    {
      "name": "商品",
      "icon": "/assets/icons/box.svg",
      "url": "/pages/merchant/products/products",
      "active": true
    },
    {
      "name": "营销",
      "icon": "/assets/icons/chart.svg",
      "url": "/pages/merchant/marketing/marketing",
      "active": false
    },
    {
      "name": "账号",
      "icon": "/assets/icons/user.svg",
      "url": "/pages/merchant/shop/shop",
      "active": false
    }
  ],
  "tabs": [
    {
      "name": "全部",
      "active": true
    },
    {
      "name": "在售",
      "active": false
    },
    {
      "name": "售罄",
      "active": false
    },
    {
      "name": "草稿",
      "active": false
    }
  ],
  "filters": [
    {
      "name": "库存预警",
      "active": false
    },
    {
      "name": "价格排序",
      "active": false
    },
    {
      "name": "分类",
      "active": false
    },
    {
      "name": "筛选",
      "active": false
    }
  ],
  "stats": [],
  "quickActions": [
    {
      "title": "发布商品",
      "desc": "新增商品",
      "icon": "/assets/icons/plus.svg",
      "url": "/pages/merchant/publish/publish"
    },
    {
      "title": "草稿箱",
      "desc": "未发布商品",
      "icon": "/assets/icons/edit.svg",
      "url": "/pages/merchant/product-drafts/product-drafts"
    }
  ],
  "listItems": [
    {
      "title": "洛川红富士苹果 5斤装",
      "desc": "规格：75mm 果径 · 产地直发",
      "img": "/assets/goods/g1.svg",
      "price": "¥39.90",
      "stock": "库存 342",
      "status": "在售"
    },
    {
      "title": "云南蓝莓礼盒 12盒",
      "desc": "冷链发货 · 48小时内发出",
      "img": "/assets/goods/g2.svg",
      "price": "¥89.00",
      "stock": "库存 86",
      "status": "预警"
    },
    {
      "title": "赣南脐橙家庭装",
      "desc": "精选大果 · 果园现摘",
      "img": "/assets/goods/g3.svg",
      "price": "¥46.80",
      "stock": "库存 128",
      "status": "在售"
    },
    {
      "title": "东北长粒香大米 10斤",
      "desc": "新米现磨 · 真空包装",
      "img": "/assets/goods/g4.svg",
      "price": "¥59.90",
      "stock": "库存 74",
      "status": "在售"
    }
  ],
  "formFields": [],
  "gallery": [],
  "detailRows": [],
  "timeline": [],
  "chart": [],
  "categories": [],
  "skuList": [],
  "chatMessages": [],
  "shopRows": [],
  "hero": null,
  "stickyActions": [],
  "cards": [],
  "pickerOptions": [
    "快递配送",
    "同城配送",
    "到店自提",
    "平台默认"
  ],
  "dateValue": "2026-06-20",
  "timeValue": "20:00",
  "inputMessage": ""
},

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 })
      return
    }
    wx.navigateTo({ url: '/pages/merchant/dashboard/dashboard' })
  },

  goPage(e: any) {
    const url = e.currentTarget.dataset.url as string
    if (!url) {
      this.showToast()
      return
    }
    wx.navigateTo({ url })
  },

  goNotice() {
    wx.navigateTo({ url: '/pages/merchant/notice/notice' })
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/merchant/orders/orders' })
  },

  goMarketing() {
    wx.navigateTo({ url: '/pages/merchant/marketing/marketing' })
  },

  showSearch() {
    wx.showToast({ title: '搜索功能待接接口', icon: 'none' })
  },

  showToast() {
    wx.showToast({ title: '操作已记录', icon: 'none' })
  },

  openItem(e: any) {
    const mode = this.data.mode
    if (mode === 'productList') wx.navigateTo({ url: '/pages/merchant/product-edit/product-edit' })
    else if (mode === 'activityList') wx.navigateTo({ url: '/pages/merchant/marketing-detail/marketing-detail' })
    else if (mode === 'messageList') wx.navigateTo({ url: '/pages/merchant/chat-detail/chat-detail' })
    else if (mode === 'noticeList') wx.showToast({ title: '已打开通知', icon: 'none' })
    else wx.navigateTo({ url: '/pages/merchant/order-detail/order-detail' })
  },

  onTabTap(e: any) {
    const index = Number(e.currentTarget.dataset.index)
    const tabs = (this.data.tabs as any[]).map((item, idx) => ({ ...item, active: idx === index }))
    this.setData({ tabs })
  },

  onFilterTap(e: any) {
    const index = Number(e.currentTarget.dataset.index)
    const filters = (this.data.filters as any[]).map((item, idx) => ({ ...item, active: idx === index }))
    this.setData({ filters })
  },

  onTypeTap(e: any) {
    const index = Number(e.currentTarget.dataset.index)
    const categories = (this.data.categories as any[]).map((item, idx) => ({ ...item, active: idx === index }))
    this.setData({ categories })
  },

  onInput(e: any) {
    const index = Number(e.currentTarget.dataset.index)
    const formFields = [...(this.data.formFields as any[])]
    formFields[index] = { ...formFields[index], value: e.detail.value }
    this.setData({ formFields })
  },

  onPickerChange(e: any) {
    const index = Number(e.currentTarget.dataset.index)
    const valueIndex = Number(e.detail.value)
    const formFields = [...(this.data.formFields as any[])]
    formFields[index] = { ...formFields[index], value: (this.data.pickerOptions as string[])[valueIndex] }
    this.setData({ formFields })
  },

  onDateChange(e: any) {
    this.updateFieldValue(e)
  },

  onTimeChange(e: any) {
    this.updateFieldValue(e)
  },

  updateFieldValue(e: any) {
    const index = Number(e.currentTarget.dataset.index)
    const formFields = [...(this.data.formFields as any[])]
    formFields[index] = { ...formFields[index], value: e.detail.value }
    this.setData({ formFields })
  },

  chooseImage() {
    wx.showToast({ title: '这里接 wx.chooseMedia', icon: 'none' })
  },

  onActionTap() {
    wx.showToast({ title: '已保存，后续接接口', icon: 'success' })
  },

  onMessageInput(e: any) {
    this.setData({ inputMessage: e.detail.value })
  },

  sendMessage() {
    if (!this.data.inputMessage) return
    const chatMessages = [...(this.data.chatMessages as any[]), { text: this.data.inputMessage, me: true }]
    this.setData({ chatMessages, inputMessage: '' })
  }
})
