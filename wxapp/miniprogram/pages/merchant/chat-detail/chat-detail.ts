import { buildPageTopStyle } from '../../../utils/page-layout';
import {
  fetchMerchantChatMessages,
  sendMerchantChatMessage,
  markMerchantChatRead,
  type MerchantChatMessage,
} from '../../../services/merchant';

const TIME_NODE_GAP_MS = 5 * 60 * 1000;

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatTime(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw || '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function shouldShowTimeNode(prevCreatedAt: string | undefined, currCreatedAt: string): boolean {
  if (!prevCreatedAt) return true;
  const prev = new Date(prevCreatedAt).getTime();
  const curr = new Date(currCreatedAt).getTime();
  if (Number.isNaN(prev) || Number.isNaN(curr)) return true;
  return curr - prev >= TIME_NODE_GAP_MS;
}

interface ChatMessageItem {
  id: number;
  text: string;
  me: boolean;
  createdAt: string;
  displayTime: string;
  showTimeNode: boolean;
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    conversationId: 0,
    buyerName: '',
    buyerPhone: '',
    buyerWechat: '',
    orderInfo: '',
    orderNo: '',
    showContactSheet: false,
    showQuickReply: false,
    scrollToId: '',
    orderCard: {
      thumb: '',
      title: '',
      desc: '',
    },
    quickReplies: [] as string[],
    chatMessages: [] as ChatMessageItem[],
    inputMessage: '',
    page: 1,
    hasMore: true,
  },

  onLoad(options: any) {
    this.setData({ pageStyle: buildPageTopStyle(8) });
    if (options.conversationId) {
      this.setData({ conversationId: Number(options.conversationId) });
    }
    if (options.buyerName) this.setData({ buyerName: decodeURIComponent(options.buyerName) });
    if (options.orderNo) this.setData({ orderNo: decodeURIComponent(options.orderNo) });

    const productTitle = options.productTitle ? decodeURIComponent(options.productTitle) : '';
    const sceneLabel = options.sceneLabel ? decodeURIComponent(options.sceneLabel) : '';
    const orderNo = options.orderNo ? decodeURIComponent(options.orderNo) : '';

    // 构建副标题
    const infoParts: string[] = [];
    if (sceneLabel) infoParts.push(sceneLabel);
    if (productTitle) infoParts.push(productTitle);
    this.setData({ orderInfo: infoParts.join(' · ') || '暂无订单信息' });

    // 构建订单卡片
    if (orderNo || productTitle) {
      this.setData({
        orderCard: {
          thumb: 'invoice',
          title: productTitle || `订单 ${orderNo}`,
          desc: orderNo ? `订单号 ${orderNo}` : sceneLabel || '查看详情',
        },
      });
    }

    this.loadMessages();
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
  },

  async loadMessages() {
    const { conversationId } = this.data;
    if (conversationId) {
      try {
        const res = await fetchMerchantChatMessages(conversationId, { page: 1, pageSize: 50 });
        if (res && res.items) {
          const msgs = this.mapMessages(res.items);
          this.setData({ chatMessages: msgs, page: res.page, hasMore: res.page * res.pageSize < res.total });
          try { await markMerchantChatRead(conversationId); } catch { /* 静默 */ }
          return;
        }
      } catch { /* 后端未就绪 */ }
    }
    this.setData({ chatMessages: [] });
  },

  async loadMore() {
    const { conversationId, page, hasMore, chatMessages } = this.data;
    if (!conversationId || !hasMore) return;
    try {
      const res = await fetchMerchantChatMessages(conversationId, { page: (page as number) + 1, pageSize: 30 });
      if (res && res.items) {
        const more = this.mapMessages(res.items, (chatMessages as ChatMessageItem[]).slice(-1)[0]?.createdAt);
        this.setData({
          chatMessages: (chatMessages as ChatMessageItem[]).concat(more),
          page: res.page,
          hasMore: res.page * res.pageSize < res.total,
        });
      }
    } catch { /* 静默 */ }
  },

  mapMessages(items: MerchantChatMessage[], prevCreatedAt?: string): ChatMessageItem[] {
    let lastCreatedAt = prevCreatedAt;
    return items.map((m: MerchantChatMessage) => {
      const displayTime = formatTime(m.createdAt);
      const showTimeNode = shouldShowTimeNode(lastCreatedAt, m.createdAt);
      lastCreatedAt = m.createdAt;
      return {
        id: m.messageId,
        text: m.content,
        me: m.isMine,
        createdAt: m.createdAt,
        displayTime,
        showTimeNode,
      };
    });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/dashboard/dashboard' });
  },

  goOrderDetail() {
    const { orderNo } = this.data;
    wx.navigateTo({ url: `/pages/merchant/order-detail/order-detail?orderNo=${orderNo || ''}` });
  },

  openContactSheet() { this.setData({ showContactSheet: true }); },
  closeContactSheet() { this.setData({ showContactSheet: false }); },

  callBuyer() {
    wx.showToast({ title: '电话联系功能待接接口', icon: 'none' });
  },

  copyWechat() {
    wx.setClipboardData({ data: this.data.buyerWechat as string });
    wx.showToast({ title: '已复制微信号', icon: 'success' });
  },

  openQuickReply() { this.setData({ showQuickReply: true }); },
  closeQuickReply() { this.setData({ showQuickReply: false }); },

  insertQuickReply(e: any) {
    const text = e.currentTarget.dataset.text as string;
    this.setData({ inputMessage: text, showQuickReply: false });
  },

  onMessageInput(e: any) {
    this.setData({ inputMessage: e.detail.value });
  },

  async sendMessage() {
    if (!this.data.inputMessage) return;
    const text = this.data.inputMessage as string;
    const { conversationId, chatMessages } = this.data;

    if (conversationId) {
      try {
        const sent = await sendMerchantChatMessage(conversationId, { content: text, contentType: 'TEXT' });
        const msgs = (chatMessages as ChatMessageItem[]).slice();
        const lastCreatedAt = msgs.slice(-1)[0]?.createdAt;
        const now = new Date().toISOString();
        msgs.push({
          id: sent.messageId,
          text: sent.content,
          me: true,
          createdAt: now,
          displayTime: formatTime(now),
          showTimeNode: shouldShowTimeNode(lastCreatedAt, now),
        });
        this.setData({ chatMessages: msgs, inputMessage: '', scrollToId: 'msg-' + sent.messageId });
        return;
      } catch { /* fallback */ }
    }

    const msgs = (chatMessages as ChatMessageItem[]).slice();
    const localId = msgs.length + 1;
    const lastCreatedAt = msgs.slice(-1)[0]?.createdAt;
    const now = new Date().toISOString();
    msgs.push({
      id: localId,
      text,
      me: true,
      createdAt: now,
      displayTime: formatTime(now),
      showTimeNode: shouldShowTimeNode(lastCreatedAt, now),
    });
    this.setData({ chatMessages: msgs, inputMessage: '', scrollToId: 'msg-' + localId });
  },
});
