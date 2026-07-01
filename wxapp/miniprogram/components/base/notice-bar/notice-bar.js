"use strict";
Component({
    properties: {
        text: {
            type: String,
            value: '',
        },
        type: {
            type: String,
            value: 'info',
        },
        closable: {
            type: Boolean,
            value: true,
        },
        show: {
            type: Boolean,
            value: true,
            observer(show) {
                this.setData({
                    visible: show,
                });
            },
        },
    },
    data: {
        visible: true,
    },
    methods: {
        handleClose() {
            this.setData({
                visible: false,
            });
            this.triggerEvent('close');
        },
    },
});
