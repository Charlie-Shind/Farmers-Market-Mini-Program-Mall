import { buildPageTopStyle } from '../../../utils/page-layout';
import { upload } from '../../../services/request';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    slug: 'publish-images',
    gallery: [] as string[],
    uploading: false,
    selectedIndex: 0,
    imageRequirements: [
      { title: '主图清晰', desc: '建议 1:1 正方形，主体居中，避免文字过多', met: true },
      { title: '详情图补充', desc: '可展示产地、包装、规格、质检信息', met: false },
    ],
  },

  onLoad() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/publish/publish' });
  },

  chooseImage() {
    const remaining = 9 - (this.data.gallery as string[]).length;
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传 9 张', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadFiles(res.tempFiles);
      },
      fail: (err) => {
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({ title: '选择图片失败', icon: 'none' });
        }
      },
    });
  },

  async uploadFiles(files: WechatMiniprogram.ChooseMediaSuccessCallbackResult['tempFiles']) {
    this.setData({ uploading: true });
    const gallery = (this.data.gallery as string[]).slice();
    let uploaded = 0;

    for (const file of files) {
      try {
        const result: any = await upload({
          url: '/files/upload',
          filePath: file.tempFilePath,
          name: 'file',
        });
        if (result && (result.url || result.fileUrl)) {
          gallery.push(result.url || result.fileUrl);
        }
        uploaded++;
      } catch {
        wx.showToast({ title: `第 ${uploaded + 1} 张上传失败`, icon: 'none' });
      }
    }

    this.setData({ gallery, uploading: false });
    if (uploaded > 0) {
      wx.showToast({ title: `已上传 ${uploaded} 张`, icon: 'success' });
    }
  },

  onPhotoTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ selectedIndex: index });
  },

  deletePhoto(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    wx.showModal({
      title: '删除图片',
      content: '确定删除这张图片？（仅从列表移除，服务器文件需手动清理）',
      success: (res) => {
        if (res.confirm) {
          const gallery = (this.data.gallery as string[]).filter((_, idx) => idx !== index);
          this.setData({ gallery, selectedIndex: 0 });
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  },

  setAsMain() {
    const idx = this.data.selectedIndex;
    if (idx === 0) {
      wx.showToast({ title: '已是主图', icon: 'none' });
      return;
    }
    const gallery = (this.data.gallery as string[]).slice();
    const item = gallery.splice(idx, 1)[0];
    gallery.unshift(item);
    this.setData({ gallery, selectedIndex: 0 });
    wx.showToast({ title: '已设为主图', icon: 'success' });
  },

  saveImages() {
    // 将图片写回上一页
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage) {
      prevPage.setData({ gallery: this.data.gallery });
    }
    wx.showToast({ title: '图片已保存', icon: 'success' });
    setTimeout(() => {
      wx.navigateBack({ delta: 1 });
    }, 500);
  },
});
