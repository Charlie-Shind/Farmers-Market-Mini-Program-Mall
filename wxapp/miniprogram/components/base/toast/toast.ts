let toastTimer: number | undefined;

Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
      observer(show: boolean) {
        if (show) {
          this.startAutoClose();
          return;
        }

        this.clearAutoClose();
        this.setData({
          visible: false,
        });
      },
    },
    message: {
      type: String,
      value: '',
    },
    type: {
      type: String,
      value: 'info',
    },
    duration: {
      type: Number,
      value: 2000,
    },
  },
  data: {
    visible: false,
  },
  lifetimes: {
    detached() {
      this.clearAutoClose();
    },
  },
  methods: {
    startAutoClose() {
      this.clearAutoClose();
      this.setData({
        visible: true,
      });
      const duration = this.data.duration || 2000;
      toastTimer = setTimeout(() => {
        this.setData({
          visible: false,
        });
        this.triggerEvent('close');
      }, duration) as unknown as number;
    },
    clearAutoClose() {
      if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = undefined;
      }
    },
  },
});
