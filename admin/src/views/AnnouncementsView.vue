<template>
  <div class="page-stack">
    <!-- Top Statistics Grid -->
    <StatGrid :cards="statsCards" />

    <!-- Main Section with Two Columns -->
    <div class="announcement-dashboard">
      <!-- Left: Announcement Timeline Feed -->
      <section class="announcements-feed-container">
        <div class="section-header">
          <div>
            <h2 class="section-title">发布历史与推送记录</h2>
            <p class="section-desc">展示当前系统内已发布的所有公告、活动或订单消息，支持条件筛选及撤回操作。</p>
          </div>
          <div class="feed-filters">
            <select v-model="filterType" class="filter-select">
              <option value="">所有分类</option>
              <option value="NOTICE">公告 (NOTICE)</option>
              <option value="SYSTEM">系统 (SYSTEM)</option>
              <option value="ACTIVITY">活动 (ACTIVITY)</option>
              <option value="ORDER">订单 (ORDER)</option>
            </select>
          </div>
        </div>

        <div v-if="actionError" class="panel-banner warn">
          <strong>操作失败</strong>
          <span>{{ actionError }}</span>
        </div>

        <div v-if="actionMessage" class="panel-banner success">
          <strong>操作结果</strong>
          <span>{{ actionMessage }}</span>
        </div>

        <!-- Cards List -->
        <div v-if="loading" class="cards-skeleton">
          <div v-for="i in 3" :key="i" class="card-skeleton-item">
            <div class="skeleton-image"></div>
            <div class="skeleton-content">
              <div class="skeleton-line title"></div>
              <div class="skeleton-line text"></div>
              <div class="skeleton-line meta"></div>
            </div>
          </div>
        </div>

        <div v-else-if="filteredMessages.length" class="announcements-card-flow">
          <article
            v-for="msg in filteredMessages"
            :key="msg.id"
            class="announcement-feed-card"
          >
            <!-- Card Thumbnail / Icon -->
            <div class="card-image-area">
              <img
                v-if="msg.coverImageUrl"
                :src="msg.coverImageUrl"
                :alt="msg.title"
                class="card-cover-img"
              />
              <div v-else :class="['card-cover-placeholder', msg.type.toLowerCase()]">
                <el-icon class="placeholder-icon">
                  <component :is="typeIconComponent(msg.type)" />
                </el-icon>
                <span class="placeholder-tag">{{ typeText(msg.type) }}</span>
              </div>
            </div>

            <!-- Card Body Content -->
            <div class="card-body-content">
              <div class="card-title-row">
                <span :class="['type-badge', msg.type.toLowerCase()]">
                  {{ typeText(msg.type) }}
                </span>
                <h3 class="card-title">{{ msg.title }}</h3>
              </div>

              <p class="card-summary">{{ msg.summary }}</p>

              <div class="card-meta-row">
                <div class="audience-indicators">
                  <span :class="['target-badge', targetTypeKey(msg)]">
                    {{ targetTypeText(msg) }}
                  </span>
                  <span v-if="msg.targetRoleCode" class="role-indicator">
                    角色: {{ msg.targetRoleCode === 'USER' ? '消费者' : '商户' }}
                  </span>
                  <span v-if="msg.targetUserIds && msg.targetUserIds.length" class="ids-indicator" :title="msg.targetUserIds.join(', ')">
                    定向共 {{ msg.targetUserIds.length }} 人
                  </span>
                </div>

                <time class="publish-time" :datetime="msg.publishAt || msg.createdAt">
                  发布于: {{ formatDate(msg.publishAt || msg.createdAt) }}
                </time>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="card-action-bar">
              <button
                type="button"
                class="action-btn-secondary"
                @click="openPreview(msg)"
              >
                <span>👁</span> 预览
              </button>
              <button
                type="button"
                class="action-btn-danger"
                @click="confirmDelete(msg)"
              >
                <span>🗑</span> 撤回
              </button>
            </div>
          </article>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state compact">
          <strong>暂无公告记录</strong>
          <span>当前列表没有公告。可以使用右侧的“发布新公告”功能向用户推送公告。</span>
        </div>
      </section>

      <!-- Right: Operational panel -->
      <aside class="operational-sidebar">
        <div class="ops-card">
          <div class="ops-header">
            <el-icon class="ops-header-icon"><Bell /></el-icon>
            <div>
              <h3>发布与推送台</h3>
              <p>向平台全体用户、特定角色或指定账号实时投递系统业务消息或营销通告。</p>
            </div>
          </div>

          <div class="ops-body">
            <button
              type="button"
              class="launch-btn"
              @click="openCreateModal"
              style="background: #000000"
            >
              + 发布新公告
            </button>

            <div class="helper-tips">
              <h4 class="section-inline-title">
                <el-icon><Tickets /></el-icon>
                <span>推送说明</span>
              </h4>
              <ul>
                <li><strong>全员广播</strong>: 消息将向平台上的所有小程序用户分发，在用户消息中心直接呈现。</li>
                <li><strong>按角色推送</strong>: 可指定只推送给 <code>消费者 (USER)</code> 或 <code>商户 (MERCHANT)</code>，方便开展定向运营。</li>
                <li><strong>指定用户投递</strong>: 支持通过昵称 / 手机号搜索并勾选收件人，避免手填 ID 出错。</li>
                <li><strong>图片与跳转</strong>: 支持上传配图，并能配置小程序内部跳转路由，引导用户前往特定的商品、活动页面。</li>
              </ul>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Create Announcement Modal (Glassmorphism Overlay) -->
    <div v-if="createModalOpen" class="action-modal" @click.self="closeCreateModal">
      <section class="action-card action-card--wide" role="dialog" aria-modal="true" aria-label="发布新公告">
        <header class="action-card__head">
          <div>
            <h3>发布新公告</h3>
            <p>填报标题、主正文和发布条件。发送后立即生效，可在小程序端即时拉取。</p>
          </div>
          <button type="button" class="close-x-btn" @click="closeCreateModal">
            <el-icon><Close /></el-icon>
          </button>
        </header>

        <div class="action-card__body">
          <form class="banner-modal-form" @submit.prevent="submitAnnouncement">
            <div class="form-grid announcement-form-grid">
              
              <!-- Left side of form (General Info) -->
              <div class="form-column">
                <label class="form-field">
                  <span>公告分类 <span class="required">*</span></span>
                  <select v-model="form.type">
                    <option value="NOTICE">公告 (NOTICE)</option>
                    <option value="SYSTEM">系统 (SYSTEM)</option>
                    <option value="ACTIVITY">活动 (ACTIVITY)</option>
                    <option value="ORDER">订单 (ORDER)</option>
                  </select>
                </label>

                <label class="form-field">
                  <span>公告标题 <span class="required">*</span></span>
                  <input
                    v-model.trim="form.title"
                    type="text"
                    placeholder="如：端午特惠活动开启公告"
                    maxlength="50"
                    required
                  />
                </label>

                <label class="form-field">
                  <span>公告摘要 <span class="required">*</span></span>
                  <input
                    v-model.trim="form.summary"
                    type="text"
                    placeholder="简单一句话，展示在列表预览中"
                    maxlength="120"
                    required
                  />
                </label>

                <label class="form-field">
                  <span>详情正文内容 (Markdown / 文字第一段) <span class="required">*</span></span>
                  <textarea
                    v-model.trim="form.textBlock"
                    rows="6"
                    placeholder="详情页的正文文本，支持输入换行..."
                    required
                  ></textarea>
                </label>
              </div>

              <!-- Right side of form (Targeting & Media) -->
              <div class="form-column">
                <label class="form-field">
                  <span>发送范围 <span class="required">*</span></span>
                  <select v-model="form.targetType">
                    <option value="ALL">全员广播 (Broadcast)</option>
                    <option value="ROLE_USER">定向: 消费者 (USER)</option>
                    <option value="ROLE_MERCHANT">定向: 商户 (MERCHANT)</option>
                    <option value="SPECIFIC">定向: 指定用户</option>
                  </select>
                </label>

                <label v-if="form.targetType === 'SPECIFIC'" class="form-field animated-field">
                  <span>搜索收件人 <span class="required">*</span></span>
                  <div class="target-picker">
                    <div class="target-picker__search">
                      <input
                        v-model.trim="recipientSearch.keyword"
                        type="text"
                        placeholder="输入昵称 / 手机号搜索用户"
                        @keyup.enter="searchRecipients"
                      />
                      <button type="button" class="uploader-select-btn" :disabled="recipientSearch.loading" @click="searchRecipients">
                        {{ recipientSearch.loading ? '搜索中...' : '搜索用户' }}
                      </button>
                    </div>
                    <small class="form-help">从搜索结果中点选收件人，系统自动汇总用户 ID。</small>
                    <div v-if="recipientSearch.results.length" class="recipient-results">
                      <button
                        v-for="user in recipientSearch.results"
                        :key="user.id"
                        type="button"
                        class="recipient-result"
                        :class="{ selected: selectedRecipients.some((item) => item.id === user.id) }"
                        @click="toggleRecipient(user)"
                      >
                        <strong>{{ user.nickname || '未命名用户' }}</strong>
                        <span>{{ user.mobile || '未绑定手机' }} · #{{ user.id }}</span>
                      </button>
                    </div>
                    <div v-if="selectedRecipients.length" class="selected-recipient-wrap">
                      <div class="selected-recipient-head">
                        <strong>已选收件人</strong>
                        <button type="button" class="text-btn" @click="clearRecipients">清空</button>
                      </div>
                      <div class="selected-recipient-list">
                        <span v-for="user in selectedRecipients" :key="user.id" class="selected-recipient-chip">
                          {{ user.nickname || '未命名用户' }} · #{{ user.id }}
                          <button type="button" @click="removeRecipient(user.id)">
                            <el-icon><Close /></el-icon>
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>
                </label>

                <!-- Cover Image upload section -->
                <div class="form-field">
                  <span>详情配图地址 (可选)</span>
                  <div class="uploader-widget">
                    <div class="uploader-input-row">
                      <input
                        v-model.trim="form.coverImageUrl"
                        type="url"
                        placeholder="请输入配图图片 URL 或在右侧上传"
                      />
                      <button
                        type="button"
                        class="uploader-select-btn"
                        :disabled="imageUploading"
                        @click="triggerFileInput"
                      >
                        {{ imageUploading ? '上传中...' : '选择本地图片' }}
                      </button>
                    </div>
                    <input
                      ref="fileInputRef"
                      type="file"
                      accept="image/*"
                      style="display: none"
                      @change="handleFileChange"
                    />
                    <!-- Image Preview Area inside uploader -->
                    <div v-if="form.coverImageUrl" class="uploader-preview-box">
                      <img :src="form.coverImageUrl" alt="上传配图预览" />
                      <button type="button" class="remove-preview-btn" @click="form.coverImageUrl = ''">移除</button>
                    </div>
                  </div>
                </div>

                <div class="two-col-fields">
                  <label class="form-field">
                    <span>关联小程序页面链接 (可选)</span>
                    <input
                      v-model.trim="form.linkUrl"
                      type="text"
                      placeholder="如: /pages/merchant/products"
                    />
                  </label>

                  <label class="form-field">
                    <span>链接按钮文本 (可选)</span>
                    <input
                      v-model.trim="form.linkLabel"
                      type="text"
                      placeholder="如: 去商品列表查看"
                    />
                  </label>
                </div>
              </div>
            </div>

            <!-- Error message banner in modal -->
            <div v-if="modalError" class="modal-error-banner">
              <el-icon><WarningFilled /></el-icon>
              <span>{{ modalError }}</span>
            </div>
          </form>
        </div>

        <footer class="action-card__foot">
          <button type="button" class="ghost-btn" @click="closeCreateModal">取消</button>
          <button
            type="button"
            class="primary-btn submit-btn"
            :disabled="saving || imageUploading"
            @click="submitAnnouncement"
          >
            {{ saving ? '正在发布...' : '确认发布生效' }}
          </button>
        </footer>
      </section>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteModal.open" class="action-modal" @click.self="closeDeleteModal">
      <section class="action-card action-card--narrow" role="dialog" aria-modal="true" aria-label="确认撤回公告">
        <header class="action-card__head">
          <div>
            <h3>确认撤回公告</h3>
            <p>撤回后所有目标用户将无法在其收件箱中查看公告「{{ deleteModal.title }}」</p>
          </div>
          <button type="button" class="text-btn" @click="closeDeleteModal">关闭</button>
        </header>
        <div class="action-card__body">
          <p class="form-help" style="color: var(--danger); margin: 0;">
            此操作为高危操作，撤回后不可恢复。
          </p>
        </div>
        <footer class="action-card__foot">
          <button type="button" class="ghost-btn" @click="closeDeleteModal">取消</button>
          <button type="button" class="primary-btn danger-btn" @click="executeDelete">
            确认撤回
          </button>
        </footer>
      </section>
    </div>

    <!-- Announcement Preview -->
    <div v-if="previewOpen && previewMessage" class="action-modal" @click.self="closePreview">
      <section class="action-card action-card--wide" role="dialog" aria-modal="true" aria-label="公告内容预览">
        <header class="action-card__head">
          <div>
            <h3>公告预览</h3>
            <p>只展示用户实际看到的内容，不展示后台配置项。</p>
          </div>
          <button type="button" class="text-btn" @click="closePreview">关闭</button>
        </header>

        <div class="action-card__body preview-panel">
          <article class="preview-message-card">
            <div class="preview-message-meta">
              <span :class="['type-tag', previewMessage.type.toLowerCase()]">{{ typeText(previewMessage.type) }}</span>
              <time>{{ formatDate(previewMessage.publishAt || previewMessage.createdAt) }}</time>
            </div>
            <h1 class="preview-message-title">{{ previewMessage.title }}</h1>
            <p v-if="previewMessage.summary" class="preview-message-summary">{{ previewMessage.summary }}</p>

            <div v-if="previewMessage.coverImageUrl" class="preview-message-cover">
              <img :src="previewMessage.coverImageUrl" :alt="previewMessage.title" />
            </div>

            <div class="preview-message-body">
              <template v-for="(block, index) in previewBlocks(previewMessage)" :key="index">
                <p v-if="block.type === 'text'" class="preview-message-paragraph">
                  {{ block.value }}
                </p>
                <div v-else-if="block.type === 'image' && block.url" class="preview-inline-image">
                  <img :src="block.url" :alt="block.alt || previewMessage.title" />
                </div>
              </template>
            </div>

            <div v-if="previewLink(previewMessage)" class="preview-message-link">
              <span class="preview-link-label">
                <el-icon><Link /></el-icon>
                <span>{{ previewLink(previewMessage)?.label || '点击查看详情' }}</span>
              </span>
              <span class="preview-link-path">{{ previewLink(previewMessage)?.url }}</span>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  Bell,
  Box,
  Close,
  Notification,
  Present,
  Setting,
  Tickets,
  WarningFilled,
} from '@element-plus/icons-vue';

