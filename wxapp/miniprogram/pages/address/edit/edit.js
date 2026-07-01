"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
Component({
    data: {
        addressId: 0,
        receiverName: '',
        receiverMobile: '',
        province: '',
        city: '',
        district: '',
        detailAddress: '',
        isDefault: false,
        regionValue: [],
        icons: icons_1.iconPaths,
        pageStyle: '',
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
        },
    },
    pageLifetimes: {
        show() {
            void this.bootstrapPage();
        },
    },
    methods: {
        async bootstrapPage() {
            await new Promise((resolve) => setTimeout(resolve, 0));
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            const options = (current === null || current === void 0 ? void 0 : current.options) || {};
            const addressId = options.addressId ? Number(options.addressId) : 0;
            if (addressId > 0 && addressId !== this.data.addressId) {
                this.setData({
                    addressId,
                });
                await this.loadAddressDetails(addressId);
                return;
            }
            if (addressId <= 0 && this.data.addressId !== 0) {
                this.setData({
                    addressId: 0,
                    receiverName: '',
                    receiverMobile: '',
                    province: '',
                    city: '',
                    district: '',
                    detailAddress: '',
                    isDefault: false,
                    regionValue: [],
                });
            }
        },
        async loadAddressDetails(addressId) {
            wx.showLoading({ title: '加载中…' });
            try {
                const list = await (0, app_1.fetchAddresses)();
                const address = list.find((item) => item.id === addressId);
                if (!address) {
                    wx.showToast({ title: '地址不存在或已被删除', icon: 'none' });
                    setTimeout(() => this.goBack(), 1500);
                    return;
                }
                this.setData({
                    receiverName: address.receiverName,
                    receiverMobile: address.receiverMobile,
                    province: address.province,
                    city: address.city,
                    district: address.district,
                    detailAddress: address.detailAddress,
                    isDefault: address.isDefault,
                    regionValue: [address.province, address.city, address.district],
                });
            }
            catch {
                wx.showToast({ title: '获取地址详情失败', icon: 'none' });
            }
            finally {
                wx.hideLoading();
            }
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        onNameInput(e) {
            var _a;
            this.setData({
                receiverName: String((_a = e.detail.value) !== null && _a !== void 0 ? _a : ''),
            });
        },
        onMobileInput(e) {
            var _a;
            this.setData({
                receiverMobile: String((_a = e.detail.value) !== null && _a !== void 0 ? _a : ''),
            });
        },
        onRegionChange(e) {
            var _a;
            const value = ((_a = e.detail) === null || _a === void 0 ? void 0 : _a.value) || [];
            this.setData({
                province: value[0] || '',
                city: value[1] || '',
                district: value[2] || '',
                regionValue: value,
            });
        },
        onDetailInput(e) {
            var _a;
            this.setData({
                detailAddress: String((_a = e.detail.value) !== null && _a !== void 0 ? _a : ''),
            });
        },
        onDefaultChange(e) {
            var _a;
            this.setData({
                isDefault: ((_a = e.detail) === null || _a === void 0 ? void 0 : _a.value) === true,
            });
        },
        async submitSave() {
            const name = this.data.receiverName.trim();
            const mobile = this.data.receiverMobile.trim();
            const { province, city, district } = this.data;
            const detail = this.data.detailAddress.trim();
            if (!name) {
                wx.showToast({ title: '请输入收货人姓名', icon: 'none' });
                return;
            }
            if (!mobile) {
                wx.showToast({ title: '请输入手机号', icon: 'none' });
                return;
            }
            // Basic mobile phone validation
            if (!/^\d{11}$/.test(mobile)) {
                wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' });
                return;
            }
            if (!province || !city || !district) {
                wx.showToast({ title: '请选择所在地区', icon: 'none' });
                return;
            }
            if (!detail) {
                wx.showToast({ title: '请填写详细地址', icon: 'none' });
                return;
            }
            const payload = {
                receiverName: name,
                receiverMobile: mobile,
                province,
                city,
                district,
                detailAddress: detail,
                isDefault: this.data.isDefault,
            };
            wx.showLoading({ title: '正在保存…' });
            try {
                if (this.data.addressId > 0) {
                    await (0, app_1.updateAddress)(this.data.addressId, payload);
                    wx.showToast({ title: '保存成功', icon: 'success' });
                }
                else {
                    await (0, app_1.createAddress)(payload);
                    wx.showToast({ title: '添加成功', icon: 'success' });
                }
                setTimeout(() => {
                    wx.navigateBack();
                }, 1200);
            }
            catch (err) {
                wx.showToast({ title: err.message || '保存失败，请稍后重试', icon: 'none' });
            }
            finally {
                wx.hideLoading();
            }
        },
        submitDelete() {
            wx.showModal({
                title: '提示',
                content: '确定要删除这个收货地址吗？',
                cancelText: '取消',
                confirmText: '删除',
                confirmColor: '#e54938',
                success: async (res) => {
                    if (res.confirm) {
                        wx.showLoading({ title: '正在删除…' });
                        try {
                            await (0, app_1.deleteAddress)(this.data.addressId);
                            wx.showToast({ title: '删除成功', icon: 'success' });
                            setTimeout(() => {
                                wx.navigateBack();
                            }, 1200);
                        }
                        catch {
                            wx.showToast({ title: '删除失败，请重试', icon: 'none' });
                        }
                        finally {
                            wx.hideLoading();
                        }
                    }
                },
            });
        },
    },
});
