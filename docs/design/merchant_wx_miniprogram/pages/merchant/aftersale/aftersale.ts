Page({
  data: {
  "slug": "aftersale",
  "title": "售后管理",
  "subtitle": "处理退款、退货、换货和仲裁售后",
  "mode": "list",
  "showBack": true,
  "hasBottom": false,
  "pageClass": "no-bottom",
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
      "name": "待处理",
      "active": false
    },
    {
      "name": "处理中",
      "active": false
    },
    {
      "name": "已完成",
      "active": false
    }
  ],
  "filters": [
    {
      "name": "综合排序",
      "active": true
    },
    {
      "name": "今日",
      "active": false
    },
    {
      "name": "近7天",
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
      "title": "筛选",
      "desc": "按状态/时间",
      "icon": "/assets/icons/filter.svg",
      "url": ""
    },
    {
      "title": "导出",
      "desc": "生成明细",
      "icon": "/assets/icons/bill.svg",
      "url": ""
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
