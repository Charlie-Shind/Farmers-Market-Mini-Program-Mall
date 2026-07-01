"use strict";
Component({
    properties: {
        show: {
            type: Boolean,
            value: false,
        },
        imageUrl: {
            type: String,
            value: '',
            observer: 'onImageUrlChange',
        },
        aspectRatio: {
            type: Number,
            value: 1.0, // width / height
        },
        exportWidth: {
            type: Number,
            value: 300,
        },
        exportHeight: {
            type: Number,
            value: 300,
        },
    },
    data: {
        cropBoxW: 0,
        cropBoxH: 0,
        cropBoxLeft: 0,
        cropBoxTop: 0,
        imgWidth: 0,
        imgHeight: 0,
        imgX: 0,
        imgY: 0,
        imgScale: 1,
        imgRotate: 0,
        processing: false,
    },
    lifetimes: {
        attached() {
            const self = this;
            self.sysInfo = wx.getSystemInfoSync();
            self.touchMode = '';
            self.startX = 0;
            self.startY = 0;
            self.lastX = 0;
            self.lastY = 0;
            self.lastScale = 1.0;
            self.startDist = 0;
            self.imgOrigW = 0;
            self.imgOrigH = 0;
        },
    },
    methods: {
        preventTouchMove() {
            // Catch event to prevent background scrolling
        },
        onImageUrlChange(newVal) {
            if (!newVal) {
                return;
            }
            this.initImage(newVal);
        },
        initImage(url) {
            const self = this;
            this.setData({ processing: false });
            wx.showLoading({ title: '加载图片中...', mask: true });
            wx.getImageInfo({
                src: url,
                success: (res) => {
                    self.imgOrigW = res.width;
                    self.imgOrigH = res.height;
                    this.setupDimensions();
                },
                fail: (err) => {
                    console.error('getImageInfo failed', err);
                    wx.showToast({ title: '图片加载失败', icon: 'none' });
                },
                complete: () => {
                    wx.hideLoading();
                },
            });
        },
        setupDimensions() {
            const self = this;
            const info = self.sysInfo || wx.getSystemInfoSync();
            self.sysInfo = info;
            const screenW = info.windowWidth;
            const screenH = info.windowHeight;
            // 1. Calculate Crop Box Size
            const ratio = this.data.aspectRatio || 1.0;
            const maxBoxW = screenW * 0.85;
            const maxBoxH = (screenH - 120) * 0.65; // Leave space for toolbar
            let boxW = maxBoxW;
            let boxH = boxW / ratio;
            if (boxH > maxBoxH) {
                boxH = maxBoxH;
                boxW = boxH * ratio;
            }
            const boxLeft = (screenW - boxW) / 2;
            const boxTop = (screenH - 90 - boxH) / 2; // Subtract part of toolbar height for centered look
            // 2. Calculate Base Image Display Size (covers the crop box at scale = 1)
            const imgRatio = self.imgOrigW / self.imgOrigH;
            const boxRatio = boxW / boxH;
            let imgWidth = 0;
            let imgHeight = 0;
            if (imgRatio > boxRatio) {
                // Image is wider relative to height: fit height to crop box, scale width
                imgHeight = boxH;
                imgWidth = boxH * imgRatio;
            }
            else {
                // Image is taller relative to width: fit width to crop box, scale height
                imgWidth = boxW;
                imgHeight = boxW / imgRatio;
            }
            this.setData({
                cropBoxW: boxW,
                cropBoxH: boxH,
                cropBoxLeft: boxLeft,
                cropBoxTop: boxTop,
                imgWidth,
                imgHeight,
                imgX: 0,
                imgY: 0,
                imgScale: 1.0,
                imgRotate: 0,
            });
        },
        getMinScale(rotate) {
            const isSwapped = (rotate / 90) % 2 === 1;
            const Wdisp = this.data.imgWidth;
            const Hdisp = this.data.imgHeight;
            const Wbox = this.data.cropBoxW;
            const Hbox = this.data.cropBoxH;
            const scaleW = Wbox / (isSwapped ? Hdisp : Wdisp);
            const scaleH = Hbox / (isSwapped ? Wdisp : Hdisp);
            return Math.max(scaleW, scaleH);
        },
        clampBoundaries(x, y, scale, rotate) {
            const isSwapped = (rotate / 90) % 2 === 1;
            const Wdisp = this.data.imgWidth;
            const Hdisp = this.data.imgHeight;
            const Wbox = this.data.cropBoxW;
            const Hbox = this.data.cropBoxH;
            const imgWOnScreen = (isSwapped ? Hdisp : Wdisp) * scale;
            const imgHOnScreen = (isSwapped ? Wdisp : Hdisp) * scale;
            let minX = Wbox / 2 - imgWOnScreen / 2;
            let maxX = -Wbox / 2 + imgWOnScreen / 2;
            if (minX > maxX) {
                const temp = minX;
                minX = maxX;
                maxX = temp;
            }
            const clampedX = Math.max(minX, Math.min(maxX, x));
            let minY = Hbox / 2 - imgHOnScreen / 2;
            let maxY = -Hbox / 2 + imgHOnScreen / 2;
            if (minY > maxY) {
                const temp = minY;
                minY = maxY;
                maxY = temp;
            }
            const clampedY = Math.max(minY, Math.min(maxY, y));
            return { x: clampedX, y: clampedY };
        },
        onTouchStart(e) {
            if (this.data.processing)
                return;
            const self = this;
            const touches = e.touches;
            if (touches.length === 1) {
                self.touchMode = 'drag';
                self.startX = touches[0].clientX;
                self.startY = touches[0].clientY;
                self.lastX = this.data.imgX;
                self.lastY = this.data.imgY;
            }
            else if (touches.length >= 2) {
                self.touchMode = 'zoom';
                const p1 = touches[0];
                const p2 = touches[1];
                self.startDist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
                self.lastScale = this.data.imgScale;
                self.lastX = this.data.imgX;
                self.lastY = this.data.imgY;
            }
        },
        onTouchMove(e) {
            if (this.data.processing)
                return;
            const self = this;
            const touches = e.touches;
            if (self.touchMode === 'drag' && touches.length === 1) {
                const dx = touches[0].clientX - self.startX;
                const dy = touches[0].clientY - self.startY;
                const targetX = self.lastX + dx;
                const targetY = self.lastY + dy;
                const clamped = this.clampBoundaries(targetX, targetY, this.data.imgScale, this.data.imgRotate);
                this.setData({
                    imgX: clamped.x,
                    imgY: clamped.y,
                });
            }
            else if (self.touchMode === 'zoom' && touches.length >= 2) {
                const p1 = touches[0];
                const p2 = touches[1];
                const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
                let scale = self.lastScale * (dist / self.startDist);
                const minScale = this.getMinScale(this.data.imgRotate);
                scale = Math.max(minScale, Math.min(5.0, scale));
                const clamped = this.clampBoundaries(this.data.imgX, this.data.imgY, scale, this.data.imgRotate);
                this.setData({
                    imgScale: scale,
                    imgX: clamped.x,
                    imgY: clamped.y,
                });
            }
        },
        onTouchEnd() {
            const self = this;
            self.touchMode = '';
        },
        onRotate() {
            if (this.data.processing)
                return;
            const nextRotate = (this.data.imgRotate + 90) % 360;
            const minScale = this.getMinScale(nextRotate);
            let nextScale = this.data.imgScale;
            if (nextScale < minScale) {
                nextScale = minScale;
            }
            const clamped = this.clampBoundaries(this.data.imgX, this.data.imgY, nextScale, nextRotate);
            this.setData({
                imgRotate: nextRotate,
                imgScale: nextScale,
                imgX: clamped.x,
                imgY: clamped.y,
            });
        },
        onCancel() {
            if (this.data.processing)
                return;
            this.triggerEvent('cancel');
        },
        onConfirm() {
            if (this.data.processing)
                return;
            this.setData({ processing: true });
            wx.showLoading({ title: '裁剪中...', mask: true });
            const query = this.createSelectorQuery();
            query.select('#cropper-canvas')
                .fields({ node: true, size: true })
                .exec((res) => {
                if (!res[0] || !res[0].node) {
                    this.setData({ processing: false });
                    wx.hideLoading();
                    wx.showToast({ title: '画布初始化失败', icon: 'none' });
                    return;
                }
                const canvas = res[0].node;
                const ctx = canvas.getContext('2d');
                const expW = this.data.exportWidth;
                const expH = this.data.exportHeight;
                canvas.width = expW;
                canvas.height = expH;
                // Clear canvas
                ctx.clearRect(0, 0, expW, expH);
                // Get image reference
                const img = canvas.createImage();
                img.src = this.data.imageUrl;
                img.onload = () => {
                    try {
                        const Wdisp = this.data.imgWidth;
                        const Hdisp = this.data.imgHeight;
                        const Wbox = this.data.cropBoxW;
                        // Compute isotropic scaling from screen to canvas
                        const K = expW / Wbox;
                        // Computed image size on canvas
                        const canvasImgW = Wdisp * this.data.imgScale * K;
                        const canvasImgH = Hdisp * this.data.imgScale * K;
                        // Image center relative to canvas center
                        const canvasImgCenterX = expW / 2 + this.data.imgX * K;
                        const canvasImgCenterY = expH / 2 + this.data.imgY * K;
                        ctx.save();
                        // 1. Move origin to image center
                        ctx.translate(canvasImgCenterX, canvasImgCenterY);
                        // 2. Rotate
                        ctx.rotate((this.data.imgRotate * Math.PI) / 180);
                        // 3. Draw image centered
                        ctx.drawImage(img, -canvasImgW / 2, -canvasImgH / 2, canvasImgW, canvasImgH);
                        ctx.restore();
                        // Export temp file
                        wx.canvasToTempFilePath({
                            canvas: canvas,
                            destWidth: expW,
                            destHeight: expH,
                            fileType: 'jpg',
                            quality: 0.9,
                            success: (exportRes) => {
                                this.triggerEvent('success', { tempFilePath: exportRes.tempFilePath });
                            },
                            fail: (exportErr) => {
                                console.error('canvasToTempFilePath failed', exportErr);
                                wx.showToast({ title: '生成裁剪图片失败', icon: 'none' });
                            },
                            complete: () => {
                                this.setData({ processing: false });
                                wx.hideLoading();
                            },
                        }, this);
                    }
                    catch (drawErr) {
                        console.error('Canvas draw error', drawErr);
                        this.setData({ processing: false });
                        wx.hideLoading();
                        wx.showToast({ title: '图片处理出错', icon: 'none' });
                    }
                };
                img.onerror = (imgErr) => {
                    console.error('Canvas image load failed', imgErr);
                    this.setData({ processing: false });
                    wx.hideLoading();
                    wx.showToast({ title: '加载图片资源失败', icon: 'none' });
                };
            });
        },
    },
});