import {
  getAdminMessages,
  deleteAdminMessage,
  getUsers,
  sendAdminMessage,
  broadcastAdminMessage,
  uploadFile,
} from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

// Define Message types
interface ContentJson {
  blocks?: Array<{ type: 'text' | 'image'; value?: string; url?: string; alt?: string }>;
  preview?: string;
  link?: {
    label: string;
    url: string;
    type: string;
  };
}

interface AdminMessage {
  id: number;
  type: 'NOTICE' | 'SYSTEM' | 'ACTIVITY' | 'ORDER';
  title: string;
  summary: string;
  contentJson: ContentJson;
  coverImageUrl?: string;
  broadcast: boolean;
  targetRoleCode?: string | null;
  targetUserIds?: number[] | null;
  publishAt?: string;
  createdAt: string;
}

interface RecipientUser {
  id: number;
  nickname: string;
  mobile: string;
}

const route = useRoute();

// UI States
const loading = ref(false);
const saving = ref(false);
const imageUploading = ref(false);
const createModalOpen = ref(false);
const previewOpen = ref(false);

const actionError = ref('');
const actionMessage = ref('');
const modalError = ref('');

// Messages Store
const messages = ref<AdminMessage[]>([]);
const total = ref(0);

// Filtering
const filterType = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

// Create form fields
const form = reactive({
  type: 'NOTICE' as 'NOTICE' | 'SYSTEM' | 'ACTIVITY' | 'ORDER',
  title: '',
  summary: '',
  textBlock: '',
  coverImageUrl: '',
  targetType: 'ALL' as 'ALL' | 'ROLE_USER' | 'ROLE_MERCHANT' | 'SPECIFIC',
  linkUrl: '',
  linkLabel: '',
});

