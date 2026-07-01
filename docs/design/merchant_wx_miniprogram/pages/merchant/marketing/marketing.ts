Page({
  data: {
  "slug": "marketing",
  "title": "营销活动",
  "subtitle": "管理秒杀、拼团、优惠券和预售活动",
  "mode": "activityList",
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
      "active": false
    },
    {
      "name": "营销",
      "icon": "/assets/icons/chart.svg",
      "url": "/pages/merchant/marketing/marketing",
      "active": true
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
      "name": "秒杀",
      "active": false
    },
    {
      "name": "拼团",
      "active": false
    },
    {
      "name": "优惠券",
      "active": false
    },
    {
      "name": "预售",
      "active": false
    }
  ],
  "filters": [
    {
      "name": "进行中",
      "active": true
    },
    {
      "name": "预热中",
      "active": false
    },
    {
      "name": "草稿",
      "active": false
    },
    {
      "name": "已结束",
      "active": false
    }
  ],
  "stats": [],
  "quickActions": [
    {
      "title": "发布活动",
      "desc": "新增营销活动",
      "icon": "/assets/icons/plus.svg",
      "url": "/pages/merchant/marketing-publish/marketing-publish"
    },
    {
      "title": "活动草稿",
      "desc": "继续编辑",
      "icon": "/assets/icons/edit.svg",
      "url": "/pages/merchant/marketing-drafts/marketing-drafts"
    }
  ],
  "listItems": [
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
    },
    {
      "title": "礼盒满减优惠券",
      "desc": "满 99 减 15 · 总库存 500 张",
      "img": "/assets/illustrations/finance.svg",
      "price": "核销 184 张",
      "status": "草稿",
      "percent": "31%"
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
