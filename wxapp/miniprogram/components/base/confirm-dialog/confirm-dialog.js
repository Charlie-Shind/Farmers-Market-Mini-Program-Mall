"use strict";
Component({
    properties: {
        show: {
            type: Boolean,
            value: false,
        },
        title: {
            type: String,
            value: '提示',
        },
        content: {
            type: String,
            value: '',
        },
        cancelText: {
            type: String,
            value: '取消',
        },
        confirmText: {
            type: String,
            value: '确定',
        },
    },
    methods: {
        handleCancel() {
            this.triggerEvent('cancel');
        },
        handleConfirm() {
            this.triggerEvent('confirm');
        },
    },
});
