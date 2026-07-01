"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
Component({
    data: {
        addresses: [],
        icons: icons_1.iconPaths,
        pageStyle: '',
        mode: '', // 'select' or ''
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
            void this.loadAddresses(true);
        },
    },
    methods: {
        async bootstrapPage() {
            await new Promise((resolve) => setTimeout(resolve, 0));
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            const options = (current === null || current === void 0 ? void 0 : current.options) || {};
            this.setData({
                mode: options.mode || '',
            });
        },
        async loadAddresses(silent = false) {
            if (!silent) {
                wx.showLoading({ title: '加载中…' });
            }
            try {
                const addresses = await (0, app_1.fetchAddresses)();
                this.setData({
                    addresses: addresses || [],
                });
            }
            catch {
                if (!silent) {
                    wx.showToast({ title: '获取地址列表失败', icon: 'none' });
                }
            }
            finally {
                if (!silent) {
                    wx.hideLoading();
                }
            }
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        handleAddressTap(e) {
            const { index } = e.currentTarget.dataset || {};
            if (index === undefined) {
                return;
            }
            const address = this.data.addresses[index];
            if (!address) {
                return;
            }
            if (this.data.mode === 'select') {
                // Return address to Checkout
                try {
                    const eventChannel = this.getOpenerEventChannel();
                    if (eventChannel && typeof eventChannel.emit === 'function') {
                        eventChannel.emit('selectAddress', address);
                    }
                }
                catch {
                    // Ignore event channel errors
                }
                // Set global variable as backup
                try {
                    const app = getApp();
                    if (app) {
                        app.globalData = app.globalData || {};
                        app.globalData.selectedAddress = address;
                    }
                }
                catch {
                    // Ignore global variable errors
                }
                wx.navigateBack();
                return;
            }
            // Default to edit address
            this.navToEditDetails(address.id);
        },
        navToEdit(e) {
            const { id } = e.currentTarget.dataset || {};
            if (id === undefined) {
                return;
            }
            this.navToEditDetails(Number(id));
        },
        navToEditDetails(addressId) {
            wx.navigateTo({
                url: `/pages/address/edit/edit?addressId=${addressId}`,
            });
        },
        navToCreate() {
            wx.navigateTo({
                url: '/pages/address/edit/edit',
            });
        },
    },
});
