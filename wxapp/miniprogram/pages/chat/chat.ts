import { iconPaths } from '../../config/icons';
import {
  fetchChatMessages,
  fetchChatSupportTarget,
  fetchChatUnreadCount,
  fetchMe,
  markChatConversationRead,
  openChatConversation,
  sendChatMessage,
  type AppChatConversation,
  type AppChatMessage,
} from '../../services/app';
import {
  fetchMerchantChatMessages,
  fetchMerchantChatUnreadCount,
  fetchMerchantChats,
  markMerchantChatRead,
  sendMerchantChatMessage,
  type MerchantChatConversation,
  type MerchantChatMessage,
} from '../../services/merchant';
import { buildPageTopStyle } from '../../utils/page-layout';
import { getAuthUserRole } from '../../services/token';
import { navigateBackOrHome, navigateBackOrMerchantHome } from '../../utils/auth-route';
import { upload } from '../../services/request';

const PAGE_SIZE = 30;

type ChatRole = 'buyer' | 'merchant';

type ChatConversationView = (AppChatConversation | MerchantChatConversation) & {
  displayName: string;
  displayAvatar: string;
  displaySubtitle: string;
  displayScene: string;
  displayTime: string;
};

type ChatMessageView = (AppChatMessage | MerchantChatMessage) & {
  displayTime: string;
  showTime: boolean;
};

const TIME_NODE_GAP_MS = 5 * 60 * 1000;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function parseDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeDecodeText(value?: string) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function buildSceneText(sceneLabel?: string, sceneSource?: string) {
  const label = safeDecodeText(sceneLabel);
  const source = safeDecodeText(sceneSource);
  if (label && source) {
    return `${label} · ${source}`;
  }
  return label || source || '在线客服';
}

