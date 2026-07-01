<template>
  <div class="chat-admin-page">
    <StatGrid :cards="statsCards" />

    <section class="chat-admin-layout">
      <article class="panel chat-list-panel">
        <div class="panel-head">
          <div>
            <h2>客服会话列表</h2>
            <p>平台管理员只读查看商户与官方客服会话，支持按场景检索。</p>
          </div>
          <div class="chat-filters">
            <input v-model.trim="keyword" type="text" placeholder="搜索买家 / 商户 / 场景" @keyup.enter="loadConversations" />
            <select v-model="sceneType" @change="loadConversations">
              <option value="">全部场景</option>
              <option value="GENERAL">通用</option>
              <option value="PRODUCT">商品详情</option>
              <option value="ORDER">订单</option>
              <option value="OFFICIAL">官方客服</option>
            </select>
            <button class="ghost-btn" type="button" @click="loadConversations" :disabled="loadingConversations">刷新</button>
          </div>
        </div>

        <div class="chat-support-banner" :class="{ 'is-ready': Boolean(supportTarget) }">
          <div>
            <strong>平台客服</strong>
            <p>{{ supportTarget ? `已绑定 ${supportTarget.merchantName || '平台客服商户'}，可直接回复官方会话` : '未配置平台客服商户，官方会话暂不可用' }}</p>
          </div>
          <button class="ghost-btn" type="button" @click="sceneType = 'OFFICIAL'; loadConversations()">只看官方</button>
        </div>

        <div v-if="conversations.length" class="chat-list">
          <button
            v-for="item in conversations"
            :key="item.conversationId"
            type="button"
            class="chat-item"
            :class="{ active: item.conversationId === activeConversationId }"
            @click="openConversation(item.conversationId)"
          >
            <img class="chat-item__avatar" :src="item.merchantLogo || item.buyerAvatar || defaultAvatar" alt="" />
            <div class="chat-item__body">
              <div class="chat-item__top">
                <strong>{{ item.displayName }}</strong>
                <span>{{ item.displayTime }}</span>
              </div>
              <div class="chat-item__scene">{{ item.displayScene }}</div>
              <div class="chat-item__meta">
                <span>商户：{{ item.merchantName }}</span>
                <span>买家：{{ item.buyerName }}</span>
              </div>
              <div class="chat-item__preview">{{ item.lastMessageContent || '暂无消息' }}</div>
            </div>
            <span v-if="item.unreadCount > 0" class="chat-item__badge">{{ item.unreadCount }}</span>
          </button>
        </div>

        <div v-else class="empty-state compact">
          <strong>{{ loadingConversations ? '加载中…' : '暂无会话' }}</strong>
          <span>平台客服会话会按场景和最新消息自动排序。</span>
        </div>
      </article>

      <article class="panel chat-detail-panel">
        <div v-if="activeConversation" class="chat-detail">
          <div class="chat-detail__header">
            <div class="chat-detail__title">
              <h2>{{ activeConversation.displayName }}</h2>
              <p>{{ activeConversation.displayScene }}</p>
            </div>
            <div class="chat-detail__tags">
              <span class="tag">商户 ID {{ activeConversation.merchantId }}</span>
              <span class="tag">买家 ID {{ activeConversation.buyerId }}</span>
              <span class="tag">场景 {{ activeConversation.sceneLabel }}</span>
            </div>
          </div>

          <div class="chat-detail__info">
            <div><span>商户</span><strong>{{ activeConversation.merchantName }}</strong></div>
            <div><span>买家</span><strong>{{ activeConversation.buyerName }}</strong></div>
            <div><span>商品</span><strong>{{ activeConversation.productTitle || '-' }}</strong></div>
            <div><span>订单</span><strong>{{ activeConversation.orderNo || '-' }}</strong></div>
            <div><span>场景来源</span><strong>{{ activeConversation.sceneSource || '-' }}</strong></div>
            <div><span>最后消息</span><strong>{{ activeConversation.lastMessageAt }}</strong></div>
          </div>

          <div class="chat-detail__timeline">
            <div
              v-for="message in messages"
              :key="message.messageId"
              class="chat-message"
              :class="message.senderRole === 'MERCHANT' ? 'is-merchant' : 'is-buyer'"
            >
              <div class="chat-message__bubble">
                <div class="chat-message__meta">
                  <strong>{{ message.senderRole === 'MERCHANT' ? activeConversation.merchantName : activeConversation.buyerName }}</strong>
                  <span>{{ message.displayTime }}</span>
                </div>
                <div v-if="message.contentType === 'IMAGE' && message.attachments && message.attachments.imageUrl" class="chat-message__image-wrap">
                  <img :src="String(message.attachments.imageUrl)" class="chat-message__image" alt="" />
                </div>
                <div v-else class="chat-message__text">{{ message.content }}</div>
              </div>
            </div>

            <div v-if="!messages.length" class="empty-state compact">
              <strong>{{ loadingMessages ? '加载消息中…' : '暂无消息' }}</strong>
              <span>选中会话后可查看完整消息记录。</span>
            </div>
          </div>

          <div v-if="canReply" class="chat-composer">
            <div class="chat-composer__head">
              <strong>平台客服回复</strong>
              <span>当前会话会以平台客服商户身份回复给买家</span>
            </div>
            <textarea
              v-model.trim="replyText"
              class="chat-composer__input"
              rows="4"
              placeholder="输入回复内容后点击发送"
              @keyup.ctrl.enter="sendReply"
            />
            <div class="chat-composer__actions">
              <span class="chat-composer__hint">Ctrl + Enter 发送</span>
              <button class="ghost-btn" type="button" :disabled="sendingReply || !replyText.trim()" @click="sendReply">
                {{ sendingReply ? '发送中…' : '发送回复' }}
              </button>
            </div>
          </div>

          <div v-else class="chat-composer chat-composer--readonly">
            <strong>只读会话</strong>
            <span>当前不是平台官方客服会话，暂不支持后台直接回复。</span>
          </div>
        </div>

        <div v-else class="empty-state compact chat-detail-empty">
          <strong>{{ loadingConversations ? '加载中…' : '请选择一个会话' }}</strong>
          <span>右侧会展示该会话的消息记录和场景上下文。</span>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  getChatConversation,
  getChatConversationMessages,
  getChatConversations,
  getChatSupportTarget,
  sendChatConversationMessage,
} from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';