const recipientSearch = reactive({
  keyword: '',
  loading: false,
  results: [] as RecipientUser[],
});
const selectedRecipients = ref<RecipientUser[]>([]);

// Delete confirmation modal
const deleteModal = reactive({
  open: false,
  title: '',
  message: null as AdminMessage | null,
});

function openDeleteModal(msg: AdminMessage) {
  deleteModal.open = true;
  deleteModal.title = msg.title;
  deleteModal.message = msg;
}

function closeDeleteModal() {
  deleteModal.open = false;
  deleteModal.message = null;
}

async function executeDelete() {
  const msg = deleteModal.message;
  if (!msg) return;
  actionError.value = '';
  actionMessage.value = '';
  try {
    await deleteAdminMessage(msg.id);
    actionMessage.value = `公告「${msg.title}」已成功删除并在小程序端撤销`;
    deleteModal.open = false;
    deleteModal.message = null;
    await loadMessages();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除失败';
  }
}

// Preview Target
const previewMessage = ref<AdminMessage | null>(null);

// Watch for topbar search parameter
const queryKeyword = computed(() => String(route.query.q ?? ''));

watch(queryKeyword, () => {
  void loadMessages();
});

onMounted(() => {
  void loadMessages();
  if (refreshApi) {
    const unregister = refreshApi.register(() => loadMessages());
    onBeforeUnmount(() => unregister());
  }
});

