import { getIconSvg, recordIconUsage, type IconName } from '../../../shared/icons/index';
import { resolveProjectColor } from '../../../shared/project-colors';

Component({
  properties: {
    name: {
      type: String,
      value: '',
    },
    size: {
      type: String,
      value: '48rpx',
    },
    color: {
      type: String,
      value: '#333333',
    },
    strokeWidth: {
      type: Number,
      value: 2,
    },
    opacity: {
      type: Number,
      value: 1,
    },
  },
  data: {
    dataUri: '',
    wrapStyle: '',
  },
  observers: {
    'name,color,strokeWidth,opacity,size': function () {
      this.refresh();
    },
  },
  lifetimes: {
    attached(): void {
      this.refresh();
    },
  },
  methods: {
    refresh(): void {
      const { name, color, strokeWidth, opacity, size } = this.data as {
        name: string;
        color: string;
        strokeWidth: number;
        opacity: number;
        size: string;
      };

      if (!name) {
        this.setData({ dataUri: '', wrapStyle: `width: ${size}; height: ${size}; opacity: ${opacity};` });
        return;
      }

      const resolvedColor = resolveProjectColor(color);
      const svg = getIconSvg(name as IconName)
        .replace(/currentColor/g, resolvedColor)
        .replace(/stroke-width="2"/g, `stroke-width="${strokeWidth}"`);

      const bytes = new Uint8Array(svg.length);
      for (let i = 0; i < svg.length; i++) {
        bytes[i] = svg.charCodeAt(i) & 0xff;
      }
      const base64 = wx.arrayBufferToBase64(bytes.buffer);
      const dataUri = 'data:image/svg+xml;base64,' + base64;

      this.setData({
        dataUri,
        wrapStyle: `width: ${size}; height: ${size}; opacity: ${opacity};`,
      });
      recordIconUsage(name as IconName);
    },
  },
});
