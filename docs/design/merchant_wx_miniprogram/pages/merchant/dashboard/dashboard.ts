Page({
  data: {
  "slug": "dashboard",
  "title": "商家首页",
  "subtitle": "今日经营概览、待办与快捷入口",
  "mode": "dashboard",
  "showBack": false,
  "hasBottom": true,
  "pageClass": "has-bottom",
  "nav": [
    {
      "name": "首页",
      "icon": "/assets/icons/home.svg",
      "url": "/pages/merchant/dashboard/dashboard",
      "active": true
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
      "active": false
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
  "tabs": [],
  "filters": [],
  "stats": [
    {
      "label": "今日成交",
      "value": "¥12,860",
      "trend": "+18.6%"
    },
    {
      "label": "待发货",
      "value": "8",
      "trend": "需处理"
    },
    {
      "label": "在售商品",
      "value": "126",
      "trend": "4 个预警"
    },
    {
      "label": "访客数",
      "value": "2,418",
      "trend": "+9.2%"
    }
  ],
  "quickActions": [
    {
      "title": "发布商品",
      "desc": "新品上架",
      "icon": "/assets/icons/plus.svg",
      "url": "/pages/merchant/publish/publish"
    },
    {
      "title": "库存调整",
      "desc": "批量维护",
      "icon": "/assets/icons/box.svg",
      "url": "/pages/merchant/inventory/inventory"
    },
    {
      "title": "发布活动",
      "desc": "秒杀拼团",
      "icon": "/assets/icons/chart.svg",
      "url": "/pages/merchant/marketing-publish/marketing-publish"
    },
    {
      "title": "物流发货",
      "desc": "录入单号",
      "icon": "/assets/icons/truck.svg",
      "url": "/pages/merchant/logistics/logistics"
    },
    {
      "title": "财务提现",
      "desc": "余额结算",
      "icon": "/assets/icons/wallet.svg",
      "url": "/pages/merchant/finance/finance"
    },
    {
      "title": "评价管理",
      "desc": "回复买家",
      "icon": "/assets/icons/star.svg",
      "url": "/pages/merchant/review/review"
    }
  ],
  "listItems": [
    {
      "title": "洛川红富士苹果 5斤装",
      "desc": "买家：陈女士 · 订单号 WY20260619001",
      "img": "/assets/goods/g1.svg",
      "price": "¥39.90",
      "status": "待发货",
      "tag": "urgent"
    },
    {
      "title": "云南蓝莓礼盒 12盒",
      "desc": "买家：张先生 · 订单号 WY20260619002",
      "img": "/assets/goods/g2.svg",
      "price": "¥89.00",
      "status": "配送中",
      "tag": "info"
    },
    {
      "title": "赣南脐橙家庭装",
      "desc": "买家：李女士 · 订单号 WY20260619003",
      "img": "/assets/goods/g3.svg",
      "price": "¥46.80",
      "status": "待售后",
      "tag": "danger"
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
  "hero": {
    "title": "湾源农仓 · 商家端",
    "desc": "保持原 HTML 设计稿风格，改为微信小程序原生结构。",
    "img": "/assets/illustrations/store.svg"
  },
  "stickyActions": [],
  "cards": [
    {
      "title": "618 果蔬秒杀专场",
      "desc": "限时秒杀 · 20:00 开始 · 已选 12 件商品",
      "img": "/assets/illustrations/activity.svg",
      "price": "成交 ¥12,860",
      "status": "进行中",
      "percent": "72%"
    },
    {
      "title": "蓝莓拼团活动",
      "desc": "3人成团 · 24小时成团 · 成团率 64%",
      "img": "/assets/goods/g2.svg",
      "price": "成交 ¥6,420",
      "status": "预热中",
      "percent": "46%"
    }
  ],
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
