import { iconPaths } from '../../../config/icons';
import { upload } from '../../../services/request';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { buildLoginUrl, navigateBackOrHome } from '../../../utils/auth-route';
import { getAuthTokenType } from '../../../services/token';
import { fetchMyPickupPoint, saveMyPickupPoint } from '../../../services/leader';

Component({
  data: {
    loading: false,
    loadingText: '加载中...',
    pageStyle: '',
    icons: iconPaths,
    isEdit: false,
    submitting: false,
    regionValue: [] as string[],
    locationLabel: '可选，便于用户导航到店',
    form: {
      storeName: '',
      province: '',
      city: '',
      district: '',
      detailAddress: '',
      latitude: 0,
      longitude: 0,
      storePhoto: '',
      businessHours: '',
      description: '',
    },
    toastVisible: false,
    toastMessage: '',
    toastType: 'info' as 'info' | 'success' | 'warning' | 'danger',
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
      if (!this.ensureAccess()) {
        return;
      }
      this.loadPickupPoint();
    },
  },
  methods: {
    ensureAccess() {
      if (getAuthTokenType() === 'access') {
        return true;
      }
      wx.navigateTo({
        url: buildLoginUrl('/pages/leader/pickup-edit/pickup-edit'),
      });
      return false;
    },
    async loadPickupPoint() {
      this.setData({ loading: true, loadingText: '加载自提点信息' });
      try {
        const point = await fetchMyPickupPoint();
        if (!point) {
          this.setData({ loading: false, isEdit: false });
          return;
        }

        const regionValue = [point.province, point.city, point.district].filter(Boolean) as string[];
        this.setData({
          isEdit: true,
          regionValue,
          locationLabel: point.latitude && point.longitude ? '已设置地图坐标' : '可选，便于用户导航到店',
          form: {
            storeName: point.storeName || '',
            province: point.province || '',
            city: point.city || '',
            district: point.district || '',
            detailAddress: point.detailAddress || '',
            latitude: point.latitude || 0,
            longitude: point.longitude || 0,
            storePhoto: point.storePhoto || '',
            businessHours: point.businessHours || '',
            description: point.description || '',
          },
          loading: false,
        });
      } catch (e: any) {
        wx.showToast({ title: e.message || '加载失败', icon: 'none' });
        this.setData({ loading: false });
      }
    },
    onInput(e: WechatMiniprogram.Input) {
      const field = String(e.currentTarget.dataset.field || '');
      if (!field) return;
      this.setData({
        [`form.${field}`]: e.detail.value,
      });
    },
    onRegionChange(e: WechatMiniprogram.RegionPickerChange) {
      const value = e.detail.value as string[];
      this.setData({
        regionValue: value,
        'form.province': value[0] || '',
        'form.city': value[1] || '',
        'form.district': value[2] || '',
      });
    },
    chooseLocation() {
      wx.chooseLocation({
        success: (res) => {
          const updates: Record<string, unknown> = {
            locationLabel: res.name || res.address || '已选择位置',
            'form.latitude': res.latitude,
            'form.longitude': res.longitude,
          };
          if (res.name && !this.data.form.storeName) {
            updates['form.storeName'] = res.name;
          }
          if (res.address && !this.data.form.detailAddress) {
            updates['form.detailAddress'] = res.address;
          }
          this.setData(updates);
        },
      });
    },
    choosePhoto() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const file = res.tempFiles[0];
          if (file) {
            this.uploadPhoto(file.tempFilePath);
          }
        },
      });
    },
    async uploadPhoto(filePath: string) {
      this.setData({ loading: true, loadingText: '上传照片中...' });
      try {
        const uploaded = await upload<{ url?: string }>({
          url: '/files/upload',
          filePath,
          name: 'file',
          auth: false,
        });
        if (!uploaded?.url) {
          throw new Error('上传失败');
        }
        this.setData({
          'form.storePhoto': uploaded.url,
        });
        this.showToast('照片上传成功', 'success');
      } catch {
        this.showToast('照片上传失败', 'danger');
      } finally {
        this.setData({ loading: false });
      }
    },
    async submitForm() {
      const form = this.data.form;
      if (!form.storeName.trim()) {
        this.showToast('请填写自提点名称', 'warning');
        return;
      }
      if (!form.province || !form.city) {
        this.showToast('请选择所在地区', 'warning');
        return;
      }
      if (!form.detailAddress.trim()) {
        this.showToast('请填写详细地址', 'warning');
        return;
      }

      this.setData({ submitting: true });
      try {
        const saved = await saveMyPickupPoint({
          storeName: form.storeName.trim(),
          province: form.province,
          city: form.city,
          district: form.district,
          detailAddress: form.detailAddress.trim(),
          latitude: form.latitude || undefined,
          longitude: form.longitude || undefined,
          storePhoto: form.storePhoto || undefined,
          businessHours: form.businessHours.trim() || undefined,
          description: form.description.trim() || undefined,
        });

        this.showToast('保存成功', 'success');
        setTimeout(() => {
          if (saved?.id) {
            wx.redirectTo({
              url: `/pages/leader/pickup-detail/pickup-detail?id=${saved.id}&from=leader`,
            });
          } else {
            navigateBackOrHome();
          }
        }, 600);
      } catch (e: any) {
        this.showToast(e.message || '保存失败', 'danger');
      } finally {
        this.setData({ submitting: false });
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    showToast(message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') {
      this.setData({
        toastMessage: message,
        toastType: type,
        toastVisible: true,
      });
    },
    hideToast() {
      this.setData({ toastVisible: false });
    },
  },
});