function normalizeMessageTimeline(messages: Array<AppChatMessage | MerchantChatMessage>): ChatMessageView[] {
  const sorted = [...messages].sort((a, b) => {
    const left = parseDateTime(a.createdAt)?.getTime() ?? 0;
    const right = parseDateTime(b.createdAt)?.getTime() ?? 0;
    return left - right;
  });

  return sorted.map((message, index) => {
    const currentTime = parseDateTime(message.createdAt)?.getTime() ?? 0;
    const previousTime = index > 0 ? parseDateTime(sorted[index - 1].createdAt)?.getTime() ?? 0 : 0;
    return {
      ...message,
      displayTime: formatDateTime(message.createdAt),
      showTime: index === 0 || currentTime - previousTime >= TIME_NODE_GAP_MS,
    };
  });
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    role: 'buyer' as ChatRole,
    conversations: [] as ChatConversationView[],
    activeConversationId: 0,
    activeConversation: null as ChatConversationView | null,
    conversationTitle: '联系客服',
    conversationSubtitle: '在线客服',
    conversationAvatar: iconPaths.defaultAvatar,
    currentUserAvatar: iconPaths.defaultAvatar,
    currentUserName: '我',
    messages: [] as ChatMessageView[],
    loading: true,
    loadingConversations: false,
    loadingMessages: false,
    sending: false,
    messageText: '',
    page: 1,
    hasMore: true,
    unreadCount: 0,
    pageHint: '正在打开客服会话…',
    messageAnchorId: 'chat-bottom',
    isReadingHistory: false,
    lastMessageScrollTop: 0,
    merchantId: 0,
    productId: 0,
    orderNo: '',
    sceneType: '',
    sceneLabel: '',
    sceneSource: '',
    requestedConversationId: 0,
    requestedOrderNo: '',
  },

  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(4),
      });
      (this as any).pollTimer = null;
      (this as any).ignoreNextMessageScroll = false;
    },
    detached() {
      this.stopPolling();
    },
  },

  pageLifetimes: {
    show() {
      if (this.data.role === 'merchant') {
        if (this.data.activeConversationId > 0) {
          this.startPolling();
          void this.refreshUnreadCount();
          return;
        }
        void this.loadMerchantConversations();
        return;
      }

      if (this.data.activeConversationId > 0) {
        this.startPolling();
        void this.refreshUnreadCount();
        return;
      }

      void this.bootstrapBuyerConversation();
    },
    hide() {
      this.stopPolling();
    },
  },

  methods: {
    onLoad(options: { merchantId?: string; productId?: string; orderNo?: string; conversationId?: string; sceneType?: string; sceneLabel?: string; sceneSource?: string }) {
      const role = getAuthUserRole() === 'MERCHANT' ? 'merchant' : 'buyer';
      this.setData({
        role,
        merchantId: Number(options?.merchantId ?? 0),
        productId: Number(options?.productId ?? 0),
        orderNo: safeDecodeText(options?.orderNo),
        requestedConversationId: Number(options?.conversationId ?? 0),
        requestedOrderNo: safeDecodeText(options?.orderNo),
        sceneType: String(options?.sceneType ?? '').trim().toUpperCase(),
        sceneLabel: safeDecodeText(options?.sceneLabel),
        sceneSource: safeDecodeText(options?.sceneSource),
      });
      void this.loadCurrentUserProfile();
    },

    async loadCurrentUserProfile() {
      try {
        const me = await fetchMe();
        this.setData({
          currentUserAvatar: me.profile?.avatarUrl || me.user.avatarUrl || iconPaths.defaultAvatar,
          currentUserName: me.profile?.nickname || me.user.nickname || '我',
        });
      } catch {
        this.setData({
          currentUserAvatar: iconPaths.defaultAvatar,
          currentUserName: '我',
        });
      }
    },

    normalizeConversation(
      conversation: AppChatConversation | MerchantChatConversation,
      role: ChatRole,
    ): ChatConversationView {
      const counterpartName = role === 'merchant' ? conversation.buyerName : conversation.merchantName;
      const counterpartAvatar = role === 'merchant' ? conversation.buyerAvatar : conversation.merchantLogo;
      const sceneLabel = safeDecodeText(conversation.sceneLabel);
      const sceneSource = safeDecodeText(conversation.sceneSource);
      const displayScene = buildSceneText(sceneLabel, sceneSource);

      return {
        ...conversation,
        displayName: counterpartName || displayScene,
        displayAvatar: counterpartAvatar || iconPaths.defaultAvatar,
        displaySubtitle: displayScene,
        displayScene,
        displayTime: formatDateTime(conversation.lastMessageAt),
      };
    },

    async loadMerchantConversations() {
      this.setData({
        loading: true,
        loadingConversations: true,
        pageHint: '正在加载会话列表…',
      });

      try {
        const conversations = await fetchMerchantChats();
        const normalized = (conversations || []).map((conversation) => this.normalizeConversation(conversation, 'merchant'));
        this.setData({
          conversations: normalized,
          activeConversationId: 0,
          activeConversation: null,
          conversationTitle: '会话列表',
          conversationSubtitle: '商户客服会话',
          conversationAvatar: iconPaths.defaultAvatar,
          loading: false,
          loadingConversations: false,
          pageHint: normalized.length ? '' : '暂无会话',
        });

        void this.refreshUnreadCount();

        if (this.data.requestedConversationId > 0) {
          const target = normalized.find((item) => item.conversationId === this.data.requestedConversationId);
          if (target) {
            await this.openConversation(target);
          }
          this.setData({ requestedConversationId: 0 });
        } else if (this.data.requestedOrderNo) {
          const target = normalized.find((item) => item.orderNo === this.data.requestedOrderNo);
          if (target) {
            await this.openConversation(target);
          }
          this.setData({ requestedOrderNo: '' });
        }
      } catch (error) {
        console.error('Failed to load merchant conversations:', error);
        this.setData({
          conversations: [],
          loading: false,
          loadingConversations: false,
          pageHint: '会话列表加载失败，请稍后重试',
        });
      }
    },

    async bootstrapBuyerConversation() {
      this.setData({
        loading: true,
        pageHint: '正在打开客服会话…',
      });

      try {
        if (this.data.role === 'merchant') {
          await this.loadMerchantConversations();
          return;
        }

        const target =
          this.data.merchantId > 0
            ? {
                merchantId: this.data.merchantId,
                merchantName: '',
                merchantLogo: '',
                hotline: '',
                source: 'CONFIGURED' as const,
                sceneType: 'GENERAL' as const,
                sceneLabel: '',
                sceneSource: '',
              }
            : await fetchChatSupportTarget();

        const sceneType = (this.data.sceneType || target.sceneType || (this.data.orderNo ? 'ORDER' : this.data.productId > 0 ? 'PRODUCT' : 'GENERAL')) as
          | 'GENERAL'
          | 'PRODUCT'
          | 'ORDER'
          | 'OFFICIAL';
        const opened = await openChatConversation({
          merchantId: sceneType === 'OFFICIAL' ? undefined : target.merchantId,
          productId: this.data.productId > 0 ? this.data.productId : undefined,
          orderNo: this.data.orderNo || undefined,
          sceneType,
          sceneLabel: this.data.sceneLabel || target.sceneLabel || undefined,
          sceneSource: this.data.sceneSource || target.sceneSource || undefined,
        });

        const conversation = this.normalizeConversation(opened, 'buyer');
        this.setData({
          activeConversationId: conversation.conversationId,
          activeConversation: conversation,
          conversationTitle: conversation.displayName,
          conversationSubtitle: conversation.displaySubtitle,
          conversationAvatar: conversation.displayAvatar || iconPaths.defaultAvatar,
          loading: false,
          pageHint: '',
          page: 1,
          hasMore: true,
          messages: [],
          isReadingHistory: false,
          lastMessageScrollTop: 0,
        });

        await this.loadMessages(conversation.conversationId, true);
        await this.refreshUnreadCount();
        this.startPolling();
      } catch (error) {
        console.error('Failed to open chat conversation:', error);
        this.setData({
          loading: false,
          pageHint: '客服暂时不可用，请稍后重试',
        });
        this.stopPolling();
      }
    },

    async openConversation(conversation: ChatConversationView) {
      this.stopPolling();
      this.setData({
        activeConversationId: conversation.conversationId,
        activeConversation: conversation,
        conversationTitle: conversation.displayName,
        conversationSubtitle: conversation.displaySubtitle,
        conversationAvatar: conversation.displayAvatar || iconPaths.defaultAvatar,
        messages: [],
        loading: false,
        loadingMessages: true,
        page: 1,
        hasMore: true,
        pageHint: '',
        isReadingHistory: false,
        lastMessageScrollTop: 0,
      });

      await this.loadMessages(conversation.conversationId, true);
      await this.refreshUnreadCount();
      this.startPolling();
    },

    async loadMessages(conversationId: number, reset = false, pageOverride?: number) {
      if (!conversationId) {
        return;
      }

      const currentPage = pageOverride ?? (reset ? 1 : this.data.page);

      if (reset) {
        this.setData({
          page: 1,
          hasMore: true,
          messages: [],
        });
      }

      this.setData({
        loadingMessages: true,
      });

      try {
        const loader = this.data.role === 'merchant' ? fetchMerchantChatMessages : fetchChatMessages;
        const response = await loader(conversationId, {
          page: currentPage,
          pageSize: PAGE_SIZE,
        });

        const items = (response.items ?? []).map((message) => ({
          ...message,
          displayTime: formatDateTime(message.createdAt),
          showTime: false,
        }));

        const normalizedItems = normalizeMessageTimeline(items);

        this.setData({
          messages: reset ? normalizedItems : normalizeMessageTimeline([...items, ...this.data.messages]),
          hasMore: (response.total ?? 0) > currentPage * PAGE_SIZE,
        });

        if (reset) {
          void this.markRead(conversationId);
          this.scrollToLatest();
        }
      } finally {
        this.setData({
          loadingMessages: false,
        });
      }
    },

    async markRead(conversationId: number) {
      try {
        if (this.data.role === 'merchant') {
          await markMerchantChatRead(conversationId);
        } else {
          await markChatConversationRead(conversationId);
        }

        await this.refreshUnreadCount();
      } catch {
        // Ignore read sync failures.
      }
    },

    async refreshUnreadCount() {
      try {
        const unread =
          this.data.role === 'merchant'
            ? await fetchMerchantChatUnreadCount()
            : await fetchChatUnreadCount();

        this.setData({
          unreadCount: unread.unreadCount ?? 0,
        });
      } catch {
        // Ignore unread sync failures.
      }
    },

    onInput(e: WechatMiniprogram.Input) {
      this.setData({
        messageText: e.detail.value,
      });
    },

    async sendMessage() {
      const conversationId = this.data.activeConversationId;
      const content = this.data.messageText.trim();
      if (!conversationId || !content || this.data.sending) {
        return;
      }

      this.setData({
        sending: true,
      });

      try {
        const sender = this.data.role === 'merchant' ? sendMerchantChatMessage : sendChatMessage;
        const message = await sender(conversationId, {
          content,
          contentType: 'TEXT',
        });

        this.setData({
          messageText: '',
          messages: normalizeMessageTimeline([...this.data.messages, { ...message, displayTime: formatDateTime(message.createdAt), showTime: false }]),
          isReadingHistory: false,
          lastMessageScrollTop: 0,
        });

        await this.refreshUnreadCount();
        this.scrollToLatest();
      } finally {
        this.setData({
          sending: false,
        });
      }
    },

    async chooseAndSendImage() {
      const conversationId = this.data.activeConversationId;
      if (!conversationId || this.data.sending) {
        return;
      }

      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const tempFilePath = res.tempFiles[0]?.tempFilePath;
          if (!tempFilePath) {
            return;
          }

          wx.showLoading({ title: '正在发送图片…', mask: true });
          this.setData({ sending: true });

          try {
            const uploaded = await upload<{ url: string }>({
              url: '/files/upload',
              filePath: tempFilePath,
              name: 'file',
            });

            const imageUrl = uploaded?.url;
            if (!imageUrl) {
              throw new Error('Upload failed');
            }

            const sender = this.data.role === 'merchant' ? sendMerchantChatMessage : sendChatMessage;
            const message = await sender(conversationId, {
              content: '[图片]',
              contentType: 'IMAGE',
              attachments: {
                imageUrl,
              },
            });

            this.setData({
              messages: normalizeMessageTimeline([...this.data.messages, { ...message, displayTime: formatDateTime(message.createdAt), showTime: false }]),
              isReadingHistory: false,
              lastMessageScrollTop: 0,
            });

            await this.refreshUnreadCount();
            this.scrollToLatest();
          } catch (error) {
            console.error('Failed to send image:', error);
            wx.showToast({ title: '图片发送失败', icon: 'none' });
          } finally {
            wx.hideLoading();
            this.setData({ sending: false });
          }
        },
      });
    },

    async loadMore() {
      if (!this.data.activeConversationId || !this.data.hasMore || this.data.loadingMessages) {
        return;
      }

      const nextPage = this.data.page + 1;
      this.setData({
        page: nextPage,
      });
      await this.loadMessages(this.data.activeConversationId, false, nextPage);
    },

    scrollToLatest() {
      (this as any).ignoreNextMessageScroll = true;
      this.setData({
        messageAnchorId: `chat-bottom-${Date.now()}`,
      });
    },

    onMessageScroll(e: WechatMiniprogram.ScrollViewScroll) {
      if ((this as any).ignoreNextMessageScroll) {
        (this as any).ignoreNextMessageScroll = false;
        return;
      }

      const scrollTop = Number(e.detail?.scrollTop ?? 0);
      const lastScrollTop = this.data.lastMessageScrollTop;

      this.setData({
        lastMessageScrollTop: scrollTop,
      });

      if (scrollTop < lastScrollTop && scrollTop > 20 && !this.data.isReadingHistory) {
        this.setData({
          isReadingHistory: true,
        });
      }
    },

    onMessageScrollToLower() {
      this.setData({
        isReadingHistory: false,
      });
    },

    previewImage(e: WechatMiniprogram.BaseEvent) {
      const url = e.currentTarget.dataset.url;
      if (!url) {
        return;
      }

      wx.previewImage({
        urls: [url],
        current: url,
      });
    },

    async pollNewMessages() {
      const conversationId = this.data.activeConversationId;
      if (!conversationId || this.data.loadingMessages) {
        return;
      }

      const loader = this.data.role === 'merchant' ? fetchMerchantChatMessages : fetchChatMessages;

      try {
        const response = await loader(conversationId, {
          page: 1,
          pageSize: PAGE_SIZE,
        });

        const items = (response.items ?? []).map((message) => ({
          ...message,
          displayTime: formatDateTime(message.createdAt),
          showTime: false,
        }));
        const normalizedItems = normalizeMessageTimeline(items);
        if (!items.length) {
          return;
        }

        const currentMessages = this.data.messages;
        if (!currentMessages.length) {
          this.setData({
            messages: normalizedItems,
          });
          this.scrollToLatest();
          return;
        }

        const latestMessage = currentMessages[currentMessages.length - 1];
        const latestIdx = items.findIndex((item) => item.messageId === latestMessage.messageId);
        if (latestIdx === -1) {
          return;
        }

        const newMessages = normalizedItems.slice(latestIdx + 1);
        if (newMessages.length > 0) {
          this.setData({
            messages: normalizeMessageTimeline([...currentMessages, ...newMessages]),
          });
          void this.markRead(conversationId);
          if (!this.data.isReadingHistory) {
            this.scrollToLatest();
          }
        }
      } catch (error) {
        console.error('Polling failed:', error);
      }
    },

    startPolling() {
      this.stopPolling();
      (this as any).pollTimer = setInterval(() => {
        void this.pollNewMessages();
      }, 4000);
    },

    stopPolling() {
      if ((this as any).pollTimer) {
        clearInterval((this as any).pollTimer);
        (this as any).pollTimer = null;
      }
    },

    goBack() {
      if (this.data.role === 'merchant') {
        if (this.data.activeConversationId > 0) {
          this.stopPolling();
          this.setData({
            activeConversationId: 0,
            activeConversation: null,
            conversationTitle: '会话列表',
            conversationSubtitle: '商户客服会话',
            conversationAvatar: iconPaths.defaultAvatar,
            messages: [],
            page: 1,
            hasMore: true,
          });
          return;
        }

        navigateBackOrMerchantHome();
        return;
      }

      navigateBackOrHome();
    },

    async selectConversation(e: WechatMiniprogram.BaseEvent) {
      const conversationId = Number((e.currentTarget.dataset as { conversationId?: number }).conversationId ?? 0);
      if (!conversationId) {
        return;
      }

      const conversation = this.data.conversations.find((item) => item.conversationId === conversationId);
      if (!conversation) {
        return;
      }

      await this.openConversation(conversation);
    },

    async onPullDownRefresh() {
      if (this.data.role === 'merchant') {
        if (this.data.activeConversationId > 0) {
          await this.loadMessages(this.data.activeConversationId, true);
          await this.refreshUnreadCount();
        } else {
          await this.loadMerchantConversations();
        }
      } else if (this.data.activeConversationId > 0) {
        await this.loadMessages(this.data.activeConversationId, true);
        await this.refreshUnreadCount();
      } else {
        await this.bootstrapBuyerConversation();
      }

      wx.stopPullDownRefresh();
    },
  },
});
