"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../../config/icons");
const merchant_1 = require("../../../../services/merchant");
const app_1 = require("../../../../services/app");
const page_layout_1 = require("../../../../utils/page-layout");
const auth_route_1 = require("../../../../utils/auth-route");
const request_1 = require("../../../../services/request");
const PRODUCT_DRAFT_KEY = 'merchant-product-draft-v2';
const MAX_BANNER_COUNT = 9;
// 预售/备货 3 字段后端支持开关。后端补字段后改为 true。
// 详见 edit.ts 兜底说明：默认不携带这 3 字段；若提交失败回执明确包含字段名，
// 会自动重试一次（剥除这 3 字段）以避免商家侧 400。
const ENABLE_PRE_SALE_FIELDS = false;
const PRE_SALE_FIELDS = ['isPreSale', 'offlinePrice', 'safetyStock'];
const STORAGE_KEY_FEATURE_FLAGS = 'merchant-feature-flags-v1';
const createSpecId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const createDefaultSpecGroup = () => ({
    id: createSpecId('spec'),
    name: '规格',
    collapsed: false,
    options: [
        {
            id: createSpecId('option'),
            label: '规格项',
        },
    ],
});
function normalizeEditAnchor(value) {
    if (value === 'basic' || value === 'media' || value === 'sku' || value === 'extra') {
        return value;
    }
    return '';
}
function buildSpecGroupsFromRecord(specJson, fallbackName) {
    const entries = Object.entries(specJson || {});
    if (entries.length === 0) {
        return [
            {
                id: createSpecId('spec'),
                name: fallbackName || '规格',
                collapsed: false,
                options: [
                    {
                        id: createSpecId('option'),
                        label: '规格项',
                    },
                ],
            },
        ];
    }
    return entries.map(([name, value]) => ({
        id: createSpecId('spec'),
        name: name || '规格',
        collapsed: false,
        options: [
            {
                id: createSpecId('option'),
                label: value || '规格项',
            },
        ],
    }));
}
function buildGeneratedSkuRows(groups, defaults, preservedRows = []) {
    const activeGroups = groups.filter((group) => group.name.trim() && group.options.some((option) => option.label.trim()));
    if (activeGroups.length === 0) {
        return [
            {
                key: 'default',
                label: '规格项',
                skuName: '规格项',
                specJson: {},
                price: defaults.price,
                originalPrice: defaults.originalPrice,
                stock: defaults.stock,
                skuImageUrl: defaults.skuImageUrl,
            },
        ];
    }
    let rows = [
        {
            key: 'root',
            labelParts: [],
            specJson: {},
        },
    ];
    for (const group of activeGroups) {
        const nextRows = [];
        const options = group.options.filter((option) => option.label.trim());
        for (const row of rows) {
            for (const option of options) {
                nextRows.push({
                    key: `${row.key}|${group.id}:${option.id}`,
                    labelParts: row.labelParts.concat(option.label.trim()),
                    specJson: {
                        ...row.specJson,
                        [group.name.trim()]: option.label.trim(),
                    },
                });
            }
        }
        rows = nextRows;
    }
    const preserveMap = new Map(preservedRows.map((row) => [row.key, row]));
    return rows.map((row) => {
        const preserved = preserveMap.get(row.key);
        return {
            key: row.key,
            label: row.labelParts.join(' / ') || '规格项',
            skuName: (preserved === null || preserved === void 0 ? void 0 : preserved.skuName) || row.labelParts.join(' / ') || '规格项',
            specJson: row.specJson,
            price: (preserved === null || preserved === void 0 ? void 0 : preserved.price) || defaults.price,
            originalPrice: (preserved === null || preserved === void 0 ? void 0 : preserved.originalPrice) || defaults.originalPrice,
            stock: (preserved === null || preserved === void 0 ? void 0 : preserved.stock) || defaults.stock,
            skuImageUrl: (preserved === null || preserved === void 0 ? void 0 : preserved.skuImageUrl) || defaults.skuImageUrl,
        };
    });
}
const PRODUCT_SERVICE_OPTIONS = [
    {
        key: 'badFruit',
        title: '坏果包赔',
        desc: '坏果售后保障',
        icon: icons_1.iconPaths.shield,
    },
    {
        key: 'coldChain',
        title: '冷链直发',
        desc: '全程冷链配送',
        icon: icons_1.iconPaths.truck,
    },
    {
        key: 'originDirect',
        title: '产地直发',
        desc: '源头打包发货',
        icon: icons_1.iconPaths.origin,
    },
];
const ANCHOR_IDS = {
    basic: 'product-section-basic',
    media: 'product-section-banner',
    sku: 'product-section-sku',
    extra: 'product-section-extra',
};
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        productId: null,
        categories: [],
        serviceOptions: PRODUCT_SERVICE_OPTIONS,
        selectedCategory: null,
        pendingCategoryParent: null,
        showMoreInfo: false,
        moreInfoFilledCount: 0,
        isMultiSpec: false,
        specGroups: [],
        generatedSkuRows: [],
        form: {
            title: '',
            subtitle: '',
            coverUrl: '',
            skuName: '规格项',
            price: '',
            originalPrice: '',
            stock: '',
            originPlace: '',
            traceCode: '',
            traceDesc: '本商品全程冷链配送，支持农药残留抽检合格验证。',
            detailDesc: '',
            images: [],
            videoUrl: '',
            videoCover: '',
            serviceTagKeys: [],
            isPreSale: false,
            offlinePrice: '',
            safetyStock: '',
            soldCountText: '',
        },
        draftRestored: false,
    },
    lifetimes: {
        attached() {
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            this.bootstrap((current === null || current === void 0 ? void 0 : current.options) || {});
        },
    },
    pageLifetimes: {
        show() { },
    },
    methods: {
        bootstrap(query) {
            if (!(0, auth_route_1.ensureMerchantAccess)(`/pages/merchant/products/edit/edit` + (query.productId ? `?productId=${query.productId}` : ''))) {
                return;
            }
            const anchor = normalizeEditAnchor(query.anchor);
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
                showMoreInfo: false,
                moreInfoFilledCount: 0,
            });
            this.loadCategories().then(() => {
                if (query.productId) {
                    const id = Number(query.productId);
                    this.setData({ productId: id });
                    this.loadProductDetails(id).then(() => {
                        if (anchor) {
                            wx.nextTick(() => this.scrollToAnchorTarget(anchor));
                        }
                    });
                }
                else {
                    this.tryRestoreDraft().then((restored) => {
                        if (!restored) {
                            this.resetSpecBuilder();
                        }
                        if (anchor) {
                            wx.nextTick(() => this.scrollToAnchorTarget(anchor));
                        }
                    });
                }
            });
        },
        resetSpecBuilder() {
            const specGroups = [createDefaultSpecGroup()];
            this.setData({
                isMultiSpec: false,
                specGroups,
                generatedSkuRows: buildGeneratedSkuRows(specGroups, {
                    price: this.data.form.price || '0.00',
                    originalPrice: this.data.form.originalPrice || this.data.form.price || '0.00',
                    stock: this.data.form.stock || '0',
                    skuImageUrl: '',
                }),
            }, () => this.syncDefaultSkuToForm());
        },
        toggleMultiSpec(e) {
            const enabled = Boolean(e.detail.value);
            if (enabled) {
                const specGroups = this.data.specGroups.length
                    ? this.data.specGroups
                    : [createDefaultSpecGroup()];
                this.setData({
                    isMultiSpec: true,
                    specGroups,
                }, () => this.rebuildSkuRows());
                return;
            }
            const defaultSku = this.data.generatedSkuRows[0] || null;
            this.setData({
                isMultiSpec: false,
                specGroups: [],
                generatedSkuRows: [
                    {
                        key: 'default',
                        label: (defaultSku === null || defaultSku === void 0 ? void 0 : defaultSku.label) || this.data.form.skuName || '规格项',
                        skuName: (defaultSku === null || defaultSku === void 0 ? void 0 : defaultSku.skuName) || this.data.form.skuName || '规格项',
                        specJson: {},
                        price: this.data.form.price || (defaultSku === null || defaultSku === void 0 ? void 0 : defaultSku.price) || '0.00',
                        originalPrice: this.data.form.originalPrice || (defaultSku === null || defaultSku === void 0 ? void 0 : defaultSku.originalPrice) || this.data.form.price || '0.00',
                        stock: this.data.form.stock || (defaultSku === null || defaultSku === void 0 ? void 0 : defaultSku.stock) || '0',
                        skuImageUrl: (defaultSku === null || defaultSku === void 0 ? void 0 : defaultSku.skuImageUrl) || '',
                    },
                ],
            });
        },
        syncDefaultSkuToForm() {
            const first = this.data.generatedSkuRows[0];
            if (!first) {
                return;
            }
            this.setData({
                'form.skuName': first.skuName,
                'form.price': first.price,
                'form.originalPrice': first.originalPrice,
                'form.stock': first.stock,
            });
        },
        async loadCategories() {
            try {
                const categories = await (0, app_1.fetchCategories)();
                this.setData({ categories });
            }
            catch (err) {
                wx.showToast({ title: '分类加载失败，请重试', icon: 'none' });
                console.error('Failed to load categories:', err);
            }
        },
        async loadProductDetails(productId) {
            var _a, _b, _c, _d, _e, _f;
            try {
                wx.showLoading({ title: '加载商品中...' });
                const product = await (0, merchant_1.fetchMerchantProductDetail)(productId);
                wx.hideLoading();
                if (!product) {
                    return;
                }
                const price = String(product.price || '').replace(/[^\d.]/g, '');
                const originalPrice = String(product.originalPrice || price).replace(/[^\d.]/g, '');
                const images = (product.images && product.images.length > 0)
                    ? product.images.slice()
                    : (product.coverUrl ? [product.coverUrl] : []);
                const specGroups = buildSpecGroupsFromRecord(product.specJson || {}, product.skuName || '规格');
                const isMultiSpec = Object.keys(product.specJson || {}).length > 0;
                this.setData({
                    isMultiSpec,
                    form: {
                        title: product.title || '',
                        subtitle: product.subtitle || '',
                        coverUrl: product.coverUrl || '',
                        skuName: product.skuName || '规格项',
                        price,
                        originalPrice,
                        stock: String((_a = product.stock) !== null && _a !== void 0 ? _a : '0'),
                        originPlace: product.originPlace || '',
                        traceCode: product.traceCode || '',
                        traceDesc: product.traceDesc || '本商品全程冷链配送，支持农药残留抽检合格验证。',
                        detailDesc: product.detailDesc || '',
                        images,
                        videoUrl: (product.videos && ((_b = product.videos[0]) === null || _b === void 0 ? void 0 : _b.videoUrl)) || '',
                        videoCover: (product.videos && ((_c = product.videos[0]) === null || _c === void 0 ? void 0 : _c.coverUrl)) || '',
                        serviceTagKeys: (product.serviceTags || []).map((item) => item.key),
                        isPreSale: false,
                        offlinePrice: '',
                        safetyStock: '',
                        // 后端兼容: MerchantProductDetail 暂无 soldCount 字段；通过强制断言读取，
                        // 后端补字段后无需改此处。
                        soldCountText: this.formatSoldCount(product.soldCount),
                    },
                    specGroups,
                });
                this.setData({
                    generatedSkuRows: buildGeneratedSkuRows(specGroups, {
                        price,
                        originalPrice,
                        stock: String((_d = product.stock) !== null && _d !== void 0 ? _d : '0'),
                        skuImageUrl: '',
                    }, [
                        {
                            key: 'default',
                            label: product.skuName || '规格项',
                            skuName: product.skuName || '规格项',
                            specJson: product.specJson || {},
                            price,
                            originalPrice,
                            stock: String((_e = product.stock) !== null && _e !== void 0 ? _e : '0'),
                            skuImageUrl: '',
                        },
                    ]),
                }, () => {
                    this.syncDefaultSkuToForm();
                    this.recomputeMoreInfoSummary();
                });
                if (product.categoryId && this.data.categories.length > 0) {
                    // 优先在二级分类中查找，未命中再回到一级
                    let matched = null;
                    for (const parent of this.data.categories) {
                        const child = (_f = parent.children) === null || _f === void 0 ? void 0 : _f.find((c) => c.id === product.categoryId);
                        if (child) {
                            matched = {
                                id: child.id,
                                name: `${parent.name} / ${child.name}`,
                                iconUrl: child.iconUrl,
                                sortOrder: child.sortOrder,
                                children: [],
                            };
                            break;
                        }
                        if (parent.id === product.categoryId) {
                            matched = parent;
                            break;
                        }
                    }
                    if (matched) {
                        this.setData({ selectedCategory: matched, pendingCategoryParent: null });
                    }
                }
            }
            catch (err) {
                wx.hideLoading();
                wx.showToast({ title: '商品加载失败', icon: 'none' });
                console.error('Failed to load product details:', err);
                setTimeout(() => (0, auth_route_1.navigateBackOrMerchantHome)(), 800);
            }
        },
        onFieldInput(e) {
            var _a;
            const field = String(e.currentTarget.dataset.field || '');
            const value = String((_a = e.detail.value) !== null && _a !== void 0 ? _a : '');
            if (!field)
                return;
            this.setData({
                form: {
                    ...this.data.form,
                    [field]: value,
                },
            }, () => {
                if (['skuName', 'price', 'originalPrice', 'stock'].includes(field)) {
                    this.rebuildSkuRows();
                }
                if ([
                    'originPlace',
                    'traceCode',
                    'traceDesc',
                    'videoUrl',
                    'offlinePrice',
                    'safetyStock',
                ].includes(field)) {
                    this.recomputeMoreInfoSummary();
                }
            });
        },
        onCategoryParentChange(e) {
            const index = Number(e.detail.value);
            const parent = this.data.categories[index] || null;
            if (!parent) {
                return;
            }
            if (!parent.children || parent.children.length === 0) {
                // 一级分类下没有子分类时直接作为最终选择
                this.setData({ selectedCategory: parent, pendingCategoryParent: null });
                return;
            }
            this.setData({ pendingCategoryParent: parent, selectedCategory: null });
        },
        onCategoryChildChange(e) {
            const parent = this.data.pendingCategoryParent;
            if (!parent || !parent.children)
                return;
            const index = Number(e.detail.value);
            const child = parent.children[index] || null;
            if (!child)
                return;
            // 选完二级后构造一个扁平 selectedCategory（复用 AppCategory 子集字段）
            this.setData({
                selectedCategory: {
                    id: child.id,
                    name: `${parent.name} / ${child.name}`,
                    iconUrl: child.iconUrl,
                    sortOrder: child.sortOrder,
                    children: [],
                },
                pendingCategoryParent: null,
            });
        },
        onReselectCategoryParent() {
            this.setData({ pendingCategoryParent: null, selectedCategory: null });
        },
        isServiceSelected(key) {
            return this.data.form.serviceTagKeys.includes(key);
        },
        toggleServiceTag(e) {
            const { key } = e.currentTarget.dataset || {};
            if (!key) {
                return;
            }
            const selected = new Set(this.data.form.serviceTagKeys);
            if (selected.has(key)) {
                selected.delete(key);
            }
            else {
                selected.add(key);
            }
            this.setData({
                'form.serviceTagKeys': Array.from(selected),
            }, () => this.recomputeMoreInfoSummary());
        },
        onPreSaleChange(e) {
            this.setData({
                'form.isPreSale': Boolean(e.detail.value),
            }, () => this.recomputeMoreInfoSummary());
        },
        toggleMoreInfo() {
            this.setData({ showMoreInfo: !this.data.showMoreInfo });
        },
        recomputeMoreInfoSummary() {
            const { form } = this.data;
            let count = 0;
            if (form.serviceTagKeys.length > 0)
                count += 1;
            if (form.originPlace.trim())
                count += 1;
            if (form.traceCode.trim() || form.traceDesc.trim())
                count += 1;
            if (form.videoUrl)
                count += 1;
            if (form.isPreSale)
                count += 1;
            this.setData({ moreInfoFilledCount: count });
        },
        addSpecGroup() {
            const specGroups = this.data.specGroups.slice();
            specGroups.push({
                id: createSpecId('spec'),
                name: `规格${specGroups.length + 1}`,
                collapsed: false,
                options: [
                    {
                        id: createSpecId('option'),
                        label: '选项 1',
                    },
                ],
            });
            this.setData({ specGroups }, () => this.rebuildSkuRows());
        },
        toggleSpecGroup(e) {
            const index = Number(e.currentTarget.dataset.index);
            if (Number.isNaN(index))
                return;
            const specGroups = this.data.specGroups.slice();
            const group = specGroups[index];
            if (!group)
                return;
            group.collapsed = !group.collapsed;
            this.setData({ specGroups });
        },
        onSpecGroupNameInput(e) {
            var _a;
            const index = Number(e.currentTarget.dataset.index);
            if (Number.isNaN(index))
                return;
            const value = String((_a = e.detail.value) !== null && _a !== void 0 ? _a : '');
            const specGroups = this.data.specGroups.slice();
            const group = specGroups[index];
            if (!group)
                return;
            group.name = value;
            this.setData({ specGroups }, () => this.rebuildSkuRows());
        },
        addSpecOption(e) {
            const index = Number(e.currentTarget.dataset.index);
            if (Number.isNaN(index))
                return;
            const specGroups = this.data.specGroups.slice();
            const group = specGroups[index];
            if (!group)
                return;
            group.options.push({
                id: createSpecId('option'),
                label: '',
            });
            this.setData({ specGroups }, () => this.rebuildSkuRows());
        },
        onSpecOptionInput(e) {
            var _a;
            const dataset = e.currentTarget.dataset || {};
            const groupIndex = Number(dataset.groupIndex);
            const optionIndex = Number(dataset.optionIndex);
            if (Number.isNaN(groupIndex) || Number.isNaN(optionIndex))
                return;
            const value = String((_a = e.detail.value) !== null && _a !== void 0 ? _a : '');
            const specGroups = this.data.specGroups.slice();
            const group = specGroups[groupIndex];
            const option = group === null || group === void 0 ? void 0 : group.options[optionIndex];
            if (!group || !option)
                return;
            option.label = value;
            this.setData({ specGroups }, () => this.rebuildSkuRows());
        },
        removeSpecOption(e) {
            const dataset = e.currentTarget.dataset || {};
            const groupIndex = Number(dataset.groupIndex);
            const optionIndex = Number(dataset.optionIndex);
            if (Number.isNaN(groupIndex) || Number.isNaN(optionIndex))
                return;
            const specGroups = this.data.specGroups.slice();
            const group = specGroups[groupIndex];
            if (!group)
                return;
            if (group.options.length <= 1) {
                wx.showToast({ title: '每组至少保留 1 个选项', icon: 'none' });
                return;
            }
            group.options.splice(optionIndex, 1);
            this.setData({ specGroups }, () => this.rebuildSkuRows());
        },
        onGeneratedSkuInput(e) {
            var _a;
            const dataset = e.currentTarget.dataset || {};
            const rowIndex = Number(dataset.rowIndex);
            const field = String(dataset.field || '');
            if (Number.isNaN(rowIndex) || !field)
                return;
            const value = String((_a = e.detail.value) !== null && _a !== void 0 ? _a : '');
            const rows = this.data.generatedSkuRows.slice();
            const row = rows[rowIndex];
            if (!row)
                return;
            row[field] = value;
            this.setData({ generatedSkuRows: rows });
        },
        rebuildSkuRows() {
            const rows = buildGeneratedSkuRows(this.data.specGroups, {
                price: this.data.form.price || '0.00',
                originalPrice: this.data.form.originalPrice || this.data.form.price || '0.00',
                stock: this.data.form.stock || '0',
                skuImageUrl: '',
            }, this.data.generatedSkuRows);
            this.setData({ generatedSkuRows: rows });
        },
        goBack() {
            (0, auth_route_1.navigateBackOrMerchantHome)();
        },
        scrollToAnchorTarget(target) {
            const selector = ANCHOR_IDS[target];
            if (!selector) {
                return;
            }
            wx.pageScrollTo({ selector: `#${selector}`, offsetTop: -120, duration: 300 });
        },
        async onAddBannerImage() {
            const currentCount = this.data.form.images.length;
            if (currentCount >= MAX_BANNER_COUNT) {
                wx.showToast({ title: `最多上传 ${MAX_BANNER_COUNT} 张图片`, icon: 'none' });
                return;
            }
            try {
                wx.showLoading({ title: '选择图片中...' });
                const res = await wx.chooseMedia({
                    count: MAX_BANNER_COUNT - currentCount,
                    mediaType: ['image'],
                    sourceType: ['album', 'camera'],
                });
                wx.hideLoading();
                if (!res.tempFiles || res.tempFiles.length === 0) {
                    return;
                }
                wx.showLoading({ title: '上传中...' });
                const uploadPromises = res.tempFiles.map((file) => (0, request_1.upload)({
                    url: '/files/upload',
                    filePath: file.tempFilePath,
                    name: 'file',
                }));
                const results = await Promise.all(uploadPromises);
                wx.hideLoading();
                const newImages = this.data.form.images.concat(results.map((r) => r.url));
                this.setData({
                    'form.images': newImages,
                    'form.coverUrl': newImages[0] || '',
                });
                wx.showToast({ title: '上传成功', icon: 'success' });
            }
            catch (err) {
                wx.hideLoading();
                wx.showToast({ title: '上传失败', icon: 'none' });
                console.error('Failed to upload banner images:', err);
            }
        },
        onRemoveBannerImage(e) {
            const idx = Number(e.currentTarget.dataset.index);
            if (Number.isNaN(idx))
                return;
            const images = this.data.form.images.slice();
            images.splice(idx, 1);
            this.setData({
                'form.images': images,
                'form.coverUrl': images[0] || '',
            });
        },
        async onUploadVideo() {
            try {
                wx.showLoading({ title: '选择视频中...' });
                const res = await wx.chooseMedia({
                    count: 1,
                    mediaType: ['video'],
                    sourceType: ['album', 'camera'],
                    maxDuration: 60,
                });
                wx.hideLoading();
                const tempFile = res.tempFiles[0];
                if (!tempFile)
                    return;
                wx.showLoading({ title: '视频上传中...' });
                const result = await (0, request_1.upload)({
                    url: '/files/upload',
                    filePath: tempFile.tempFilePath,
                    name: 'file',
                });
                wx.hideLoading();
                this.setData({
                    'form.videoUrl': result.url,
                    'form.videoCover': tempFile.thumbTempFilePath || '',
                }, () => this.recomputeMoreInfoSummary());
                wx.showToast({ title: '视频已上传', icon: 'success' });
                // 异步探测视频域名：仅在真机报错时阻断，不会影响编辑器继续保存。
                this.probeVideoDomain(result.url);
            }
            catch (err) {
                wx.hideLoading();
                wx.showToast({ title: '上传失败', icon: 'none' });
                console.error('Failed to upload video:', err);
            }
        },
        async probeVideoDomain(url) {
            if (!url)
                return;
            try {
                const probeUrl = `${url}#t=0.001`;
                // 通过 wx.getVideoInfo 探测（如可用），失败则提示用户配置域名
                const info = await new Promise((resolve) => {
                    const video = wx.createVideoContext;
                    if (typeof video !== 'function') {
                        resolve({ ok: true });
                        return;
                    }
                    resolve({ ok: true });
                    // 仅占位：实际播放 <video> 组件在用户提交预览时会触发合法域名校验
                    console.log('Video domain probe skipped for', probeUrl);
                });
                if (!info.ok) {
                    this.showVideoDomainHint();
                }
            }
            catch (e) {
                this.showVideoDomainHint();
            }
        },
        showVideoDomainHint() {
            wx.showModal({
                title: '视频域名需配置',
                content: '当前视频 URL 未在微信公众平台的"业务域名 / downloadFile 合法域名"白名单中。\n\n请到 mp.weixin.qq.com → 开发管理 → 服务器域名 中添加该域名后再发布。\n\n开发期间可在微信开发者工具勾选"不校验合法域名"以跳过此限制。',
                confirmText: '我知道了',
                showCancel: false,
            });
        },
        onRemoveVideo() {
            this.setData({
                'form.videoUrl': '',
                'form.videoCover': '',
            }, () => this.recomputeMoreInfoSummary());
        },
        buildPayload(status, includePreSaleFields = ENABLE_PRE_SALE_FIELDS) {
            var _a;
            const { form, selectedCategory, isMultiSpec } = this.data;
            const skus = this.data.generatedSkuRows.map((row) => ({
                skuName: row.skuName.trim() || row.label,
                specJson: row.specJson,
                price: row.price || form.price,
                originalPrice: row.originalPrice || form.originalPrice || form.price,
                stock: Number(row.stock || 0),
            }));
            const specJson = isMultiSpec ? ((_a = skus[0]) === null || _a === void 0 ? void 0 : _a.specJson) || {} : {};
            const base = {
                title: form.title,
                subtitle: form.subtitle,
                coverUrl: form.images[0] || form.coverUrl,
                categoryId: selectedCategory ? selectedCategory.id : undefined,
                price: form.price,
                originalPrice: form.originalPrice || form.price,
                stock: Number(form.stock),
                originPlace: form.originPlace,
                deliveryType: form.serviceTagKeys.includes('coldChain') ? 2 : 1,
                skuName: form.skuName,
                specJson,
                skus,
                isMultiSpec,
                detailDesc: form.detailDesc,
                images: form.images,
                videos: form.videoUrl
                    ? [{ videoUrl: form.videoUrl, coverUrl: form.videoCover }]
                    : [],
                serviceTags: this.data.serviceOptions
                    .filter((item) => form.serviceTagKeys.includes(item.key))
                    .map((item) => ({
                    key: item.key,
                    title: item.title,
                    desc: item.desc,
                    icon: item.icon,
                })),
                traceInfo: {
                    traceCode: form.traceCode,
                    traceDesc: form.traceDesc,
                },
                status,
            };
            if (includePreSaleFields) {
                base['isPreSale'] = form.isPreSale;
                base['offlinePrice'] = form.isPreSale && form.offlinePrice ? form.offlinePrice : undefined;
                base['safetyStock'] =
                    form.isPreSale && form.safetyStock ? Number(form.safetyStock) : undefined;
            }
            return base;
        },
        isPreSaleError(err) {
            const message = err instanceof Error ? err.message : String(err);
            return PRE_SALE_FIELDS.some((field) => message.toLowerCase().includes(field.toLowerCase()));
        },
        formatSoldCount(value) {
            if (value === undefined || value === null || value === '')
                return '';
            const num = Number(value);
            if (Number.isNaN(num) || num < 0)
                return '';
            if (num >= 10000) {
                return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}万`;
            }
            return String(num);
        },
        readFeatureFlags() {
            try {
                const raw = wx.getStorageSync(STORAGE_KEY_FEATURE_FLAGS);
                if (!raw)
                    return { preSale: ENABLE_PRE_SALE_FIELDS };
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                return { preSale: Boolean(parsed === null || parsed === void 0 ? void 0 : parsed.preSale) };
            }
            catch (e) {
                return { preSale: ENABLE_PRE_SALE_FIELDS };
            }
        },
        writeFeatureFlag(key, value) {
            try {
                const current = this.readFeatureFlags();
                const next = { ...current, [key]: value };
                wx.setStorageSync(STORAGE_KEY_FEATURE_FLAGS, next);
            }
            catch (e) {
                console.warn('Failed to write feature flag', key, e);
            }
        },
        validateBeforeSubmit() {
            const { form, selectedCategory, isMultiSpec, generatedSkuRows } = this.data;
            if (!form.title.trim()) {
                return '请输入商品标题';
            }
            if (!selectedCategory) {
                return '请选择商品分类';
            }
            if (!form.price.trim() || Number(form.price) <= 0) {
                return '请输入合法的销售价';
            }
            if (Number(form.stock) < 0 || !String(form.stock).trim()) {
                return '请输入合法的库存';
            }
            if (!isMultiSpec && !form.skuName.trim()) {
                return '请输入默认 SKU 名称';
            }
            if (isMultiSpec && generatedSkuRows.length === 0) {
                return '请至少添加 1 个规格组';
            }
            return null;
        },
        async saveDraft() {
            const { form, selectedCategory, isMultiSpec, specGroups, generatedSkuRows } = this.data;
            const payload = {
                form,
                selectedCategory,
                isMultiSpec,
                specGroups,
                generatedSkuRows,
                savedAt: Date.now(),
            };
            // 本地兜底：永远先写本地，确保即使断网也能恢复
            try {
                wx.setStorageSync(PRODUCT_DRAFT_KEY, payload);
            }
            catch (e) {
                console.warn('local draft save failed', e);
            }
            // 云同步：后端有 /merchant/products/drafts 时写入；无则静默
            try {
                const result = await (0, merchant_1.syncMerchantProductDraft)(payload);
                if (result === null || result === void 0 ? void 0 : result.draftId) {
                    wx.setStorageSync(PRODUCT_DRAFT_KEY + ':cloudId', result.draftId);
                    wx.showToast({ title: '草稿已同步到云端', icon: 'success' });
                }
                else {
                    wx.showToast({ title: '草稿已保存到本地', icon: 'success' });
                }
            }
            catch (e) {
                wx.showToast({ title: '草稿已保存到本地', icon: 'success' });
            }
        },
        async tryRestoreDraft() {
            // 优先尝试云端草稿（若云端存在 draftId），其次本地
            const cloudId = wx.getStorageSync(PRODUCT_DRAFT_KEY + ':cloudId');
            if (cloudId) {
                const cloudDraft = await (0, merchant_1.fetchMerchantProductDraft)(cloudId);
                if (cloudDraft && cloudDraft.form) {
                    this.applyDraft(cloudDraft);
                    wx.showToast({ title: '已恢复云端草稿', icon: 'none' });
                    return true;
                }
            }
            try {
                const raw = wx.getStorageSync(PRODUCT_DRAFT_KEY);
                if (!raw) {
                    return false;
                }
                const draft = typeof raw === 'string' ? JSON.parse(raw) : raw;
                if (!draft || !draft.form) {
                    return false;
                }
                this.applyDraft(draft);
                wx.showToast({ title: '已恢复本地草稿', icon: 'none' });
                return true;
            }
            catch (err) {
                console.error('Failed to restore draft:', err);
                return false;
            }
        },
        applyDraft(draft) {
            this.setData({
                form: { ...this.data.form, ...draft.form },
                selectedCategory: draft.selectedCategory || null,
                pendingCategoryParent: null,
                isMultiSpec: Boolean(draft.isMultiSpec),
                specGroups: draft.specGroups || [createDefaultSpecGroup()],
                generatedSkuRows: draft.generatedSkuRows || [],
                showMoreInfo: this.shouldExpandMoreInfo(draft.form),
            });
            this.recomputeMoreInfoSummary();
        },
        shouldExpandMoreInfo(form) {
            var _a;
            return Boolean(((_a = form.serviceTagKeys) === null || _a === void 0 ? void 0 : _a.length) ||
                form.originPlace ||
                form.traceCode ||
                form.traceDesc ||
                form.videoUrl ||
                form.isPreSale);
        },
        clearDraft() {
            try {
                wx.removeStorageSync(PRODUCT_DRAFT_KEY);
                wx.removeStorageSync(PRODUCT_DRAFT_KEY + ':cloudId');
            }
            catch (err) {
                console.error('Failed to clear draft:', err);
            }
        },
        async submitAndPublish() {
            const { productId } = this.data;
            const validationError = this.validateBeforeSubmit();
            if (validationError) {
                wx.showToast({ title: validationError, icon: 'none' });
                return;
            }
            const status = 1;
            const flags = this.readFeatureFlags();
            const initialPayload = this.buildPayload(status, flags.preSale);
            try {
                wx.showLoading({ title: '提交中...' });
                try {
                    if (productId) {
                        await (0, merchant_1.updateMerchantProduct)(productId, initialPayload);
                    }
                    else {
                        await (0, merchant_1.createMerchantProduct)(initialPayload);
                    }
                }
                catch (firstErr) {
                    // 探测：若后端明确指出预售/备货字段不支持，自动剥除这 3 字段重试一次。
                    if (flags.preSale && this.isPreSaleError(firstErr)) {
                        console.warn('后端不支持预售/备货字段，自动降级重试', firstErr);
                        this.writeFeatureFlag('preSale', false);
                        const fallbackPayload = this.buildPayload(status, false);
                        if (productId) {
                            await (0, merchant_1.updateMerchantProduct)(productId, fallbackPayload);
                        }
                        else {
                            await (0, merchant_1.createMerchantProduct)(fallbackPayload);
                        }
                        wx.showToast({
                            title: '已发布（预售/备货字段后端暂不支持）',
                            icon: 'none',
                            duration: 2000,
                        });
                        this.clearDraft();
                        setTimeout(() => (0, auth_route_1.navigateBackOrMerchantHome)(), 1000);
                        return;
                    }
                    throw firstErr;
                }
                wx.hideLoading();
                wx.showToast({
                    title: productId ? '保存成功' : '发布成功',
                    icon: 'success',
                });
                this.clearDraft();
                setTimeout(() => {
                    (0, auth_route_1.navigateBackOrMerchantHome)();
                }, 800);
            }
            catch (err) {
                wx.hideLoading();
                const message = err instanceof Error ? err.message : '发布失败，请重试';
                wx.showToast({ title: message, icon: 'none' });
                console.error('Failed to publish product:', err);
            }
        },
    },
});
