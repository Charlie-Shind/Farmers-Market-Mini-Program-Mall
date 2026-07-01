
Page({
  data: {
    activeSheet: '',
    activityType: 'seckill',
    toastText: ''
  },
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.navigateTo({ url: '/pages/merchant-design/dashboard/dashboard' });
  },
  handleToast(e) { this.showToast(e.currentTarget.dataset.toast || '已操作'); },
  showToast(text) {
    this.setData({ toastText: text || '已操作' });
    clearTimeout(this.__toastTimer);
    this.__toastTimer = setTimeout(() => this.setData({ toastText: '' }), 1400);
  },
  openSheet(e) { const id = e.currentTarget.dataset.openSheet; if (id) this.setData({ activeSheet: id }); },
  closeSheet() { this.setData({ activeSheet: '' }); },
  chooseActivityType(e) { const type = e.currentTarget.dataset.activityTypeValue; if (type) this.setData({ activityType: type }); },
  toggleSwitch() { this.showToast('已切换'); },
  handleToggleMock() { this.showToast('已选择'); },
  handleDeleteMock() { this.showToast('已删除'); },
  handleStepMock() { this.showToast('已调整'); },
  makePhoneCall(e) { const phone = e.currentTarget.dataset.phone; if (phone) wx.makePhoneCall({ phoneNumber: phone }); },
  noop() {}
});