const route = useRoute();
const router = useRouter();
const defaultAvatar = 'https://placehold.co/96x96?text=%E5%AE%A2';

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

const conversations = ref<any[]>([]);
const conversationTotal = ref(0);
const activeConversationId = ref<number>(Number(route.query.conversationId ?? 0) || 0);
const activeConversation = ref<any | null>(null);
const messages = ref<any[]>([]);
const loadingConversations = ref(false);
const loadingMessages = ref(false);
const replyText = ref('');
const sendingReply = ref(false);
const supportTarget = ref<any | null>(null);
const keyword = ref(String(route.query.q ?? ''));
const sceneType = ref(String(route.query.sceneType ?? ''));
let unregisterRefresh: (() => void) | null = null;

const canReply = computed(() => activeConversation.value?.sceneType === 'OFFICIAL');

const statsCards = computed(() => {
  const official = conversations.value.filter((item) => item.sceneType === 'OFFICIAL').length;
  const product = conversations.value.filter((item) => item.sceneType === 'PRODUCT').length;
  const order = conversations.value.filter((item) => item.sceneType === 'ORDER').length;

  return [
    { title: '会话总数', value: conversationTotal.value.toLocaleString(), note: '当前会话统计总量' },
    { title: '官方客服', value: official.toLocaleString(), note: '小程序官方客服入口' },
    { title: '商品场景', value: product.toLocaleString(), note: '来自商品详情的咨询' },
    { title: '订单场景', value: order.toLocaleString(), note: '来自订单详情的咨询' },
  ];
});

function formatTime(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return raw || '-';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizeConversation(item: any) {
  return {
    ...item,
    displayName: item.merchantName || item.buyerName || '会话',
    displayScene: [item.sceneLabel, item.sceneSource].filter(Boolean).join(' · ') || '在线客服',
    displayTime: formatTime(item.lastMessageAt),
  };
}

async function loadConversations() {
  loadingConversations.value = true;
  try {
    if (!supportTarget.value) {
      supportTarget.value = await getChatSupportTarget().catch(() => null);
    }
    const response = await getChatConversations({
      page: 1,
      pageSize: 50,
      keyword: keyword.value,
      sceneType: sceneType.value,
    });
    conversationTotal.value = response.total ?? 0;
    conversations.value = (response.items || []).map(normalizeConversation);

    if (!activeConversationId.value && conversations.value.length) {
      await openConversation(conversations.value[0].conversationId);
      return;
    }

    if (activeConversationId.value) {
      const exists = conversations.value.find((item) => item.conversationId === activeConversationId.value);
      if (!exists && conversations.value.length) {
        await openConversation(conversations.value[0].conversationId);
      }
    }
  } finally {
    loadingConversations.value = false;
  }
}

async function openConversation(conversationId: number) {
  activeConversationId.value = conversationId;
  replyText.value = '';
  const conversation = conversations.value.find((item) => item.conversationId === conversationId) || null;
  activeConversation.value = conversation || (await getChatConversation(conversationId).then(normalizeConversation).catch(() => null));
  messages.value = [];
  await loadMessages(conversationId);
  await router.replace({
    path: route.path,
    query: {
      ...route.query,
      conversationId: String(conversationId),
    },
  });
}

async function loadMessages(conversationId: number) {
  loadingMessages.value = true;
  try {
    const response = await getChatConversationMessages(conversationId, { page: 1, pageSize: 100 });
    messages.value = (response.items || []).map((item) => ({
      ...item,
      displayTime: formatTime(item.createdAt),
    }));
  } finally {
    loadingMessages.value = false;
  }
}

async function sendReply() {
  const conversationId = activeConversationId.value;
  const content = replyText.value.trim();

  if (!conversationId || !content || sendingReply.value || !canReply.value) {
    return;
  }

  sendingReply.value = true;
  try {
    const message = await sendChatConversationMessage(conversationId, {
      content,
      contentType: 'TEXT',
    });

    messages.value = [
      ...messages.value,
      {
        ...message,
        displayTime: formatTime(message.createdAt),
      },
    ];
    replyText.value = '';
    await loadConversations();
  } finally {
    sendingReply.value = false;
  }
}

watch(
  () => route.query.conversationId,
  (value) => {
    const nextId = Number(value ?? 0) || 0;
    if (nextId && nextId !== activeConversationId.value) {
      void openConversation(nextId);
    }
  },
);

onMounted(async () => {
  supportTarget.value = await getChatSupportTarget().catch(() => null);
  await loadConversations();

  if (refreshApi) {
    unregisterRefresh = refreshApi.register(() => loadConversations());
  }
});

onBeforeUnmount(() => {
  unregisterRefresh?.();
  unregisterRefresh = null;
});
</script>
