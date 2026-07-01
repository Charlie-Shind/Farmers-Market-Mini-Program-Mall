"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_layout_1 = require("../../../utils/page-layout");
const app_1 = require("../../../services/app");
function getCategoryText(category) {
    return String((category === null || category === void 0 ? void 0 : category.name) || (category === null || category === void 0 ? void 0 : category.label) || (category === null || category === void 0 ? void 0 : category.title) || '').trim();
}
function joinCategoryName(parentName, childName) {
    return [parentName, childName].map((item) => String(item || '').trim()).filter(Boolean).join(' / ');
}
Page({
    data: {
        pageStyle: '',
        slug: 'publish-category',
        loading: true,
        selectedPrimary: 0,
        selectedSub: 0,
        primaryCategories: [],
        subCategories: [],
        selectedCategoryId: 0,
        selectedCategoryName: '',
    },
    onLoad() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
        this.loadCategories();
    },
    onShow() {
        this.setData({ pageStyle: (0, page_layout_1.buildPageTopStyle)(8) });
    },
    async loadCategories() {
        var _a;
        this.setData({ loading: true });
        try {
            const list = await (0, app_1.fetchCategories)();
            if (!list || !list.length) {
                this.setData({ loading: false });
                return;
            }
            const primaryCategories = list.map((cat, idx) => ({
                id: cat.id,
                name: getCategoryText(cat),
                active: idx === 0,
            }));
            const children = ((_a = list[0]) === null || _a === void 0 ? void 0 : _a.children) || [];
            const subCategories = children.map((child) => ({
                id: child.id,
                name: getCategoryText(child),
                desc: '',
                icon: 'package',
                active: false,
                recommended: false,
            }));
            this.setData({
                primaryCategories,
                subCategories,
                selectedCategoryId: 0,
                loading: false,
            });
        }
        catch (e) {
            wx.showToast({ title: e.message || '加载分类失败', icon: 'none' });
            this.setData({ loading: false });
        }
    },
    goBack() {
        if (getCurrentPages().length > 1) {
            wx.navigateBack({ delta: 1 });
            return;
        }
        wx.navigateTo({ url: '/pages/merchant/publish/publish' });
    },
    onPrimaryTap(e) {
        const index = Number(e.currentTarget.dataset.index);
        const primaryCategories = this.data.primaryCategories.map((item, idx) => ({
            ...item,
            active: idx === index,
        }));
        this.setData({ primaryCategories, selectedPrimary: index, selectedSub: 0, selectedCategoryId: 0 });
        // 重新加载原始数据获取该一级类目下的二级分类
        this.loadSubCategories(index);
    },
    async loadSubCategories(primaryIndex) {
        try {
            const list = await (0, app_1.fetchCategories)();
            if (!list || !list[primaryIndex])
                return;
            const children = list[primaryIndex].children || [];
            const subCategories = children.map((child) => ({
                id: child.id,
                name: getCategoryText(child),
                desc: '',
                icon: 'package',
                active: false,
                recommended: false,
            }));
            this.setData({ subCategories });
        }
        catch {
            // 静默失败，保留旧子分类
        }
    },
    onSubTap(e) {
        const index = Number(e.currentTarget.dataset.index);
        const subCategories = this.data.subCategories.map((item, idx) => ({
            ...item,
            active: idx === index,
        }));
        const selected = subCategories[index];
        this.setData({
            subCategories,
            selectedSub: index,
            selectedCategoryId: selected ? selected.id : 0,
            selectedCategoryName: selected ? selected.name : '',
        });
    },
    confirmCategory() {
        var _a;
        const selected = this.data.subCategories[this.data.selectedSub];
        if (!selected || !selected.id) {
            wx.showToast({ title: '请选择一个分类', icon: 'none' });
            return;
        }
        // 将选中的分类写回上一页
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage) {
            const primaryName = ((_a = this.data.primaryCategories[this.data.selectedPrimary]) === null || _a === void 0 ? void 0 : _a.name) || '';
            const categoryName = joinCategoryName(primaryName, selected.name);
            prevPage.setData({
                categoryName,
                categoryDisplayName: categoryName,
                categoryId: selected.id,
            });
        }
        wx.showToast({ title: '已选择分类', icon: 'success' });
        setTimeout(() => {
            wx.navigateBack({ delta: 1 });
        }, 500);
    },
});