// Computed Properties for Statistics Cards
const statsCards = computed(() => {
  const allCount = messages.value.length;
  const broadcastCount = messages.value.filter(m => m.broadcast).length;
  const roleTargeted = messages.value.filter(m => m.targetRoleCode != null).length;
  const specificTargeted = messages.value.filter(m => m.targetUserIds && m.targetUserIds.length).length;

  return [
    {
      title: '总发布公告数',
      value: allCount.toLocaleString(),
      note: '包含全员及定向投递',
    },
    {
      title: '全员广播公告',
      value: broadcastCount.toLocaleString(),
      note: broadcastCount > 0
        ? '<span class="mini-ok">广播已生效</span>'
        : '<span class="mini-muted">暂无投递</span>',
    },
    {
      title: '特定角色推送',
      value: roleTargeted.toLocaleString(),
      note: roleTargeted > 0
        ? '<span class="mini-warn">定向商家/用户</span>'
        : '<span class="mini-muted">暂无定向推送</span>',
    },
    {
      title: '指定 ID 推送',
      value: specificTargeted.toLocaleString(),
      note: specificTargeted > 0
        ? '<span class="mini-danger">点对点投递</span>'
        : '<span class="mini-muted">暂无点对点投递</span>',
    },
  ];
});

// Filters client-side on type, while server-side handles keyword
const filteredMessages = computed(() => {
  return messages.value.filter(msg => {
    if (filterType.value && msg.type !== filterType.value) {
      return false;
    }
    return true;
  });
});

