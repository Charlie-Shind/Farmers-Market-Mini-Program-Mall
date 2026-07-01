"use strict";
const PROJECT_COLORS = {
    brandGreen: '#2C4A39',
    brandGreenStrong: '#3F6F44',
    brandGold: '#D8A978',
    brandOrange: '#C65F2D',
    brandPurple: '#9663AA',
    brandText: '#333333',
    brandMuted: '#8A877F',
    brandLine: 'rgba(44, 74, 57, 0.08)',
    brandBg: '#F6F3EB',
    brandCard: 'rgba(255, 255, 255, 0.88)',
    brandIvory: '#FFF8E9',
    brandCream: '#F8F0D9',
    brandDanger: '#D93B2F',
    brandWhite: '#FFFFFF',
};
function resolveProjectColor(color) {
    if (!color) {
        return '';
    }
    return PROJECT_COLORS[color] || color;
}
Component({
    properties: {
        src: {
            type: String,
            value: '',
        },
        size: {
            type: String,
            value: '48rpx',
        },
        mode: {
            type: String,
            value: 'aspectFit',
        },
        display: {
            type: String,
            value: 'inline-block',
        },
        radius: {
            type: String,
            value: '0',
        },
        background: {
            type: String,
            value: 'transparent',
        },
        color: {
            type: String,
            value: '',
        },
        opacity: {
            type: Number,
            value: 1,
        },
    },
    data: {
        useMask: false,
        imageStyle: '',
        maskStyle: '',
    },
    observers: {
        'src,size,mode,display,radius,background,color,opacity': function () {
            this.syncStyles();
        },
    },
    lifetimes: {
        attached() {
            this.syncStyles();
        },
    },
    methods: {
        syncStyles() {
            const { src, size, display, radius, background, opacity, color, } = this.data;
            const resolvedColor = resolveProjectColor(color);
            const baseStyle = [
                `width: ${size}`,
                `height: ${size}`,
                `display: ${display}`,
                `opacity: ${opacity}`,
                `border-radius: ${radius}`,
            ].join('; ') + ';';
            if (src && resolvedColor && (src.endsWith('.svg') || src.startsWith('data:image/svg+xml'))) {
                const fillColor = background && background !== 'transparent'
                    ? background
                    : resolvedColor;
                this.setData({
                    useMask: true,
                    imageStyle: '',
                    maskStyle: [
                        baseStyle,
                        `background: ${fillColor}`,
                        `-webkit-mask-image: url('${src}')`,
                        `mask-image: url('${src}')`,
                        '-webkit-mask-repeat: no-repeat',
                        'mask-repeat: no-repeat',
                        '-webkit-mask-position: center',
                        'mask-position: center',
                        '-webkit-mask-size: contain',
                        'mask-size: contain',
                    ].join('; ') + ';',
                });
                return;
            }
            this.setData({
                useMask: false,
                maskStyle: '',
                imageStyle: [
                    baseStyle,
                    `background: ${background}`,
                ].join('; ') + ';',
            });
        },
    },
});
