"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
function formatDateTime(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function getToneClass(type) {
    if (type === 'ORDER') {
        return 'order';
    }
    if (type === 'ACTIVITY') {
        return 'activity';
    }
    if (type === 'NOTICE') {
        return 'notice';
    }
    return 'system';
}
Component({
    data: {
        loading: true,
        message: null,
        blocks: [],
        linkUrl: '',
        linkLabel: '',
        toneClass: 'system',
        publishTimeText: '',
        pageStyle: '',
        icons: icons_1.iconPaths,
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(0),
            });
        },
    },
    methods: {
        onLoad(options) {
            var _a;
            const receiptId = Number((_a = options === null || options === void 0 ? void 0 : options.receiptId) !== null && _a !== void 0 ? _a : 0);
            if (!(0, auth_route_1.ensureCustomerAccess)(`/pages/message/detail/detail?receiptId=${receiptId}`)) {
                return;
            }
            void this.loadDetail(receiptId);
        },
        async loadDetail(receiptId) {
            var _a;
            if (!receiptId) {
                wx.showToast({
                    title: '公告不存在',
                    icon: 'none',
                });
                setTimeout(() => {
                    (0, auth_route_1.navigateBackOrHome)();
                }, 1500);
                return;
            }
            this.setData({
                loading: true,
            });
            try {
                const detail = await (0, app_1.fetchMessageDetail)(receiptId);
                const contentJson = detail.contentJson || null;
                const blocks = ((_a = contentJson === null || contentJson === void 0 ? void 0 : contentJson.blocks) === null || _a === void 0 ? void 0 : _a.length)
                    ? contentJson.blocks
                    : [
                        {
                            type: 'text',
                            value: detail.summary || detail.title,
                        },
                    ];
                const link = contentJson === null || contentJson === void 0 ? void 0 : contentJson.link;
                this.setData({
                    message: {
                        ...detail,
                        isRead: true,
                    },
                    blocks,
                    linkUrl: (link === null || link === void 0 ? void 0 : link.url) || '',
                    linkLabel: (link === null || link === void 0 ? void 0 : link.label) || '查看关联内容',
                    toneClass: getToneClass(detail.type),
                    publishTimeText: formatDateTime(detail.publishAt),
                    loading: false,
                });
                if (!detail.isRead) {
                    void (0, app_1.markMessageRead)(receiptId).catch((err) => {
                        console.error('Failed to mark message as read:', err);
                    });
                }
            }
            catch {
                this.setData({
                    loading: false,
                });
                wx.showToast({
                    title: '公告加载失败',
                    icon: 'none',
                });
                setTimeout(() => {
                    (0, auth_route_1.navigateBackOrHome)();
                }, 1500);
            }
        },
        previewImage(e) {
            const { url } = e.currentTarget.dataset || {};
            if (!url) {
                return;
            }
            wx.previewImage({
                urls: [url],
                current: url,
            });
        },
        openLink() {
            const url = this.data.linkUrl;
            if (!url) {
                return;
            }
            if (url.startsWith('/pages/')) {
                wx.navigateTo({
                    url,
                });
                return;
            }
            wx.setClipboardData({
                data: url,
                success: () => {
                    wx.showToast({ title: '链接已复制到剪贴板', icon: 'success' });
                },
            });
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        getToneClass,
        formatDateTime,
    },
});