// Functions
async function loadMessages() {
  loading.value = true;
  actionError.value = '';
  try {
    const res = await getAdminMessages({
      keyword: queryKeyword.value,
      page: 1,
      pageSize: 100, // Load initial set of announcements
    });
    messages.value = res.items;
    total.value = res.total;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '获取公告列表失败';
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  form.type = 'NOTICE';
  form.title = '';
  form.summary = '';
  form.textBlock = '';
  form.coverImageUrl = '';
  form.targetType = 'ALL';
  form.linkUrl = '';
  form.linkLabel = '';
  recipientSearch.keyword = '';
  recipientSearch.results = [];
  selectedRecipients.value = [];
  modalError.value = '';
  createModalOpen.value = true;
}

function closeCreateModal() {
  createModalOpen.value = false;
}

function isSelectedRecipient(id: number) {
  return selectedRecipients.value.some((item) => item.id === id);
}

function toggleRecipient(user: RecipientUser) {
  if (isSelectedRecipient(user.id)) {
    selectedRecipients.value = selectedRecipients.value.filter((item) => item.id !== user.id);
    return;
  }

  selectedRecipients.value = [...selectedRecipients.value, user];
}

function removeRecipient(userId: number) {
  selectedRecipients.value = selectedRecipients.value.filter((item) => item.id !== userId);
}

function clearRecipients() {
  selectedRecipients.value = [];
}

async function searchRecipients() {
  if (recipientSearch.loading) {
    return;
  }

  recipientSearch.loading = true;
  modalError.value = '';
  try {
    const res = await getUsers({
      keyword: recipientSearch.keyword.trim(),
      page: 1,
      pageSize: 8,
    });
    recipientSearch.results = (res.items ?? []).map((item: any) => ({
      id: Number(item.id),
      nickname: String(item.nickname ?? ''),
      mobile: String(item.mobile ?? ''),
    }));
  } catch (error) {
    modalError.value = error instanceof Error ? error.message : '搜索用户失败';
  } finally {
    recipientSearch.loading = false;
  }
}

function openPreview(msg: AdminMessage) {
  previewMessage.value = msg;
  previewOpen.value = true;
}

function closePreview() {
  previewOpen.value = false;
  previewMessage.value = null;
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    modalError.value = '只能上传图片文件';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    modalError.value = '图片大小不能超过 5MB';
    return;
  }

  imageUploading.value = true;
  modalError.value = '';
  try {
    const res = await uploadFile(file);
    form.coverImageUrl = res.url;
    actionMessage.value = '封面图上传成功';
    setTimeout(() => { actionMessage.value = ''; }, 3000);
  } catch (error) {
    modalError.value = error instanceof Error ? error.message : '上传失败，请重试';
  } finally {
    imageUploading.value = false;
    target.value = '';
  }
}

async function submitAnnouncement() {
  if (saving.value) return;

  // Form Validation
  if (!form.title.trim() || !form.summary.trim() || !form.textBlock.trim()) {
    modalError.value = '请填写标题、摘要和正文';
    return;
  }

  saving.value = true;
  modalError.value = '';
  actionError.value = '';
  actionMessage.value = '';

  const blocks: any[] = [
    { type: 'text', value: form.textBlock.trim() }
  ];

  if (form.coverImageUrl.trim()) {
    blocks.push({
      type: 'image' as const,
      url: form.coverImageUrl.trim(),
      alt: form.title.trim()
    });
  }

  const payload: Record<string, any> = {
    type: form.type,
    title: form.title.trim(),
    summary: form.summary.trim(),
    contentJson: {
      blocks,
      preview: form.summary.trim(),
      ...(form.linkUrl.trim() ? {
        link: {
          label: form.linkLabel.trim() || '去看看',
          url: form.linkUrl.trim(),
          type: form.type.toLowerCase(),
        }
      } : {})
    },
    coverImageUrl: form.coverImageUrl.trim() || undefined,
  };

  try {
    if (form.targetType === 'ALL') {
      payload.broadcast = true;
      await broadcastAdminMessage(payload);
    } else if (form.targetType === 'ROLE_USER') {
      payload.broadcast = false;
      payload.targetRoleCode = 'USER';
      await sendAdminMessage(payload);
    } else if (form.targetType === 'ROLE_MERCHANT') {
      payload.broadcast = false;
      payload.targetRoleCode = 'MERCHANT';
      await sendAdminMessage(payload);
    } else if (form.targetType === 'SPECIFIC') {
      const ids = selectedRecipients.value.map((item) => Number(item.id)).filter((item) => Number.isFinite(item) && item > 0);
      if (ids.length === 0) {
        throw new Error('请先搜索并选择至少一位收件人');
      }
      payload.targetUserIds = ids;
      payload.broadcast = false;
      await sendAdminMessage(payload);
    }

    actionMessage.value = `公告消息「${payload.title}」已成功推送`;
    createModalOpen.value = false;
    await loadMessages();
  } catch (error) {
    modalError.value = error instanceof Error ? error.message : '发送失败';
  } finally {
    saving.value = false;
  }
}

