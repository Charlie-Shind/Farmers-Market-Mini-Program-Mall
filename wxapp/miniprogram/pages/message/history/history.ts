import { ensureCustomerAccess } from '../../../utils/auth-route';

function decodeParam(value?: string): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** 历史中间层已废弃：列表 → 详情 两层即可，兼容旧链接做转发 */
Component({
  methods: {
    onLoad(options: { type?: string; typeLabel?: string; receiptId?: string }) {
      const type = decodeParam(options?.type);
      const receiptId = Number(options?.receiptId || 0);

      if (
        !ensureCustomerAccess(
          `/pages/message/history/history?type=${encodeURIComponent(type)}&typeLabel=${encodeURIComponent(decodeParam(options?.typeLabel))}`,
        )
      ) {
        return;
      }

      if (receiptId > 0) {
        wx.redirectTo({
          url: `/pages/message/view/view?receiptId=${receiptId}`,
        });
        return;
      }

      const query = type ? `?type=${encodeURIComponent(type)}` : '';
      wx.redirectTo({
        url: `/pages/message/message${query}`,
      });
    },
  },
});