function confirmDelete(msg: AdminMessage) {
  openDeleteModal(msg);
}

// Helpers
function typeIconComponent(type: string) {
  const map: Record<string, any> = {
    NOTICE: Bell,
    SYSTEM: Setting,
    ACTIVITY: Present,
    ORDER: Box,
  };
  return map[type] ?? Notification;
}

function typeText(type: string): string {
  const map: Record<string, string> = {
    NOTICE: '运营公告',
    SYSTEM: '系统公告',
    ACTIVITY: '活动公告',
    ORDER: '交易订单',
  };
  return map[type] ?? type;
}

function targetTypeKey(msg: AdminMessage): string {
  if (msg.broadcast) return 'all';
  if (msg.targetRoleCode) return 'role';
  return 'specific';
}

function targetTypeText(msg: AdminMessage): string {
  if (msg.broadcast) return '全员广播';
  if (msg.targetRoleCode) return `角色: ${msg.targetRoleCode === 'USER' ? '消费者' : '商户'}`;
  return '定向: 指定用户';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

function previewTextBlocks(msg: AdminMessage | null): string[] {
  return previewBlocks(msg)
    .filter((block) => block.type === 'text' && block.value)
    .map((block) => block.value as string);
}

function previewBlocks(msg: AdminMessage | null): Array<{ type: 'text' | 'image'; value?: string; url?: string; alt?: string }> {
  if (!msg) return [];
  return msg.contentJson?.blocks ?? [];
}

function previewLink(msg: AdminMessage | null) {
  if (!msg) return null;
  return msg.contentJson?.link ?? null;
}
</script>

<style scoped>
/* Scoped custom styling to wow the user (Organic Agriculture Premium Admin Palette) */

.announcement-dashboard {
  display: grid;
  grid-template-columns: 1.7fr 0.8fr;
  gap: 24px;
  margin-top: 18px;
  align-items: start;
}

@media (max-width: 1024px) {
  .announcement-dashboard {
    grid-template-columns: 1fr;
  }
}

/* Timeline/Card Stream styles */
.announcements-feed-container {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 19px;
  color: var(--green);
}

.section-desc {
  margin: 6px 0 0 0;
  font-size: 13px;
  color: var(--muted);
}

.feed-filters .filter-select {
  height: 38px;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0 16px;
  background: #ffffff;
  font-weight: 700;
  color: var(--green);
}

/* Custom Premium Cards */
.announcements-card-flow {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.announcement-feed-card {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
  padding: 20px;
  background: #fbfaf7;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.announcement-feed-card:hover {
  transform: translateY(-4px);
  background: #ffffff;
  border-color: var(--green-2);
  box-shadow: 0 12px 28px rgba(17, 17, 17, 0.06);
}

/* Card image / thumbnail */
.card-image-area {
  width: 140px;
  height: 94px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: linear-gradient(135deg, #ffffff, #f7f7f7);
  border: 1px solid rgba(17, 17, 17, 0.06);
}

.card-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.announcement-feed-card:hover .card-cover-img {
  transform: scale(1.08);
}

.card-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.card-cover-placeholder.notice { background: linear-gradient(135deg, #ffffff, #f3f3f3); }
.card-cover-placeholder.system { background: linear-gradient(135deg, #ffffff, #f3f3f3); }
.card-cover-placeholder.activity { background: linear-gradient(135deg, #ffffff, #f3f3f3); }
.card-cover-placeholder.order { background: linear-gradient(135deg, #ffffff, #f3f3f3); }

.placeholder-icon {
  font-size: 24px;
}

.placeholder-tag {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.72;
}

/* Card details */
.card-body-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 999px;
  text-transform: uppercase;
}

.type-badge.notice { background: var(--gold-soft); color: var(--warn); }
.type-badge.system { background: var(--danger-soft); color: var(--danger); }
.type-badge.activity { background: var(--green-soft); color: var(--green); }
.type-badge.order { background: var(--blue-soft); color: var(--blue); }

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-summary {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.audience-indicators {
  display: flex;
  align-items: center;
  gap: 8px;
}

.target-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 6px;
}

.target-badge.all { background: #f5f5f5; border: 1px solid var(--line); color: #111111; }
.target-badge.role { background: #f5f5f5; border: 1px solid var(--line); color: #111111; }
.target-badge.specific { background: #f5f5f5; border: 1px solid var(--line); color: #111111; }

.role-indicator, .ids-indicator {
  font-size: 11px;
  color: var(--muted);
  background: #f0ede5;
  padding: 2px 6px;
  border-radius: 4px;
}

.publish-time {
  font-size: 12px;
  color: var(--muted);
}

/* Card Actions */
.card-action-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  padding-left: 12px;
  border-left: 1px dashed var(--line);
}

.action-btn-secondary,
.action-btn-danger {
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.action-btn-secondary {
  background: #f0ede5;
  border: 1px solid var(--line);
  color: var(--green);
}

.action-btn-secondary:hover {
  background: var(--green-soft);
  color: var(--green-2);
  transform: translateX(-2px);
}

.action-btn-danger {
  background: #fff;
  border: 1px solid rgba(17, 17, 17, 0.16);
  color: var(--danger);
}

.action-btn-danger:hover {
  background: var(--danger-soft);
  color: #a0281b;
  transform: translateX(-2px);
  box-shadow: 0 4px 12px rgba(17, 17, 17, 0.06);
}

@media (max-width: 768px) {
  .announcement-feed-card {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .card-image-area {
    width: 100%;
    height: 120px;
  }
  .card-action-bar {
    flex-direction: row;
    border-left: 0;
    border-top: 1px dashed var(--line);
    padding-left: 0;
    padding-top: 12px;
    justify-content: flex-end;
  }
}

/* Sidebar Operations Panel Styles */
.operational-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ops-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow);
}

.ops-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.ops-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #f7f7f7, #ffffff);
  color: #111111;
  font-size: 20px;
  flex: 0 0 auto;
}

.section-inline-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px 0;
}

.ops-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--green);
}

.ops-header p {
  margin: 6px 0 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

.launch-btn {
  width: 100%;
  height: 46px;
  background: linear-gradient(135deg, var(--green), var(--green-2));
  color: #fff;
  border-radius: 999px;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.5px;
  box-shadow: 0 8px 20px rgba(17, 17, 17, 0.12);
  transition: all 0.25s;
}

.launch-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(44, 74, 57, 0.18);
}

.helper-tips {
  margin-top: 24px;
  border-top: 1px solid var(--line);
  padding-top: 20px;
}

.helper-tips h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: var(--text);
  font-weight: 800;
}

.helper-tips ul {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.helper-tips li code {
  background: #f3ede0;
  padding: 1px 4px;
  border-radius: 4px;
  color: var(--warn);
}

/* 弹窗 — 使用全局 overlays.css，不在此覆盖 */

.close-x-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  transition: all 0.2s;
  background: #f0ede5;
  color: var(--muted);
  border: none;
}

.close-x-btn:hover {
  background: var(--danger-soft);
  color: var(--danger);
  transform: rotate(90deg);
}

.announcement-form-grid {
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .announcement-form-grid {
    grid-template-columns: 1fr;
  }
}

.form-column {
  display: grid;
  gap: 16px;
}

.required {
  color: var(--danger);
}

.animated-field {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* File uploading widget custom */
.uploader-widget {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.uploader-input-row {
  display: flex;
  gap: 8px;
}

.uploader-input-row input {
  flex: 1;
}

.uploader-select-btn {
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  background: #f0ede5;
  border: 1px solid var(--line);
  color: var(--green);
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
}

.uploader-select-btn:hover:not(:disabled) {
  background: var(--green-soft);
  border-color: var(--green-2);
}

.target-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.target-picker__search {
  display: flex;
  gap: 8px;
  align-items: center;
}

.target-picker__search input {
  flex: 1;
  height: 38px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #fff;
}

.recipient-results {
  display: grid;
  gap: 8px;
  max-height: 220px;
  overflow: auto;
  padding-right: 4px;
}

.recipient-result {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.18s ease;
}

.recipient-result:hover {
  border-color: var(--green-2);
  transform: translateY(-1px);
}

.recipient-result.selected {
  border-color: var(--green-2);
  box-shadow: 0 0 0 1px rgba(17, 17, 17, 0.12);
  background: rgba(17, 17, 17, 0.04);
}

.selected-recipient-wrap {
  padding: 12px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  border-radius: 14px;
  background: rgba(17, 17, 17, 0.03);
}

.selected-recipient-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.selected-recipient-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-recipient-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(17, 17, 17, 0.14);
  font-size: 12px;
}

.selected-recipient-chip button {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: none;
  background: rgba(17, 17, 17, 0.06);
  color: #111111;
  display: grid;
  place-items: center;
  padding: 0;
}

.uploader-preview-box {
  position: relative;
  width: 100%;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
  display: block;
}

.uploader-preview-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-preview-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(17, 17, 17, 0.88);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

.remove-preview-btn:hover {
  background: #c84b3a;
}

.two-col-fields {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 12px;
}

.modal-error-banner {
  margin-top: 14px;
  padding: 10px 14px;
  background: var(--danger-soft);
  color: var(--danger);
  border-radius: 10px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.submit-btn {
  box-shadow: 0 8px 20px rgba(17, 17, 17, 0.12);
  color: #ffffff !important;
}

.submit-btn:hover:not(:disabled) {
  color: #ffffff !important;
}

/* Skeleton Loading screen animation */
.cards-skeleton {
  display: grid;
  gap: 16px;
}

.card-skeleton-item {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #fff;
}

.skeleton-image {
  height: 94px;
  background: #f0ede5;
  border-radius: 10px;
  animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.skeleton-line {
  background: #f0ede5;
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-line.title {
  height: 18px;
  width: 40%;
}

.skeleton-line.text {
  height: 14px;
  width: 80%;
}

.skeleton-line.meta {
  height: 12px;
  width: 25%;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

/* Wechat Mobile Device Simulator Styles */
.mobile-preview-device {
  width: 360px;
  height: 720px;
  border-radius: 44px;
  background: #111;
  border: 12px solid #222;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  color: #333;
}

.mobile-status-bar {
  height: 26px;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  font-size: 11px;
  font-weight: 700;
  border-bottom: 1px solid #f0f0f0;
}

.mobile-nav-bar {
  height: 48px;
  background: #ffffff;
  display: grid;
  grid-template-columns: 60px 1fr 60px;
  align-items: center;
  border-bottom: 1px solid #e5e5e5;
  padding: 0 10px;
}

.mobile-nav-bar .back-btn {
  font-size: 14px;
  font-weight: 700;
  color: #111;
  text-align: left;
}

.mobile-nav-bar .nav-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  text-align: center;
  color: #111;
}

.mobile-nav-bar .more-options {
  font-size: 13px;
  color: #999;
  text-align: right;
  letter-spacing: 1px;
}

.mobile-screen-body {
  flex: 1;
  background: #f7f7f7;
  overflow-y: auto;
  padding: 14px;
}

.message-detail-app-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.msg-detail-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.msg-detail-header .type-tag {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}

.msg-detail-header .type-tag.notice { background: var(--gold-soft); color: var(--warn); }
.msg-detail-header .type-tag.system { background: var(--danger-soft); color: var(--danger); }
.msg-detail-header .type-tag.activity { background: var(--green-soft); color: var(--green); }
.msg-detail-header .type-tag.order { background: var(--blue-soft); color: var(--blue); }

.msg-detail-title {
  font-size: 18px;
  font-weight: 800;
  margin: 0;
  line-height: 1.4;
  color: #111;
}

.msg-detail-time {
  font-size: 11px;
  color: #999;
}

.msg-detail-banner-wrap {
  width: 100%;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 14px;
  border: 1px solid #f0f0f0;
}

.msg-detail-banner-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.msg-detail-content-blocks {
  margin-bottom: 20px;
}

.preview-inline-image {
  margin: 12px 0 8px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(17, 17, 17, 0.12);
  background: #ffffff;
}

.preview-inline-image img {
  display: block;
  width: 100%;
  max-height: 180px;
  object-fit: cover;
}

.preview-panel {
  padding-top: 6px;
}

.preview-message-card {
  max-width: 760px;
  margin: 0 auto;
  padding: 24px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%);
  box-shadow: 0 18px 40px rgba(17, 17, 17, 0.06);
}

.preview-message-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 12px;
}

.preview-message-title {
  margin: 0 0 10px 0;
  font-size: 24px;
  line-height: 1.35;
  color: var(--green);
}

.preview-message-summary {
  margin: 0 0 16px 0;
  color: #5b665f;
  font-size: 14px;
  line-height: 1.7;
}

.preview-message-body {
  color: #333;
  font-size: 15px;
  line-height: 1.8;
}

.preview-message-paragraph {
  margin: 0 0 12px 0;
  white-space: pre-wrap;
}

.preview-message-link {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(17, 17, 17, 0.04);
  border: 1px solid rgba(17, 17, 17, 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-link-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--green);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.preview-link-path {
  font-size: 12px;
  color: var(--muted);
  word-break: break-all;
}

.cta-banner {
  background: var(--green-soft);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cta-icon {
  font-size: 16px;
}

.cta-label {
  flex: 1;
  margin-left: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--green);
}

.cta-arrow {
  color: var(--green);
  font-size: 16px;
}

.cta-meta-path {
  font-size: 9px;
  color: #999;
  text-align: right;
  word-break: break-all;
}

.mobile-device-footer {
  height: 24px;
  background: #ffffff;
  display: grid;
  place-items: center;
  border-top: 1px solid #f0f0f0;
}

.device-home-indicator {
  width: 120px;
  height: 5px;
  background: #ccc;
  border-radius: 10px;
}
</style>
