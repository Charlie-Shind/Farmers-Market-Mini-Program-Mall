<template>
  <div class="page-stack">
    <StatGrid :cards="summaryCards" />

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>{{ config.title }}</h2>
        </div>
        <div class="top-actions">
          <button type="button" class="text-btn" @click="handleSecondaryAction">{{ config.secondaryAction }}</button>
          <button type="button" class="primary-btn" @click="handlePrimaryAction">{{ config.primaryAction }}</button>
        </div>
      </div>

      <div class="batch-toolbar">
        <div>
          <strong>{{ visibleRows.length }} / {{ total }} 条记录</strong>
          <span>当前筛选：{{ searchSummary }}</span>
        </div>
        <div class="batch-actions">
          <RefreshDataButton :loading="loading" @refresh="handleReload" />
        </div>
      </div>

      <div v-if="filterDefs.length" class="filter-grid">
        <label v-for="filter in filterDefs" :key="filter.key" class="filter-field">
          <span>{{ filter.label }}</span>
          <select :value="activeFilterValues[filter.key] ?? ''" @change="handleFilterChange(filter.key, $event)">
            <option value="">全部{{ filter.label }}</option>
            <option v-for="option in filter.options" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <div class="filter-actions">
          <button type="button" class="ghost-btn" @click="resetFilters" :disabled="!hasAnyFilters">
            重置筛选
          </button>
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

      <div v-if="visibleRows.length" class="table-x">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="column in config.columns" :key="column.key">
                {{ column.label }}
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="row in visibleRows" :key="rowKey(row)">
              <td
                v-for="column in config.columns"
                :key="column.key"
                :data-label="column.label"
                :class="{ 'check-cell': column.key === 'actions' }"
              >
                <template v-if="column.key === 'actions'">
                  <div class="op-links">
                    <button
                      v-for="action in rowActions(row)"
                      :key="action.key"
                      type="button"
                      @click="handleRowAction(action.key, row)"
                    >
                      {{ action.label }}
                    </button>
                  </div>
                </template>
                <template v-else-if="column.key === 'orderNo' && resourceKey === 'orders'">
                  <RouterLink class="link-like" :to="`/orders/${row.orderNo}`">{{ row.orderNo }}</RouterLink>
                </template>
                <template v-else-if="column.key === 'nickname' && resourceKey === 'users'">
                  <div class="user-cell-meta">
                    <img v-if="row.avatarUrl" :src="row.avatarUrl" class="user-avatar-mini-img" />
                    <span v-else class="user-avatar-mini">{{ row.nickname ? row.nickname.charAt(0).toUpperCase() : 'U' }}</span>
                    <div class="user-cell-details">
                      <strong class="user-cell-name">{{ row.nickname || '-' }}</strong>
                      <span class="user-cell-badge" :class="isGuestUser(row) ? 'badge-gray' : getUserTierClass(row.orderCount)">
                        {{ isGuestUser(row) ? '游客' : getUserTierLabel(row.orderCount) }}
                      </span>
                    </div>
                  </div>
                </template>
                <template v-else-if="isStatusCell(column.key)">
                  <span :class="['status', statusClass(column.key, row)]">{{ formatCell(column.key, row) }}</span>
                </template>
                <template v-else-if="isProfileLink(column.key, row)">
                  <a class="link-like" href="javascript:void(0)" @click="handleProfileClick(column.key, row)">
                    {{ formatCell(column.key, row) }}
                  </a>
                </template>
                <template v-else>
                  {{ formatCell(column.key, row) }}
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state compact">
        <strong>暂无符合条件的数据</strong>
        <span>当前关键词或筛选条件下没有记录，试试清空筛选后重新查看。</span>
      </div>

      <div v-if="supportsPagination" class="pagination resource-pagination">
        <span>第 {{ currentPage }} / {{ totalPages }} 页 · 共 {{ total }} 条</span>
        <div class="pagination-actions">
          <button type="button" class="ghost-btn" @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1">
            上一页
          </button>
          <label class="pagination-jump">
            <span>跳到</span>
            <input
              v-model.number="pageInput"
              type="number"
              min="1"
              :max="totalPages"
              inputmode="numeric"
              @keyup.enter="goToPage(pageInput)"
            />
            <span>页</span>
          </label>
          <button type="button" class="ghost-btn" @click="goToPage(pageInput)">
            确定
          </button>
          <button type="button" class="ghost-btn" @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages">
            下一页
          </button>
        </div>
      </div>
    </section>

    <AdminDrawer
      :open="actionPanel.open"
      :title="actionPanel.title"
      :subtitle="actionPanel.description"
      :width="540"
      @close="closeActionPanel"
    >
      <div v-if="resourceKey === 'users' && actionPanel.title === '用户详情'" class="user-profile-card">
        <!-- 头部：头像与核心称谓 -->
        <div class="user-hero">
          <div class="user-avatar-badge">
            <img v-if="actionPanelRow && actionPanelRow.avatarUrl" :src="actionPanelRow.avatarUrl" class="user-avatar-img" />
            <span v-else class="avatar-char">{{ getAvatarChar(actionPanel.fields) }}</span>
            <span class="user-status-dot" :class="getUserStatusClass(actionPanel.fields)"></span>
          </div>
          <div class="user-meta-info" style="flex: 1;">
            <div class="user-name-group">
              <h3>{{ getFieldValue(actionPanel.fields, '用户昵称') }}</h3>
               <span class="role-tag" :class="actionPanelRow && isGuestUser(actionPanelRow) ? 'role-tag--guest' : 'role-tag--tier-1'">
                 {{ actionPanelRow && isGuestUser(actionPanelRow) ? '游客' : getUserTier(actionPanel.fields) }}
               </span>
            </div>
            <p class="user-phone">📞 {{ getFieldValue(actionPanel.fields, '手机号') || '未绑定手机号' }}</p>
          </div>
          <button type="button" class="mini-action-btn" @click="startEditUser">编辑资料</button>
        </div>

        <!-- 关键资产指标网格 -->
        <div class="user-assets-grid" style="margin-top: 16px;">
          <div class="asset-card point-asset">
            <span class="asset-label">农场积分</span>
            <div class="asset-val-wrap">
              <strong class="asset-value">{{ getFieldValue(actionPanel.fields, '积分') }}</strong>
              <span class="asset-unit">pts</span>
            </div>
            <button type="button" class="mini-action-btn" @click="openPointAdjustModal">调整积分</button>
          </div>
          <div class="asset-card order-asset">
            <span class="asset-label">累计订单</span>
            <div class="asset-val-wrap">
              <strong class="asset-value">{{ getFieldValue(actionPanel.fields, '订单数') }}</strong>
              <span class="asset-unit">单</span>
            </div>
            <button type="button" class="mini-action-btn" @click="openUserCouponIssueModal">发放优惠券</button>
          </div>
        </div>

        <!-- 用户生命周期及时间线 -->
        <div class="user-timeline-section" style="margin-top: 24px;">
          <h4>用户成长轨迹</h4>
          <div class="profile-timeline">
            <div class="timeline-item done">
              <el-icon class="timeline-dot"><Check /></el-icon>
              <div class="timeline-content">
                <strong>账户注册成功</strong>
                <p>完成手机号验证，成为农场新居民</p>
              </div>
            </div>
            <div class="timeline-item" :class="{ done: Number(getFieldValue(actionPanel.fields, '订单数')) > 0 }">
              <el-icon class="timeline-dot"><Promotion /></el-icon>
              <div class="timeline-content">
                <strong>首单初体验</strong>
                <p>认养或下单首份生态农产品</p>
              </div>
            </div>
            <div class="timeline-item" :class="{ done: Number(getFieldValue(actionPanel.fields, '积分')) >= 100 }">
              <el-icon class="timeline-dot"><Star /></el-icon>
              <div class="timeline-content">
                <strong>果熟蒂落 · 资深农友</strong>
                <p>累计获得 100+ 农场积分，解锁专属折扣</p>
              </div>
            </div>
            <div class="timeline-item done">
              <el-icon class="timeline-dot"><Clock /></el-icon>
              <div class="timeline-content">
                <strong>最近登录活跃</strong>
                <p>最后登录时间：{{ getFieldValue(actionPanel.fields, '最近登录') }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 危险操作管理 -->
        <div class="danger-zone-bar" style="margin-top: 28px; padding: 14px; border-radius: 14px; border: 1px solid var(--danger-soft); background: var(--danger-soft); display: flex; align-items: center; justify-content: space-between;">
          <div>
            <strong style="color: var(--danger); font-size: 13px; display: block;">危险操作区</strong>
            <span style="color: var(--muted); font-size: 11px;">注销该账户将永久清退其全部资产且无法恢复</span>
          </div>
          <button type="button" class="primary-btn danger-btn" style="height: 32px; padding: 0 12px; font-size: 12px;" @click="handleDeleteUser">注销账号</button>
        </div>
      </div>
      <div v-else-if="resourceKey === 'products' && actionPanel.title === '商品详情' && currentProductDetail" class="product-profile-card">
        <div v-if="isProductDetailLoading" class="loading-wrapper" style="text-align: center; padding: 40px 0;">
          <el-icon class="is-loading" style="font-size: 24px;"><Loading /></el-icon>
          <p style="margin-top: 8px; color: var(--muted); font-size: 13px;">正在加载商品详情...</p>
        </div>
        <div v-else>
          <!-- 头部：商品封面图与核心信息 -->
          <div class="product-hero-card">
            <img :src="currentProductDetail.coverUrl" class="product-cover-preview" />
            <div class="product-hero-info">
              <span class="product-category-badge">{{ currentProductDetail.categoryName }}</span>
              <h3 class="product-title-text">{{ currentProductDetail.title }}</h3>
              <p class="product-subtitle-text">{{ currentProductDetail.subtitle || '暂无副标题' }}</p>
              <div class="product-price-stock">
                <span class="price-val">¥{{ currentProductDetail.price || currentProductDetail.minPrice || '0.00' }}</span>
                <span class="stock-val">总库存: {{ currentProductDetail.stock }}</span>
              </div>
            </div>
          </div>

          <!-- 商品属性与标签 -->
          <div class="product-meta-section">
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">原产地:</span>
                <span class="meta-value">{{ currentProductDetail.originPlace || '-' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">品牌:</span>
                <span class="meta-value">{{ currentProductDetail.brand || '-' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">供应商:</span>
                <span class="meta-value">{{ currentProductDetail.supplierName || '-' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">上下架:</span>
                <span class="status-tag" :class="currentProductDetail.status === 'ON_SHELF' ? 'status-active' : 'status-inactive'">
                  {{ currentProductDetail.status === 'ON_SHELF' ? '已上架' : '已下架' }}
                </span>
              </div>
              <div class="meta-item">
                <span class="meta-label">拼团:</span>
                <span class="status-tag" :class="currentProductDetail.groupBuyConfig?.enabled ? 'status-active' : 'status-inactive'">
                  {{ currentProductDetail.groupBuyConfig?.enabled ? '已开启' : '已关闭' }}
                </span>
              </div>
            </div>

            <!-- 服务标签 -->
            <div class="service-tags-wrap" style="margin-top: 14px;">
              <span class="meta-label" style="display: block; margin-bottom: 6px;">服务保障:</span>
              <div class="service-tag-chips">
                <span v-for="tag in currentProductDetail.serviceTags" :key="tag.key" class="tag-chip">
                  {{ tag.title }}
                </span>
                <span v-if="!currentProductDetail.serviceTags || !currentProductDetail.serviceTags.length" class="empty-text">暂无服务保障</span>
              </div>
            </div>

            <div v-if="currentProductDetail.groupBuyConfig" class="group-buy-summary">
              <span class="meta-label" style="display: block; margin-bottom: 6px;">拼团配置:</span>
              <div class="group-buy-summary__grid">
                <div class="group-buy-summary__item">
                  <span class="group-buy-summary__label">成团人数</span>
                  <strong>{{ currentProductDetail.groupBuyConfig.needed }}</strong>
                </div>
                <div class="group-buy-summary__item">
                  <span class="group-buy-summary__label">有效时长</span>
                  <strong>{{ currentProductDetail.groupBuyConfig.expireHours }} 小时</strong>
                </div>
                <div class="group-buy-summary__item">
                  <span class="group-buy-summary__label">拼团折扣</span>
                  <strong>{{ Math.round(Number(currentProductDetail.groupBuyConfig.discountRate || 0) * 100) }}%</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- 规格明细 -->
          <div class="product-skus-section">
            <h4>商品规格 ({{ currentProductDetail.skus.length }} 个)</h4>
            <div class="sku-preview-list">
              <div v-for="sku in currentProductDetail.skus" :key="sku.id" class="sku-preview-item">
                <img :src="sku.imageUrl || currentProductDetail.coverUrl" class="sku-preview-img" />
                <div class="sku-preview-info">
                  <span class="sku-name">{{ sku.skuName }}</span>
                  <span class="sku-code">{{ sku.skuCode }}</span>
                </div>
                <div class="sku-preview-price-stock">
                  <span class="sku-price">¥{{ sku.price }}</span>
                  <span class="sku-stock">库存: {{ sku.stock }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 宣传视频 -->
          <div v-if="currentProductDetail.videos && currentProductDetail.videos.length" class="product-video-section">
            <h4>宣传视频</h4>
            <div v-for="(v, index) in currentProductDetail.videos" :key="index" class="video-preview-wrapper">
              <video :src="v.videoUrl" controls class="detail-video-player"></video>
            </div>
          </div>

          <!-- 商品详情（富文本：图文交错） -->
          <div class="product-desc-section">
            <h4>商品详情</h4>
            <div
              v-if="currentProductDetail.detailDesc"
              class="desc-html"
              v-html="currentProductDetail.detailDesc"
            ></div>
            <p v-else class="desc-text">暂无详细描述。</p>
          </div>

          <!-- 操作按钮区 -->
          <div class="product-actions-section">
            <button type="button" class="primary-btn" style="flex: 1; height: 38px;" @click="startEditProduct">编辑商品</button>
            <button type="button" class="primary-btn danger-btn" style="flex: 1; height: 38px;" @click="handleDeleteProduct">删除商品</button>
          </div>
        </div>
      </div>
      <div v-else-if="resourceKey === 'merchants' && actionPanel.title === '商户详情' && currentMerchantDetail" class="merchant-profile-card">
        <div v-if="isMerchantDetailLoading" class="loading-wrapper" style="text-align: center; padding: 40px 0;">
          <el-icon class="is-loading" style="font-size: 24px;"><Loading /></el-icon>
          <p style="margin-top: 8px; color: var(--muted); font-size: 13px;">正在加载商户详情...</p>
        </div>
        <div v-else>
          <!-- 头部：商户Logo与核心信息 -->
          <div class="merchant-hero-card">
            <img :src="currentMerchantDetail.storeLogo || 'https://raw.githubusercontent.com/add-d/farm-assets/main/default-store.png'" class="merchant-logo-preview" />
            <div class="merchant-hero-info">
              <span class="merchant-id-badge">ID: {{ currentMerchantDetail.id }}</span>
              <h3 class="merchant-title-text">{{ currentMerchantDetail.storeName }}</h3>
              <p class="merchant-subtitle-text">绑定用户 ID: {{ currentMerchantDetail.userId }}</p>
            </div>
          </div>

          <!-- 商户基本属性 -->
          <div class="merchant-meta-section">
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">联系人:</span>
                <span class="meta-value">{{ currentMerchantDetail.contactName || '-' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">手机号:</span>
                <span class="meta-value">{{ currentMerchantDetail.contactMobile || '-' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">扣率 (佣金):</span>
                <span class="meta-value" style="color: var(--green-2);">{{ (Number(currentMerchantDetail.commissionRate) * 100).toFixed(2) }}%</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">入驻时间:</span>
                <span class="meta-value">{{ currentMerchantDetail.settledAt ? currentMerchantDetail.settledAt.slice(0, 16).replace('T', ' ') : '暂未入驻' }}</span>
              </div>
              <div class="meta-item" style="grid-column: span 2;">
                <span class="meta-label">审核状态:</span>
                <span class="status-tag" :class="currentMerchantDetail.auditStatus === 'APPROVED' ? 'status-active' : (currentMerchantDetail.auditStatus === 'REJECTED' ? 'status-rejected' : 'status-inactive')">
                  {{ currentMerchantDetail.auditStatus === 'APPROVED' ? '已通过' : (currentMerchantDetail.auditStatus === 'REJECTED' ? '已驳回' : '待审核') }}
                </span>
              </div>
            </div>
          </div>

          <!-- 资质材料 -->
          <div class="merchant-qualifications-section">
            <h4>资质证书与附件 ({{ currentMerchantDetail.qualifications ? currentMerchantDetail.qualifications.length : 0 }} 个)</h4>
            <div v-if="!currentMerchantDetail.qualifications || !currentMerchantDetail.qualifications.length" class="empty-text">暂无上传资质材料</div>
            <div v-else class="qualification-list">
              <div v-for="q in currentMerchantDetail.qualifications" :key="q.id" class="qualification-item">
                <div class="qualification-info">
                  <span class="qualification-type">{{ q.qualificationType }}</span>
                  <span class="qualification-filename">{{ q.fileName }}</span>
                </div>
                <a :href="q.fileUrl" target="_blank" class="primary-btn view-file-btn">查看附件</a>
              </div>
            </div>
          </div>

          <!-- 操作按钮区 -->
          <div class="merchant-actions-section">
            <button type="button" class="primary-btn" style="flex: 1; height: 38px;" @click="startEditMerchant">编辑商户</button>
            <button type="button" class="primary-btn danger-btn" style="flex: 1; height: 38px;" @click="handleDeleteMerchant">删除商户</button>
          </div>
        </div>
      </div>
      <div v-else>
        <div v-if="actionPanel.fields.length" class="action-field-list">
          <div v-for="field in actionPanel.fields" :key="field.label" class="action-field">
            <span>{{ field.label }}</span>
            <strong>{{ field.value }}</strong>
          </div>
        </div>
        <div v-else class="empty-state compact" style="margin-top: 8px;">
          <strong>暂无更多详情</strong>
          <span>当前记录已按字段方式完整展示。</span>
        </div>
      </div>

      <template #footer>
        <button v-if="actionPanel.routeTo" type="button" class="primary-btn" @click="goActionRoute">
          打开详情
        </button>
      </template>
    </AdminDrawer>

    <!-- 修改用户信息弹窗 -->
    <div v-if="editUserModal.open" class="action-modal" @click.self="closeEditUserModal">
      <section class="action-card action-card--narrow" role="dialog" aria-modal="true" aria-label="修改用户信息">
        <header class="action-card__head">
          <div>
            <h3>修改用户信息</h3>
            <p>请在此处修改用户基础昵称、手机号及头像 URL 地址。</p>
          </div>
          <button type="button" class="text-btn" @click="closeEditUserModal">关闭</button>
        </header>

        <form class="action-card__body" @submit.prevent="saveUserEditModal" style="display: flex; flex-direction: column; gap: 16px; padding: 20px 0 10px 0;">
          <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">用户昵称 <span style="color: var(--danger);">*</span></span>
            <input type="text" v-model="editUserModal.nickname" style="height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; background: var(--panel);" placeholder="输入新昵称" required />
          </label>
          <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">联系电话</span>
            <input type="text" v-model="editUserModal.mobile" style="height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; background: var(--panel);" placeholder="输入手机号" />
          </label>
          <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">头像链接 (URL)</span>
            <input type="text" v-model="editUserModal.avatarUrl" style="height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; background: var(--panel);" placeholder="输入头像 URL 地址" />
          </label>
          
          <div class="form-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; border-top: 1px solid var(--line); padding-top: 16px;">
            <button type="button" class="ghost-btn" style="height: 36px; padding: 0 16px;" @click="closeEditUserModal">取消</button>
            <button type="submit" class="primary-btn" style="height: 36px; padding: 0 16px;">保存修改</button>
          </div>
        </form>
      </section>
    </div>

    <!-- 修改商户信息弹窗 -->
    <div v-if="editMerchantModal.open" class="action-modal" @click.self="closeEditMerchantModal">
      <section class="action-card action-card--narrow" role="dialog" aria-modal="true" aria-label="修改商户信息">
        <header class="action-card__head">
          <div>
            <h3>修改商户信息</h3>
            <p>请在此处修改商户的基础信息、联系方式及扣率参数。</p>
          </div>
          <button type="button" class="text-btn" @click="closeEditMerchantModal">关闭</button>
        </header>

        <form class="action-card__body" @submit.prevent="saveMerchantEditModal" style="display: flex; flex-direction: column; gap: 16px; padding: 20px 0 10px 0;">
          <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">店铺名称 <span style="color: var(--danger);">*</span></span>
            <input type="text" v-model="editMerchantModal.storeName" style="height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; background: var(--panel);" placeholder="输入店铺名称" required />
          </label>
          <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">店铺 Logo URL</span>
            <input type="text" v-model="editMerchantModal.storeLogo" style="height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; background: var(--panel);" placeholder="输入店铺 Logo 图片链接" />
          </label>
          <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">联系人 <span style="color: var(--danger);">*</span></span>
            <input type="text" v-model="editMerchantModal.contactName" style="height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; background: var(--panel);" placeholder="输入联系人姓名" required />
          </label>
          <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">联系电话 <span style="color: var(--danger);">*</span></span>
            <input type="text" v-model="editMerchantModal.contactMobile" style="height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; background: var(--panel);" placeholder="输入联系人手机号" required />
          </label>
          <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">扣率 (佣金比例，如 0.05 代表 5%) <span style="color: var(--danger);">*</span></span>
            <input type="text" v-model="editMerchantModal.commissionRate" style="height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; background: var(--panel);" placeholder="例如 0.05" required />
          </label>
          <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">状态</span>
            <select v-model="editMerchantModal.status" style="height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; background: var(--panel);">
              <option :value="1">已入驻 / 营业中</option>
              <option :value="2">待审核</option>
              <option :value="3">审核驳回</option>
            </select>
          </label>
          
          <div class="form-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; border-top: 1px solid var(--line); padding-top: 16px;">
            <button type="button" class="ghost-btn" style="height: 36px; padding: 0 16px;" @click="closeEditMerchantModal">取消</button>
            <button type="submit" class="primary-btn" style="height: 36px; padding: 0 16px;">保存修改</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="rejectModal.open" class="action-modal" @click.self="closeRejectModal">
      <section class="action-card action-card--narrow" role="dialog" aria-modal="true" aria-label="填写拒绝/驳回原因">
        <header class="action-card__head">
          <div>
            <h3>{{ rejectModal.title }}</h3>
            <p>{{ rejectModal.description }}</p>
          </div>
          <button type="button" class="text-btn" @click="closeRejectModal">关闭</button>
        </header>

        <div class="action-card__body">
          <label class="form-field">
            <span>驳回原因 <span style="color: var(--danger);">*</span></span>
            <textarea
              v-model="rejectReason"
              rows="3"
              placeholder="如：图片模糊不清、资质不完整、商品信息虚假..."
            ></textarea>
          </label>
          <div v-if="rejectError" class="panel-banner warn">
            <span>{{ rejectError }}</span>
          </div>
        </div>

        <footer class="action-card__foot">
          <button type="button" class="ghost-btn" @click="closeRejectModal">取消</button>
          <button
            type="button"
            class="primary-btn danger-btn"
            :disabled="!rejectReason.trim()"
            @click="confirmReject"
          >
            确认驳回
          </button>
        </footer>
      </section>
    </div>

    <!-- Quick-lookup profile drawer -->
    <AdminDrawer
      :open="profileDrawer.open"
      :title="profileDrawer.title"
      :subtitle="profileDrawer.subtitle"
      :width="420"
      @close="profileDrawer.open = false"
    >
      <div class="detail-list">
        <div class="detail-row" v-for="field in profileDrawer.fields" :key="field.label">
          <span>{{ field.label }}</span>
          <strong :class="{ 'highlight-val': field.highlight }">{{ field.value }}</strong>
        </div>
      </div>
    </AdminDrawer>

    <!-- Refund arbitration drawer -->
    <AdminDrawer
      :open="refundDrawer.open"
      :title="refundDrawer.title"
      :subtitle="refundDrawer.subtitle"
      :width="960"
      @close="refundDrawer.open = false"
    >
      <div class="refund-drawer">
        <div class="refund-drawer__grid">
          <section class="refund-panel">
            <header class="refund-panel__head">
              <h4>用户举证</h4>
            </header>
            <div class="refund-panel__body">
              <dl class="refund-kv-list">
                <div v-for="f in refundDrawer.userFields" :key="f.label" class="refund-kv">
                  <dt>{{ f.label }}</dt>
                  <dd>{{ f.value }}</dd>
                </div>
              </dl>
              <div v-if="refundDrawer.userEvidence.length" class="refund-evidence">
                <p class="refund-evidence__label">举证图片</p>
                <div class="refund-evidence__grid">
                  <img
                    v-for="(img, idx) in refundDrawer.userEvidence"
                    :key="idx"
                    :src="img"
                    class="refund-evidence__img"
                    @click="previewImage(img)"
                  />
                </div>
              </div>
              <p v-else class="refund-empty-tip">用户暂未上传举证图片</p>
            </div>
          </section>

          <section class="refund-panel">
            <header class="refund-panel__head">
              <h4>商家申诉</h4>
            </header>
            <div class="refund-panel__body">
              <dl class="refund-kv-list">
                <div v-for="f in refundDrawer.merchantFields" :key="f.label" class="refund-kv">
                  <dt>{{ f.label }}</dt>
                  <dd>{{ f.value }}</dd>
                </div>
              </dl>
              <div v-if="refundDrawer.merchantEvidence.length" class="refund-evidence">
                <p class="refund-evidence__label">申诉凭证</p>
                <div class="refund-evidence__grid">
                  <img
                    v-for="(img, idx) in refundDrawer.merchantEvidence"
                    :key="idx"
                    :src="img"
                    class="refund-evidence__img"
                    @click="previewImage(img)"
                  />
                </div>
              </div>
              <p v-else class="refund-empty-tip">商家暂未回复举证信息</p>
            </div>
          </section>

          <section class="refund-panel refund-panel--action">
            <header class="refund-panel__head">
              <h4>仲裁操作</h4>
            </header>
            <div class="refund-panel__body">
              <dl class="refund-kv-list">
                <div v-for="f in refundDrawer.orderFields" :key="f.label" class="refund-kv">
                  <dt>{{ f.label }}</dt>
                  <dd>{{ f.value }}</dd>
                </div>
              </dl>
              <div class="refund-action-box">
                <p class="refund-action-box__hint">确认双方举证后，作出最终仲裁判定：</p>
                <textarea
                  v-model="rejectReason"
                  rows="4"
                  placeholder="填写仲裁判定原因..."
                  class="refund-remark-input"
                ></textarea>
                <div class="refund-action-btns">
                  <button
                    type="button"
                    class="primary-btn"
                    @click="arbitrateFromDrawer('approve')"
                  >
                    同意退款
                  </button>
                  <button
                    type="button"
                    class="primary-btn danger-btn"
                    @click="arbitrateFromDrawer('reject')"
                  >
                    驳回申请
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminDrawer>

    <AdminDrawer
      :open="productCreateDrawer.open"
      :title="isEditingProduct ? '编辑平台商品' : '新增平台商品'"
      :subtitle="isEditingProduct ? '修改平台自营商品的规格、价格、库存和描述，保存后将同步更新。' : '平台商品直接归属到平台自营商户，创建后可选择直接发布或保存草稿。'"
      :width="920"
      @close="closeProductCreateDrawer"
    >
      <form class="product-create-form" @submit.prevent="submitProductCreate">
        <!-- Section 1: Basic info -->
        <div class="form-section">
          <h3 class="section-title">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            基本信息
          </h3>
          <div class="account-form-grid">
            <label class="form-field form-field--full">
              <span>商品类目</span>
              <select v-model="productForm.categoryId" required>
                <option value="">请选择类目</option>
                <optgroup v-for="root in catalogCategories" :key="root.id" :label="root.name">
                  <option :value="String(root.id)">{{ root.name }}</option>
                  <option v-for="child in root.children ?? []" :key="child.id" :value="String(child.id)">
                    {{ root.name }} / {{ child.name }}
                  </option>
                </optgroup>
              </select>
            </label>
            <label class="form-field form-field--full">
              <span>商品标题</span>
              <input v-model.trim="productForm.title" type="text" placeholder="如: 攀枝花凯特芒果 5kg 顺丰包邮" required />
            </label>
            <label class="form-field form-field--full">
              <span>副标题</span>
              <input v-model.trim="productForm.subtitle" type="text" placeholder="一句话描述商品卖点，如: 果肉细腻 甜度爆表" />
            </label>
            <label class="form-field">
              <span>原产地</span>
              <input v-model.trim="productForm.originPlace" type="text" placeholder="如: 四川攀枝花 / 云南丽江" />
            </label>
            <label class="form-field">
              <span>品牌</span>
              <input v-model.trim="productForm.brand" type="text" placeholder="如: 农夫山泉 / 佳沛" />
            </label>
            <label class="form-field">
              <span>商品属性</span>
              <input v-model.trim="productForm.productNature" type="text" placeholder="如: 有机认证 / 绿色食品 / 普通商品" />
            </label>
            <label class="form-field">
              <span>供应商</span>
              <input v-model.trim="productForm.supplierName" type="text" placeholder="如: 京东冷链物流 / 顺丰直发" />
            </label>
            <label class="form-field">
              <span>溯源码</span>
              <input v-model.trim="productForm.traceCode" type="text" placeholder="如: TRACE202606200001" />
            </label>
            <label class="form-field">
              <span>溯源说明</span>
              <input v-model.trim="productForm.traceDesc" type="text" placeholder="如: 产地直采批次，支持冷链流转查询" />
            </label>
          </div>
        </div>

        <!-- Section 2: Media uploads -->
        <div class="form-section">
          <h3 class="section-title">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            媒体资源
          </h3>
          <div class="product-media-grid">
            <div class="product-media-left">
              <div class="form-field">
                <span>商品封面图</span>
                <div class="premium-uploader">
                  <el-upload
                    class="cover-uploader"
                    action=""
                    :show-file-list="false"
                    :http-request="uploadCoverImage"
                    accept="image/*"
                  >
                    <div v-if="productForm.coverUrl" class="image-preview-container">
                      <img :src="productForm.coverUrl" class="uploaded-image" />
                      <div class="image-action-overlay">
                        <div class="action-btn">
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                          <span>更换图片</span>
                        </div>
                      </div>
                    </div>
                    <div v-else class="upload-placeholder-box">
                      <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" class="upload-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      <div class="upload-text-main">上传封面图</div>
                      <div class="upload-text-sub">支持 PNG, JPG, JPEG (最高 5MB)</div>
                    </div>
                  </el-upload>
                </div>
              </div>

              <div class="form-field">
                <span>商品宣传视频</span>
                <div class="premium-uploader">
                  <el-upload
                    class="cover-uploader"
                    action=""
                    :show-file-list="false"
                    :http-request="uploadVideoFile"
                    accept="video/*"
                  >
                    <div v-if="productForm.videoUrl" class="image-preview-container" @click.stop>
                      <video :src="productForm.videoUrl" controls class="uploaded-image video-preview"></video>
                      <button type="button" class="album-delete-btn video-delete-btn" @click="removeProductVideo">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                    <div v-else class="upload-placeholder-box upload-placeholder-box--compact">
                      <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" class="upload-icon"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                      <div class="upload-text-main">上传宣传视频</div>
                      <div class="upload-text-sub">支持 MP4, WebM (最高 50MB)</div>
                    </div>
                  </el-upload>
                </div>
              </div>
            </div>

            <div class="form-field">
              <span>顶部轮播图（可选，用于商品头图滑动）</span>
              <div class="album-uploader-grid">
                <div v-for="(img, idx) in productAlbumList" :key="idx" class="album-item-card">
                  <img :src="img.url" class="album-image" />
                  <button type="button" class="album-delete-btn" @click="removeAlbumImage(idx)">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
                <el-upload
                  class="album-uploader-add"
                  action=""
                  :show-file-list="false"
                  :http-request="uploadAlbumImage"
                  accept="image/*"
                  multiple
                >
                  <div class="add-placeholder">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>添加图片</span>
                  </div>
                </el-upload>
              </div>
              <small class="form-help">详情正文请在下方「商品详情」中插入图文，此处仅用于顶部轮播。</small>
            </div>
          </div>
        </div>

        <!-- Section 3: Spec and Stock -->
        <div class="form-section">
          <h3 class="section-title">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"></line></svg>
            规格与库存
          </h3>

          <div class="spec-mode-selector">
            <label class="spec-radio-card" :class="{ active: !productForm.isMultiSpec }">
              <input type="radio" :value="false" v-model="productForm.isMultiSpec" class="hidden-radio" />
              <span class="radio-label-title">单规格模式</span>
              <span class="radio-label-desc">商品仅有一种规格，统一价格与库存</span>
            </label>
            <label class="spec-radio-card" :class="{ active: productForm.isMultiSpec }">
              <input type="radio" :value="true" v-model="productForm.isMultiSpec" class="hidden-radio" />
              <span class="radio-label-title">多规格模式</span>
              <span class="radio-label-desc">商品有多种规格，可独立设置规格名、价格和库存</span>
            </label>
          </div>

          <!-- Single Spec -->
          <div v-if="!productForm.isMultiSpec" class="single-spec-grid">
            <div class="form-grid-3">
              <label class="form-field">
                <span>规格名称</span>
                <input v-model.trim="productForm.skuName" type="text" placeholder="如: 默认规格 / 500g装" required />
              </label>
              <label class="form-field">
                <span>单价 (元)</span>
                <input v-model.trim="productForm.price" type="text" placeholder="0.00" required />
              </label>
              <label class="form-field">
                <span>库存</span>
                <input v-model.number="productForm.stock" type="number" min="0" step="1" required />
              </label>
            </div>
            <div class="sku-image-upload-wrap">
              <span class="field-label">规格图片</span>
              <el-upload
                class="sku-mini-uploader"
                action=""
                :show-file-list="false"
                :http-request="uploadSkuImage"
                accept="image/*"
              >
                <div v-if="productForm.skuImageUrl" class="sku-mini-preview">
                  <img :src="productForm.skuImageUrl" />
                  <div class="sku-mini-overlay">更换</div>
                </div>
                <div v-else class="sku-mini-placeholder">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  <span>上传</span>
                </div>
              </el-upload>
            </div>
          </div>

          <!-- Multi Spec -->
          <div v-else class="multi-spec-container">
            <table class="spec-table">
              <thead>
                <tr>
                  <th>规格名称</th>
                  <th style="width: 150px;">价格 (元)</th>
                  <th style="width: 130px;">库存</th>
                  <th style="width: 120px;">规格图片</th>
                  <th style="width: 80px; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(sku, index) in productForm.skuList" :key="index">
                  <td>
                    <input
                      v-model.trim="sku.skuName"
                      type="text"
                      placeholder="如: 大果 5kg"
                      class="table-input"
                      required
                    />
                  </td>
                  <td>
                    <input
                      v-model.trim="sku.price"
                      type="text"
                      placeholder="0.00"
                      class="table-input"
                      required
                    />
                  </td>
                  <td>
                    <input
                      v-model.number="sku.stock"
                      type="number"
                      min="0"
                      step="1"
                      class="table-input"
                      required
                    />
                  </td>
                  <td>
                    <el-upload
                      class="sku-table-uploader"
                      action=""
                      :show-file-list="false"
                      :http-request="(opt: any) => uploadTableSkuImage(opt.file, index)"
                      accept="image/*"
                    >
                      <div v-if="sku.imageUrl" class="sku-table-preview">
                        <img :src="sku.imageUrl" />
                        <div class="sku-table-overlay">更</div>
                      </div>
                      <div v-else class="sku-table-placeholder">
                        <span>上传</span>
                      </div>
                    </el-upload>
                  </td>
                  <td style="text-align: center;">
                    <button
                      type="button"
                      class="table-action-btn"
                      @click="removeSkuRow(index)"
                      :disabled="productForm.skuList.length <= 1"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <button type="button" class="add-sku-row-btn" @click="addSkuRow">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              添加规格项
            </button>
          </div>
        </div>

        <!-- Section 4: Service and Detail Description -->
        <div class="form-section">
          <h3 class="section-title">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            服务与说明
          </h3>

          <div class="form-field" style="margin-bottom: 16px;">
            <span>服务保障标签</span>
            <div class="service-tags-selector">
              <div
                v-for="tag in AVAILABLE_TAGS"
                :key="tag.key"
                class="tag-select-card"
                :class="{ active: productForm.selectedTags.includes(tag.key) }"
                @click="toggleServiceTag(tag.key)"
              >
                <div class="tag-card-checkbox">
                  <span class="checkbox-inner"></span>
                </div>
                <div class="tag-card-info">
                  <span class="tag-card-title">{{ tag.title }}</span>
                  <span class="tag-card-desc">{{ tag.desc }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-field">
            <span>商品详情（图文交错富文本）</span>
            <ProductRichEditor
              v-model="productForm.detailDesc"
              :upload="uploadRichImage"
            />
            <small class="form-help">支持文字与图片交替插入，小程序详情页将按同一顺序展示。</small>
          </div>
        </div>

        <!-- Section 5: Settings -->
        <div class="form-section" style="margin-bottom: 0;">
          <h3 class="section-title">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            发布设置
          </h3>
          <div class="product-switch-grid">
            <label class="form-field">
              <span>发布方式</span>
              <select v-model="productForm.publishMode">
                <option value="PUBLISH">直接发布</option>
                <option value="DRAFT">保存草稿</option>
              </select>
            </label>
            <label class="switch-field">
              <input v-model="productForm.isHot" type="checkbox" />
              <span>设为热销商品</span>
            </label>
            <label class="switch-field">
              <input v-model="productForm.isPreSale" type="checkbox" />
              <span>预售商品</span>
            </label>
            <label class="switch-field">
              <input v-model="productForm.groupBuyEnabled" type="checkbox" />
              <span>开启拼团</span>
            </label>
            <label class="form-field">
              <span>成团人数</span>
              <input v-model.number="productForm.groupBuyNeeded" type="number" min="2" />
            </label>
            <label class="form-field">
              <span>拼团有效期（小时）</span>
              <input v-model.number="productForm.groupBuyExpireHours" type="number" min="1" />
            </label>
            <label class="form-field">
              <span>拼团折扣率</span>
              <input v-model="productForm.groupBuyDiscountRate" type="text" placeholder="0.70" />
              <small class="form-help">0.70 表示拼团价为原价 70%。</small>
            </label>
          </div>
        </div>

        <div v-if="productCreateError" class="panel-banner warn" style="margin-top: 20px;">
          <span>{{ productCreateError }}</span>
        </div>

        <footer class="action-card__foot">
          <button type="button" class="ghost-btn" @click="closeProductCreateDrawer">取消</button>
          <button type="submit" class="primary-btn" :disabled="productCreateLoading">
            {{ productCreateLoading ? (isEditingProduct ? '保存中...' : '创建中...') : (isEditingProduct ? '保存修改' : (productForm.publishMode === 'PUBLISH' ? '创建并发布' : '保存草稿')) }}
          </button>
        </footer>
      </form>
    </AdminDrawer>

    <AdminDrawer
      :open="couponDrawer.open"
      :title="editingCouponId != null ? '编辑优惠券' : '新增优惠券'"
      :subtitle="editingCouponId != null ? '调整优惠券的门槛、有效期、库存和状态。' : '创建一张新的优惠券，支持满减、有效期和每人限领。'"
      :width="760"
      @close="closeCouponDrawer"
    >
      <form class="coupon-form" @submit.prevent="submitCouponForm">
        <div class="form-section">
          <h3 class="section-title">基础信息</h3>
          <div class="account-form-grid">
            <label class="form-field">
              <span>券名称</span>
              <input v-model="couponForm.name" type="text" placeholder="如：新人满 50 减 10" />
            </label>
            <label class="form-field">
              <span>券类型</span>
              <select v-model="couponForm.type">
                <option value="CASHBACK">满减券</option>
                <option value="NEW_USER">新人券</option>
                <option value="RETURNING_USER">回归券</option>
              </select>
            </label>
            <label v-if="couponForm.type === 'NEW_USER'" class="form-field">
              <span>新人定义</span>
              <input v-model.number="couponForm.newUserDays" type="number" min="1" />
              <small class="form-help">注册后 {{ couponForm.newUserDays }} 天内自动发放给新用户。</small>
            </label>
            <label v-if="couponForm.type === 'RETURNING_USER'" class="form-field">
              <span>回归定义</span>
              <input v-model.number="couponForm.inactiveDays" type="number" min="1" />
              <small class="form-help">连续 {{ couponForm.inactiveDays }} 天未登录后，登录时自动发放。</small>
            </label>
            <label class="form-field">
              <span>使用门槛</span>
              <input v-model="couponForm.thresholdAmount" type="text" placeholder="0.00" />
              <small class="form-help">订单金额达到这个数值后才可使用。</small>
            </label>
            <label class="form-field">
              <span>优惠金额</span>
              <input v-model="couponForm.discountAmount" type="text" placeholder="0.00" />
            </label>
            <label class="form-field">
              <span>库存</span>
              <input v-model.number="couponForm.stock" type="number" min="0" />
            </label>
            <label class="form-field">
              <span>每人限领</span>
              <input v-model.number="couponForm.perUserLimit" type="number" min="1" />
            </label>
            <label class="form-field">
              <span>开始时间</span>
              <input v-model="couponForm.validStartAt" type="datetime-local" />
            </label>
            <label class="form-field">
              <span>结束时间</span>
              <input v-model="couponForm.validEndAt" type="datetime-local" />
            </label>
            <label class="form-field">
              <span>适用范围</span>
              <select v-model="couponForm.scope">
                <option value="ALL">全场通用</option>
                <option value="SHOP">店铺券</option>
                <option value="CATEGORY">类目券</option>
                <option value="PRODUCT">商品券</option>
                <option value="CATEGORY_SHOP">类目店铺券</option>
              </select>
            </label>
            <label v-if="couponForm.scope === 'CATEGORY' || couponForm.scope === 'PRODUCT' || couponForm.scope === 'CATEGORY_SHOP'" class="form-field">
              <span>指定类目</span>
              <select v-model="couponForm.categoryIds" multiple size="6">
                <optgroup v-for="root in catalogCategories" :key="root.id" :label="root.name">
                  <option :value="String(root.id)">{{ root.name }}</option>
                  <option v-for="child in root.children ?? []" :key="child.id" :value="String(child.id)">
                    {{ root.name }} / {{ child.name }}
                  </option>
                </optgroup>
              </select>
              <small class="form-help">只能从类目列表里勾选，不能手动填写 ID。</small>
            </label>
            <label v-if="couponForm.scope === 'SHOP' || couponForm.scope === 'CATEGORY_SHOP'" class="form-field">
              <span>指定店铺</span>
              <select v-model="couponForm.merchantIds" multiple size="6">
                <option v-for="merchant in merchantOptions" :key="merchant.id" :value="String(merchant.id)">
                  {{ merchant.storeName }}
                </option>
              </select>
              <small class="form-help">只能从店铺列表里勾选，不能手动填写 ID。</small>
            </label>
            <label class="form-field">
              <span>状态</span>
              <select v-model="couponForm.status">
                <option value="ENABLED">启用</option>
                <option value="DISABLED">停用</option>
                <option value="DRAFT">草稿</option>
              </select>
            </label>
          </div>
        </div>

        <div v-if="couponFormError" class="panel-banner warn" style="margin-top: 16px;">
          <span>{{ couponFormError }}</span>
        </div>

        <div class="form-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px;">
          <button type="button" class="ghost-btn" @click="closeCouponDrawer">取消</button>
          <button type="submit" class="primary-btn">
            {{ couponFormLoading ? '保存中...' : (editingCouponId != null ? '保存修改' : '创建优惠券') }}
          </button>
        </div>
      </form>
    </AdminDrawer>

    <div v-if="couponIssueModal.open" class="action-modal" @click.self="closeCouponIssueModal">
      <section class="action-card action-card--narrow" role="dialog" aria-modal="true" aria-label="发放优惠券">
        <header class="action-card__head">
          <div>
            <h3>发放优惠券</h3>
            <p>向指定用户发放「{{ couponIssueModal.name }}」。</p>
          </div>
          <button type="button" class="text-btn" @click="closeCouponIssueModal">关闭</button>
        </header>

        <form class="action-card__body" @submit.prevent="submitCouponIssue" style="display: flex; flex-direction: column; gap: 16px; padding: 20px 0 10px 0;">
          <div class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">搜索用户</span>
            <div style="display: flex; gap: 8px;">
              <input v-model="couponIssueSearch.keyword" type="text" placeholder="输入昵称 / 手机号" style="flex: 1; height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; background: var(--panel);" @keyup.enter="searchCouponUsers" />
              <button type="button" class="primary-btn" style="height: 38px; padding: 0 14px;" @click="searchCouponUsers">
                {{ couponIssueSearch.loading ? '搜索中...' : '搜索' }}
              </button>
            </div>
            <small style="color: var(--muted); font-size: 12px;">从搜索结果中选择用户，不再支持手动填写用户 ID。</small>
          </div>
          <div v-if="couponIssueSearch.results.length" class="coupon-user-results">
            <button
              v-for="user in couponIssueSearch.results"
              :key="user.id"
              type="button"
              class="coupon-user-result"
              :class="{ selected: Number(couponIssueModal.selectedUser?.id ?? 0) === Number(user.id) }"
              @click="selectCouponIssueUser(user)"
            >
              <strong>{{ user.nickname || '未命名用户' }}</strong>
              <span>{{ user.id }} · {{ user.mobile || '未绑定手机' }}</span>
            </button>
          </div>
          <div v-if="couponIssueModal.selectedUser" class="panel-banner success">
            <span>已选择：{{ couponIssueModal.selectedUser.nickname || '未命名用户' }}（{{ couponIssueModal.selectedUser.id }}，{{ couponIssueModal.selectedUser.mobile || '未绑定手机' }}）</span>
          </div>
          <div class="form-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;">
            <button type="button" class="ghost-btn" @click="closeCouponIssueModal">取消</button>
            <button type="submit" class="primary-btn">{{ couponFormLoading ? '发放中...' : '确认发放' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="dangerConfirm.open" class="action-modal" @click.self="closeDangerConfirm">
      <section class="action-card action-card--narrow" role="dialog" aria-modal="true" aria-label="高危操作确认">
        <header class="action-card__head">
          <div>
            <h3 style="color: var(--danger);">{{ dangerConfirm.title }}</h3>
            <p>{{ dangerConfirm.description }}</p>
          </div>
          <button type="button" class="text-btn" @click="closeDangerConfirm">取消</button>
        </header>

        <div class="action-card__body">
          <div class="panel-banner warn">
            <strong>此操作不可撤销</strong>
            <span>请确认您已了解该操作的影响，继续执行可能会对业务数据产生不可逆的修改。</span>
          </div>
        </div>

        <footer class="action-card__foot">
          <button type="button" class="ghost-btn" @click="closeDangerConfirm">我再想想</button>
          <button type="button" class="primary-btn danger-btn" @click="confirmDangerAction">
            确认执行 — {{ dangerConfirm.actionLabel }}
          </button>
        </footer>
      </section>
    </div>

    <div v-if="pointAdjustModal.open" class="action-modal" @click.self="closePointAdjustModal">
      <section class="action-card action-card--narrow" role="dialog" aria-modal="true" aria-label="调整积分">
        <header class="action-card__head">
          <div>
            <h3>调整积分</h3>
            <p>对「{{ pointAdjustModal.nickname || pointAdjustModal.mobile || pointAdjustModal.userId }}」进行手动积分调整。</p>
          </div>
          <button type="button" class="text-btn" @click="closePointAdjustModal">关闭</button>
        </header>

        <form class="action-card__body" @submit.prevent="submitPointAdjust" style="display: flex; flex-direction: column; gap: 16px; padding: 20px 0 10px 0;">
          <div v-if="pointAdjustError" class="panel-banner warn">
            <strong>提示</strong>
            <span>{{ pointAdjustError }}</span>
          </div>
          <div class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">调整对象</span>
            <div class="panel-banner success">
              <span>{{ pointAdjustModal.nickname || '未命名用户' }}（{{ pointAdjustModal.userId }}{{ pointAdjustModal.mobile ? `，${pointAdjustModal.mobile}` : '' }}）</span>
            </div>
          </div>
          <div class="form-field" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px;">
            <label style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted); font-weight: 700;">调整方式</span>
              <select v-model="pointAdjustModal.mode" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);">
                <option value="INCREASE">增加积分</option>
                <option value="DEDUCT">扣减积分</option>
              </select>
            </label>
            <label style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted); font-weight: 700;">积分数量</span>
              <input v-model.number="pointAdjustModal.amount" type="number" min="1" step="1" placeholder="请输入整数积分" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
          </div>
          <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700;">备注</span>
            <textarea v-model="pointAdjustModal.remark" rows="3" placeholder="例如：活动补发 / 人工扣减原因" style="border-radius: 10px; border: 1px solid var(--line); padding: 10px 12px; background: var(--panel); resize: vertical;"></textarea>
          </label>
          <div class="form-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;">
            <button type="button" class="ghost-btn" @click="closePointAdjustModal">取消</button>
            <button type="submit" class="primary-btn">{{ pointAdjustLoading ? '提交中...' : '确认调整' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="userCouponIssueModal.open" class="action-modal" @click.self="closeUserCouponIssueModal">
      <section class="action-card action-card--narrow" role="dialog" aria-modal="true" aria-label="发放优惠券给当前用户">
        <header class="action-card__head">
          <div>
            <h3>发放优惠券</h3>
            <p>直接发放给「{{ userCouponIssueModal.nickname || userCouponIssueModal.mobile || userCouponIssueModal.userId }}」。</p>
          </div>
          <button type="button" class="text-btn" @click="closeUserCouponIssueModal">关闭</button>
        </header>

        <form class="action-card__body" @submit.prevent="submitUserCouponIssue" style="display: flex; flex-direction: column; gap: 16px; padding: 20px 0 10px 0;">
          <div v-if="userCouponIssueError" class="panel-banner warn">
            <strong>提示</strong>
            <span>{{ userCouponIssueError }}</span>
          </div>
          <div class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">目标用户</span>
            <div class="panel-banner success">
              <span>{{ userCouponIssueModal.nickname || '未命名用户' }}（{{ userCouponIssueModal.userId }}{{ userCouponIssueModal.mobile ? `，${userCouponIssueModal.mobile}` : '' }}）</span>
            </div>
          </div>
          <div class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-align: left;">搜索优惠券</span>
            <div style="display: flex; gap: 8px;">
              <input v-model="userCouponIssueSearch.keyword" type="text" placeholder="输入券名 / 关键词" style="flex: 1; height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; background: var(--panel);" @keyup.enter="searchUserCouponIssueCoupons" />
              <button type="button" class="primary-btn" style="height: 38px; padding: 0 14px;" @click="searchUserCouponIssueCoupons">
                {{ userCouponIssueSearch.loading ? '搜索中...' : '搜索' }}
              </button>
            </div>
            <small style="color: var(--muted); font-size: 12px;">只能选择优惠券，不能手填 ID。</small>
          </div>
          <div v-if="userCouponIssueSearch.results.length" class="coupon-user-results">
            <button
              v-for="coupon in userCouponIssueSearch.results"
              :key="coupon.id"
              type="button"
              class="coupon-user-result"
              :class="{ selected: Number(userCouponIssueModal.selectedCoupon?.id ?? 0) === Number(coupon.id) }"
              @click="selectUserCouponIssueCoupon(coupon)"
            >
              <strong>{{ coupon.name }}</strong>
              <span>{{ coupon.discountAmount }} · 剩余 {{ coupon.remainingStock }} 张</span>
            </button>
          </div>
          <div v-if="userCouponIssueModal.selectedCoupon" class="panel-banner success">
            <span>已选择：{{ userCouponIssueModal.selectedCoupon.name }}（{{ userCouponIssueModal.selectedCoupon.discountAmount }}，剩余 {{ userCouponIssueModal.selectedCoupon.remainingStock }} 张）</span>
          </div>
          <div class="form-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;">
            <button type="button" class="ghost-btn" @click="closeUserCouponIssueModal">取消</button>
            <button type="submit" class="primary-btn">{{ userCouponIssueLoading ? '发放中...' : '确认发放' }}</button>
          </div>
        </form>
      </section>
    </div>

    <!-- Activity form modal -->
    <div v-if="activityFormModal.open" class="action-modal" @click.self="closeActivityFormModal">
      <section class="action-card" role="dialog" aria-modal="true" aria-label="活动表单">
        <header class="action-card__head">
          <div>
            <h3>{{ activityFormModal.title }}</h3>
            <p>填写活动信息，开始时间与结束时间为必填</p>
          </div>
        </header>

        <form class="action-card__body" @submit.prevent="submitActivityFormModal">
          <div class="form-field">
            <span>活动名称 *</span>
            <input v-model="activityFormModal.activityName" type="text" placeholder="例如：限时秒杀" required />
          </div>

          <div class="form-grid-2">
            <label class="form-field">
              <span>活动类型 *</span>
              <select v-model="activityFormModal.activityType" required>
                <option value="SECKILL">限时秒杀</option>
                <option value="GROUP_BUY">拼团</option>
                <option value="CASHBACK">满减返利</option>
                <option value="PRESALE">预售</option>
              </select>
            </label>
            <label class="form-field">
              <span>状态</span>
              <select v-model="activityFormModal.status">
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">已发布</option>
                <option value="PAUSED">已暂停</option>
                <option value="ENDED">已结束</option>
              </select>
            </label>
          </div>

          <div class="form-grid-2">
            <DateTimeField v-model="activityFormModal.startAt" label="开始时间" required />
            <DateTimeField v-model="activityFormModal.endAt" label="结束时间" required />
          </div>

          <p class="form-section-title">关联商品（可留空）</p>
          <div class="form-field">
            <span>商品 ID</span>
            <input v-model="activityFormModal.productId" type="number" placeholder="输入商品 ID" />
          </div>
          <div v-if="activityFormModal.productId" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">商品标题</span>
              <input v-model="activityFormModal.productTitle" type="text" placeholder="商品标题" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">封面 URL</span>
              <input v-model="activityFormModal.productCoverUrl" type="text" placeholder="https://" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">原价</span>
              <input v-model="activityFormModal.originalPrice" type="text" placeholder="0.00" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">活动价</span>
              <input v-model="activityFormModal.activityPrice" type="text" placeholder="0.00" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">活动库存</span>
              <input v-model="activityFormModal.stock" type="number" placeholder="0" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
          </div>

          <p class="form-section-title">活动规则</p>

          <!-- SECKILL rules -->
          <div v-if="activityFormModal.activityType === 'SECKILL'" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">每人限购</span>
              <input v-model="activityFormModal.limitPerUser" type="number" min="1" placeholder="1" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">预警库存</span>
              <input v-model="activityFormModal.warningStock" type="number" min="0" placeholder="0" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
          </div>

          <!-- GROUP_BUY rules -->
          <div v-if="activityFormModal.activityType === 'GROUP_BUY'" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">成团人数</span>
              <input v-model="activityFormModal.needed" type="number" min="2" placeholder="3" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">有效时长（小时）</span>
              <input v-model="activityFormModal.expireHours" type="number" min="1" placeholder="24" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">每人限购</span>
              <input v-model="activityFormModal.limitPerUser" type="number" min="1" placeholder="1" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
          </div>

          <!-- CASHBACK rules -->
          <div v-if="activityFormModal.activityType === 'CASHBACK'" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">满减门槛</span>
              <input v-model="activityFormModal.thresholdAmount" type="text" placeholder="0.00" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">优惠金额</span>
              <input v-model="activityFormModal.discountAmount" type="text" placeholder="0.00" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">优惠券库存</span>
              <input v-model="activityFormModal.couponStock" type="number" min="0" placeholder="100" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">每人限领</span>
              <input v-model="activityFormModal.perUserLimit" type="number" min="1" placeholder="1" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
          </div>

          <!-- PRESALE rules -->
          <div v-if="activityFormModal.activityType === 'PRESALE'" style="display: flex; flex-direction: column; gap: 12px;">
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">定金金额</span>
              <input v-model="activityFormModal.depositAmount" type="text" placeholder="0.00" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
            <div class="form-grid-2">
              <DateTimeField v-model="activityFormModal.finalPaymentStartAt" label="尾款开始时间" />
              <DateTimeField v-model="activityFormModal.finalPaymentEndAt" label="尾款结束时间" />
            </div>
            <DateTimeField v-model="activityFormModal.deliveryStartAt" label="发货开始时间" block />
            <label class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 12px; color: var(--muted);">每人限购</span>
              <input v-model="activityFormModal.limitPerUser" type="number" min="1" placeholder="1" style="height: 38px; border-radius: 10px; border: 1px solid var(--line); padding: 0 12px; background: var(--panel);" />
            </label>
          </div>

          <footer class="action-card__foot">
            <button type="button" class="ghost-btn" @click="closeActivityFormModal">取消</button>
            <button type="submit" class="primary-btn">确认{{ activityFormModal.title === '新增活动' ? '创建' : '更新' }}</button>
          </footer>
        </form>
      </section>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Check, Clock, Loading, Promotion, Star } from '@element-plus/icons-vue';

import {
  auditMerchant,
  auditProduct,
  arbitrateRefund,
  createAdminProduct,
  getAdminProductDetail,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminMerchantDetail,
  updateAdminMerchant,
  deleteAdminMerchant,
  createActivity,
  createLogisticsRule,
  endActivity,
  getCatalogCategories,
  getActivities,
  getCoupons,
  getLogisticsRules,
  getMerchants,
  getOrders,
  getProducts,
  getRefunds,
  getWithdraws,
  auditWithdraw,
  finishActivity,
  getActivityDetail,
  getUserSummary,
  getMerchantSummary,
  getUsers,
  createCoupon,
  updateCoupon,
  updateCouponStatus,
  deleteCoupon,
  issueCoupon,
  adjustAdminUserPoints,
  takedownProduct,
  pauseActivity,
  publishActivity,
  updateActivity,
  updateLogisticsRule,
  deleteLogisticsRule,
  updateAdminUserStatus,
  uploadFile,
} from '@/api/admin';
import AdminDrawer from '@/components/AdminDrawer.vue';
import DateTimeField from '@/components/DateTimeField.vue';
import ProductRichEditor from '@/components/ProductRichEditor.vue';
import StatGrid from '@/components/StatGrid.vue';
import RefreshDataButton from '@/components/RefreshDataButton.vue';
import { refreshWithFeedback } from '@/utils/refresh-feedback';
import type { ResourceKey } from '@/data/admin';
import { resourceConfigs } from '@/data/admin';

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

type RowDetailField = {
  label: string;
  value: string;
};

type CategoryOption = {
  id: number;
  name: string;
  iconUrl?: string;
  children?: CategoryOption[];
};

type MerchantOption = {
  id: number;
  storeName: string;
};

type ActionPanelState = {
  open: boolean;
  title: string;
  description: string;
  fields: RowDetailField[];
  routeTo: string | null;
};

const props = defineProps<{
  resourceKey: ResourceKey;
}>();

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const rows = ref<any[]>([]);
const total = ref(0);
const actionMessage = ref('');
const actionError = ref('');
const catalogCategories = ref<CategoryOption[]>([]);
const merchantOptions = ref<MerchantOption[]>([]);
const supportsPagination = computed(() => !['activities', 'logistics'].includes(props.resourceKey));
const currentPage = computed(() => parsePageNumber(route.query.page, 1));
const pageSize = computed(() => parsePageSize(route.query.pageSize, 20));
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const pageInput = ref(currentPage.value);



const actionPanel = ref<ActionPanelState>({
  open: false,
  title: '',
  description: '',
  fields: [],
  routeTo: null,
});
const productCreateDrawer = reactive({
  open: false,
});
const productCreateLoading = ref(false);
const productCreateError = ref('');
const couponDrawer = reactive({
  open: false,
});
const couponFormLoading = ref(false);
const couponFormError = ref('');
const editingCouponId = ref<number | null>(null);
const couponForm = reactive({
  name: '',
  type: 'CASHBACK',
  thresholdAmount: '0.00',
  discountAmount: '0.00',
  stock: 0,
  validStartAt: '',
  validEndAt: '',
  scope: 'ALL',
  perUserLimit: 1,
  categoryIds: [] as string[],
  merchantIds: [] as string[],
  newUserDays: 7,
  inactiveDays: 30,
  status: 'ENABLED',
});
const couponIssueModal = reactive({
  open: false,
  couponId: null as number | null,
  name: '',
  selectedUser: null as null | { id: number; nickname: string; mobile: string },
});
const couponIssueSearch = reactive({
  keyword: '',
  loading: false,
  results: [] as Array<{ id: number; nickname: string; mobile: string }>,
});
const pointAdjustModal = reactive({
  open: false,
  userId: null as number | null,
  nickname: '',
  mobile: '',
  mode: 'INCREASE' as 'INCREASE' | 'DEDUCT',
  amount: 50,
  remark: '',
});
const pointAdjustLoading = ref(false);
const pointAdjustError = ref('');
const userCouponIssueModal = reactive({
  open: false,
  userId: null as number | null,
  nickname: '',
  mobile: '',
  selectedCoupon: null as null | {
    id: number;
    name: string;
    type: string;
    thresholdAmount: string;
    discountAmount: string;
    remainingStock: number;
  },
});
const userCouponIssueSearch = reactive({
  keyword: '',
  loading: false,
  results: [] as Array<{
    id: number;
    name: string;
    type: string;
    thresholdAmount: string;
    discountAmount: string;
    remainingStock: number;
  }>,
});
const userCouponIssueLoading = ref(false);
const userCouponIssueError = ref('');

const AVAILABLE_TAGS = [
  { key: 'badFruit', title: '坏果包赔', desc: '签收后如遇坏果可申请售后处理', icon: 'shield' },
  { key: 'freeShipping', title: '全国包邮', desc: '该商品享受全国包邮服务', icon: 'gift' },
  { key: 'coldChain', title: '冷链直发', desc: '冷链仓发货，尽量保证商品鲜度', icon: 'truck' },
  { key: 'originDirect', title: '产地直发', desc: '源头产地打包后尽快安排发货', icon: 'truck' },
  { key: 'nextDay', title: '次日送达', desc: '部分地区支持次日送达服务', icon: 'lightning' },
];

const productAlbumList = ref<{ name: string; url: string }[]>([]);

const productForm = reactive({
  categoryId: '',
  title: '',
  subtitle: '',
  coverUrl: '',
  videoUrl: '',
  price: '0.00',
  stock: 0,
  originPlace: '',
  productNature: '',
  traceCode: '',
  traceDesc: '本商品全程冷链配送，支持农药残留抽检合格验证。',
  detailDesc: '',
  skuName: '默认规格',
  skuImageUrl: '',
  brand: '',
  supplierName: '',
  publishMode: 'PUBLISH',
  isHot: false,
  isPreSale: false,
  groupBuyEnabled: false,
  groupBuyNeeded: 3,
  groupBuyExpireHours: 24,
  groupBuyDiscountRate: 0.7,
  isMultiSpec: false,
  skuList: [
    {
      skuName: '默认规格',
      price: '0.00',
      stock: 0,
      imageUrl: '',
    }
  ],
  selectedTags: [] as string[],
});

function toggleServiceTag(key: string) {
  const index = productForm.selectedTags.indexOf(key);
  if (index > -1) {
    productForm.selectedTags.splice(index, 1);
  } else {
    productForm.selectedTags.push(key);
  }
}

function removeAlbumImage(index: number) {
  productAlbumList.value.splice(index, 1);
}

async function handleSingleUpload(file: File, callback: (url: string) => void) {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB');
    return;
  }
  try {
    const res = await uploadFile(file);
    callback(res.url);
    ElMessage.success('上传成功');
  } catch (error: any) {
    ElMessage.error(error.message || '上传失败');
  }
}

async function uploadCoverImage(options: any) {
  await handleSingleUpload(options.file, (url) => {
    productForm.coverUrl = url;
  });
}

async function uploadSkuImage(options: any) {
  await handleSingleUpload(options.file, (url) => {
    productForm.skuImageUrl = url;
  });
}

async function uploadAlbumImage(options: any) {
  await handleSingleUpload(options.file, (url) => {
    productAlbumList.value.push({ name: options.file.name, url });
  });
}

async function uploadRichImage(file: File) {
  let url = '';
  await handleSingleUpload(file, (uploaded) => {
    url = uploaded;
  });
  return url;
}

async function uploadTableSkuImage(file: File, index: number) {
  await handleSingleUpload(file, (url) => {
    productForm.skuList[index].imageUrl = url;
  });
}

async function uploadVideoFile(options: any) {
  const file = options.file;
  if (!file.type.startsWith('video/')) {
    ElMessage.error('只能上传视频文件');
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    ElMessage.error('视频大小不能超过 50MB');
    return;
  }
  try {
    const res = await uploadFile(file);
    productForm.videoUrl = res.url;
    ElMessage.success('视频上传成功');
  } catch (error: any) {
    ElMessage.error(error.message || '视频上传失败');
  }
}

function removeProductVideo() {
  productForm.videoUrl = '';
}

function addSkuRow() {
  productForm.skuList.push({
    skuName: '',
    price: '0.00',
    stock: 0,
    imageUrl: '',
  });
}

function removeSkuRow(index: number) {
  if (productForm.skuList.length > 1) {
    productForm.skuList.splice(index, 1);
  }
}

function resetProductForm() {
  const firstCategory = catalogCategories.value[0]?.children?.[0] ?? catalogCategories.value[0];
  productForm.categoryId = firstCategory ? String(firstCategory.id) : '';
  productForm.title = '';
  productForm.subtitle = '';
  productForm.coverUrl = '';
  productForm.videoUrl = '';
  productForm.price = '0.00';
  productForm.stock = 0;
  productForm.originPlace = '';
  productForm.productNature = '';
  productForm.traceCode = '';
  productForm.traceDesc = '本商品全程冷链配送，支持农药残留抽检合格验证。';
  productForm.detailDesc = '';
  productForm.skuName = '默认规格';
  productForm.skuImageUrl = '';
  productForm.brand = '';
  productForm.supplierName = '';
  productForm.publishMode = 'PUBLISH';
  productForm.isHot = false;
  productForm.isPreSale = false;
  productForm.groupBuyEnabled = false;
  productForm.groupBuyNeeded = 3;
  productForm.groupBuyExpireHours = 24;
  productForm.groupBuyDiscountRate = 0.7;
  productForm.isMultiSpec = false;
  productForm.skuList = [
    {
      skuName: '默认规格',
      price: '0.00',
      stock: 0,
      imageUrl: '',
    }
  ];
  productForm.selectedTags = [];
  productAlbumList.value = [];
  isEditingProduct.value = false;
  editingProductId.value = null;
}

const currentProductDetail = ref<any>(null);
const isProductDetailLoading = ref(false);
const isEditingProduct = ref(false);
const editingProductId = ref<number | null>(null);

async function loadProductDetail(productId: number) {
  isProductDetailLoading.value = true;
  try {
    const res = await getAdminProductDetail(productId);
    currentProductDetail.value = res;
  } catch (error: any) {
    ElMessage.error(error.message || '获取商品详情失败');
  } finally {
    isProductDetailLoading.value = false;
  }
}

const currentMerchantDetail = ref<any>(null);
const isMerchantDetailLoading = ref(false);

const editMerchantModal = reactive({
  open: false,
  id: null as number | null,
  storeName: '',
  storeLogo: '',
  contactName: '',
  contactMobile: '',
  commissionRate: '0.0000',
  status: 2,
});

async function loadMerchantDetail(merchantId: number) {
  isMerchantDetailLoading.value = true;
  try {
    const res = await getAdminMerchantDetail(merchantId);
    currentMerchantDetail.value = res;
  } catch (error: any) {
    ElMessage.error(error.message || '获取商户详情失败');
  } finally {
    isMerchantDetailLoading.value = false;
  }
}

function closeEditMerchantModal() {
  editMerchantModal.open = false;
  editMerchantModal.id = null;
  editMerchantModal.storeName = '';
  editMerchantModal.storeLogo = '';
  editMerchantModal.contactName = '';
  editMerchantModal.contactMobile = '';
  editMerchantModal.commissionRate = '0.0000';
  editMerchantModal.status = 2;
}

function startEditMerchant() {
  if (!currentMerchantDetail.value) return;
  const m = currentMerchantDetail.value;

  // Close details drawer
  actionPanel.value.open = false;

  // Populate edit modal
  editMerchantModal.id = m.id;
  editMerchantModal.storeName = m.storeName;
  editMerchantModal.storeLogo = m.storeLogo || '';
  editMerchantModal.contactName = m.contactName;
  editMerchantModal.contactMobile = m.contactMobile;
  editMerchantModal.commissionRate = m.commissionRate || '0.0000';
  editMerchantModal.status = m.status;

  editMerchantModal.open = true;
}

async function saveMerchantEditModal() {
  if (!editMerchantModal.id) return;
  try {
    await updateAdminMerchant(editMerchantModal.id, {
      storeName: editMerchantModal.storeName.trim(),
      storeLogo: editMerchantModal.storeLogo.trim(),
      contactName: editMerchantModal.contactName.trim(),
      contactMobile: editMerchantModal.contactMobile.trim(),
      commissionRate: editMerchantModal.commissionRate.trim(),
      status: Number(editMerchantModal.status),
    });
    ElMessage.success('商户信息保存成功');
    closeEditMerchantModal();
    await loadRows();
  } catch (error: any) {
    ElMessage.error(error.message || '保存商户信息失败');
  }
}

async function handleDeleteMerchant(rowOrNull: any = null) {
  const row = rowOrNull || actionPanelRow.value;
  if (!row) return;

  openDangerConfirm(
    '删除平台商户',
    `即将永久删除商户「${row.storeName ?? row.name ?? row.id}」，删除后该商户将失去所有平台权限，且相关联的商品及订单可能会受影响。`,
    '确认删除商户',
    async () => {
      try {
        await deleteAdminMerchant(row.id);
        ElMessage.success('商户删除成功');
        actionPanel.value.open = false;
        await loadRows();
      } catch (error: any) {
        ElMessage.error(error.message || '删除商户失败');
      }
    }
  );
}


function startEditProduct() {
  if (!currentProductDetail.value) return;
  const p = currentProductDetail.value;

  // Close details drawer
  actionPanel.value.open = false;

  // Enter editing mode
  isEditingProduct.value = true;
  editingProductId.value = p.id;

  // Populate form state
  productForm.categoryId = String(p.categoryId);
  productForm.title = p.title;
  productForm.subtitle = p.subtitle || '';
  productForm.coverUrl = p.coverUrl || '';
  productForm.videoUrl = p.videos?.[0]?.videoUrl || '';
  productForm.price = p.skus?.[0]?.price || '0.00';
  productForm.stock = p.skus?.[0]?.stock || 0;
  productForm.skuName = p.skus?.[0]?.skuName || '默认规格';
  productForm.skuImageUrl = p.skus?.[0]?.imageUrl || '';
  productForm.brand = p.brand || '';
  productForm.supplierName = p.supplierName || '';
  productForm.originPlace = p.originPlace || '';
  productForm.productNature = p.productNature || '';
  productForm.traceCode = p.traceCode || '';
  productForm.traceDesc = p.traceDesc || '本商品全程冷链配送，支持农药残留抽检合格验证。';
  productForm.detailDesc = p.detailDesc || '';
  productForm.publishMode = p.status === 'ON_SHELF' ? 'PUBLISH' : 'DRAFT';
  productForm.isHot = p.isHot;
  productForm.isPreSale = p.isPreSale;
  productForm.groupBuyEnabled = Boolean(p.groupBuyConfig?.enabled);
  productForm.groupBuyNeeded = Number(p.groupBuyConfig?.needed ?? 3);
  productForm.groupBuyExpireHours = Number(p.groupBuyConfig?.expireHours ?? 24);
  productForm.groupBuyDiscountRate = Number(p.groupBuyConfig?.discountRate ?? 0.7);

  // Set selected tags
  productForm.selectedTags = p.serviceTags?.map((tag: any) => tag.key) || [];

  // Set album list
  productAlbumList.value = p.images?.map((url: string) => ({ name: 'image', url })) || [];

  // Set spec mode
  if (p.skus && p.skus.length > 1) {
    productForm.isMultiSpec = true;
    productForm.skuList = p.skus.map((sku: any) => ({
      skuName: sku.skuName,
      price: sku.price,
      stock: sku.stock,
      imageUrl: sku.imageUrl,
    }));
  } else {
    productForm.isMultiSpec = false;
    productForm.skuList = [
      {
        skuName: p.skus?.[0]?.skuName || '默认规格',
        price: p.skus?.[0]?.price || '0.00',
        stock: p.skus?.[0]?.stock || 0,
        imageUrl: p.skus?.[0]?.imageUrl || '',
      }
    ];
  }

  // Open the drawer
  productCreateDrawer.open = true;
}

function handleDeleteProduct(rowOrNull: any = null) {
  const row = rowOrNull || actionPanelRow.value;
  if (!row) return;

  openDangerConfirm(
    '删除平台商品',
    `即将永久删除商品「${row.title ?? row.name ?? row.id}」，删除后该商品将不能再被用户购买，且所有历史订单中将隐藏详情。`,
    '确认删除商品',
    async () => {
      try {
        await deleteAdminProduct(row.id);
        ElMessage.success('商品删除成功');
        actionPanel.value.open = false;
        await loadRows();
      } catch (error: any) {
        ElMessage.error(error.message || '删除商品失败');
      }
    }
  );
}

const rejectModal = reactive({
  open: false,
  title: '',
  description: '',
  resourceKey: '' as ResourceKey | '',
  row: null as any,
  action: '',
});
const rejectReason = ref('');
const rejectError = ref('');

// Activity form modal — replaces window.prompt() with proper form inputs
const activityFormModal = reactive({
  open: false,
  title: '',
  resolve: null as ((value: Record<string, unknown> | null) => void) | null,
  activityName: '',
  activityType: 'SECKILL',
  startAt: '',
  endAt: '',
  status: 'DRAFT',
  productId: '',
  productTitle: '',
  productCoverUrl: '',
  originalPrice: '',
  activityPrice: '',
  stock: '0',
  limitPerUser: '1',
  warningStock: '0',
  stockMode: 'ACTIVITY_STOCK',
  needed: '3',
  expireHours: '24',
  thresholdAmount: '0.00',
  discountAmount: '0.00',
  couponStock: '100',
  perUserLimit: '1',
  depositAmount: '0.00',
  finalPaymentStartAt: '',
  finalPaymentEndAt: '',
  deliveryStartAt: '',
});

function openActivityFormModal(initial: Record<string, unknown> = {}): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const ruleJson =
      initial.ruleJson && typeof initial.ruleJson === 'object' && !Array.isArray(initial.ruleJson)
        ? (initial.ruleJson as Record<string, unknown>)
        : {};
    const products = Array.isArray(initial.products) ? initial.products : [];
    const firstProduct =
      products[0] && typeof products[0] === 'object'
        ? (products[0] as Record<string, unknown>)
        : {};

    activityFormModal.title = initial.activityName ? '编辑活动' : '新增活动';
    activityFormModal.resolve = resolve;
    activityFormModal.activityName = String(initial.activityName ?? initial.title ?? '');
    activityFormModal.activityType = String(initial.activityType ?? 'SECKILL').toUpperCase();
    activityFormModal.startAt = String(initial.startAt ?? '');
    activityFormModal.endAt = String(initial.endAt ?? '');
    activityFormModal.status = String(initial.status ?? 'DRAFT');
    activityFormModal.productId = String(firstProduct.productId ?? '');
    activityFormModal.productTitle = String(firstProduct.title ?? '');
    activityFormModal.productCoverUrl = String(firstProduct.coverUrl ?? '');
    activityFormModal.originalPrice = String(firstProduct.originalPrice ?? '');
    activityFormModal.activityPrice = String(firstProduct.activityPrice ?? '');
    activityFormModal.stock = String(firstProduct.stock ?? '0');
    activityFormModal.limitPerUser = String(ruleJson.limitPerUser ?? initial.limitPerUser ?? '1');
    activityFormModal.warningStock = String(ruleJson.warningStock ?? '0');
    activityFormModal.stockMode = String(ruleJson.stockMode ?? 'ACTIVITY_STOCK');
    activityFormModal.needed = String(ruleJson.needed ?? '3');
    activityFormModal.expireHours = String(ruleJson.expireHours ?? '24');
    activityFormModal.thresholdAmount = String(ruleJson.thresholdAmount ?? initial.thresholdAmount ?? '0.00');
    activityFormModal.discountAmount = String(ruleJson.discountAmount ?? initial.discountAmount ?? '0.00');
    activityFormModal.couponStock = String(ruleJson.couponStock ?? initial.stock ?? '100');
    activityFormModal.perUserLimit = String(ruleJson.perUserLimit ?? initial.perUserLimit ?? '1');
    activityFormModal.depositAmount = String(ruleJson.depositAmount ?? '0.00');
    activityFormModal.finalPaymentStartAt = String(ruleJson.finalPaymentStartAt ?? '');
    activityFormModal.finalPaymentEndAt = String(ruleJson.finalPaymentEndAt ?? '');
    activityFormModal.deliveryStartAt = String(ruleJson.deliveryStartAt ?? '');
    activityFormModal.open = true;
  });
}

function closeActivityFormModal() {
  activityFormModal.open = false;
  if (activityFormModal.resolve) {
    activityFormModal.resolve(null);
    activityFormModal.resolve = null;
  }
}

function submitActivityFormModal() {
  if (!activityFormModal.activityName.trim()) return;
  if (!activityFormModal.startAt || !activityFormModal.endAt) return;

  const normalizedType = activityFormModal.activityType.trim().toUpperCase() || 'SECKILL';
  const products: Array<Record<string, unknown>> = [];
  if (activityFormModal.productId) {
    products.push({
      productId: Number(activityFormModal.productId),
      title: activityFormModal.productTitle,
      coverUrl: activityFormModal.productCoverUrl,
      originalPrice: activityFormModal.originalPrice,
      activityPrice: activityFormModal.activityPrice,
      stock: Number(activityFormModal.stock || 0),
    });
  }

  const ruleJson: Record<string, unknown> = {};
  if (normalizedType === 'SECKILL') {
    ruleJson.type = 'SECKILL';
    ruleJson.startAt = activityFormModal.startAt;
    ruleJson.endAt = activityFormModal.endAt;
    ruleJson.limitPerUser = Number(activityFormModal.limitPerUser || 1);
    ruleJson.stockMode = activityFormModal.stockMode;
    ruleJson.warningStock = Number(activityFormModal.warningStock || 0);
  } else if (normalizedType === 'GROUP_BUY') {
    ruleJson.type = 'GROUP_BUY';
    ruleJson.needed = Number(activityFormModal.needed || 3);
    ruleJson.expireHours = Number(activityFormModal.expireHours || 24);
    ruleJson.limitPerUser = Number(activityFormModal.limitPerUser || 1);
  } else if (normalizedType === 'CASHBACK') {
    ruleJson.type = 'CASHBACK';
    ruleJson.thresholdAmount = activityFormModal.thresholdAmount;
    ruleJson.discountAmount = activityFormModal.discountAmount;
    ruleJson.couponStock = Number(activityFormModal.couponStock || 0);
    ruleJson.perUserLimit = Number(activityFormModal.perUserLimit || 1);
  } else if (normalizedType === 'PRESALE') {
    ruleJson.type = 'PRESALE';
    ruleJson.depositAmount = activityFormModal.depositAmount;
    ruleJson.finalPaymentStartAt = activityFormModal.finalPaymentStartAt;
    ruleJson.finalPaymentEndAt = activityFormModal.finalPaymentEndAt;
    ruleJson.deliveryStartAt = activityFormModal.deliveryStartAt;
    ruleJson.limitPerUser = Number(activityFormModal.limitPerUser || 1);
  }

  const payload = {
    title: activityFormModal.activityName,
    activityName: activityFormModal.activityName,
    activityType: normalizedType,
    startAt: activityFormModal.startAt,
    endAt: activityFormModal.endAt,
    products,
    productCount: products.length,
    ruleJson,
    status: activityFormModal.status,
  };

  activityFormModal.open = false;
  if (activityFormModal.resolve) {
    activityFormModal.resolve(payload);
    activityFormModal.resolve = null;
  }
}

// Danger confirmation modal — shown before any destructive action
const dangerConfirm = reactive({
  open: false,
  title: '',
  description: '',
  actionLabel: '',
  onConfirm: (() => {}) as () => void,
});

function openDangerConfirm(
  title: string,
  description: string,
  actionLabel: string,
  onConfirm: () => void,
) {
  dangerConfirm.open = true;
  dangerConfirm.title = title;
  dangerConfirm.description = description;
  dangerConfirm.actionLabel = actionLabel;
  dangerConfirm.onConfirm = onConfirm;
}

function closeDangerConfirm() {
  dangerConfirm.open = false;
}

function confirmDangerAction() {
  closeDangerConfirm();
  dangerConfirm.onConfirm();
}

// ——— Quick-lookup profile drawer ———
type ProfileEntry = { label: string; value: string; highlight?: boolean };

const profileDrawer = reactive({
  open: false,
  title: '',
  subtitle: '',
  fields: [] as ProfileEntry[],
});

async function openProfileDrawer(type: 'user' | 'merchant', id: number, name: string) {
  profileDrawer.open = true;
  profileDrawer.title = name;
  profileDrawer.subtitle = type === 'user' ? '用户画像' : '商户档案';
  profileDrawer.fields = [{ label: '加载中...', value: '正在请求后端数据' }];

  try {
    if (type === 'user') {
      const u = await getUserSummary(id);
      profileDrawer.fields = [
        { label: '昵称', value: u.nickname ?? '-' },
        { label: '手机号', value: u.mobile ?? '-' },
        { label: '角色', value: u.role ?? '-' },
        { label: '状态', value: u.status ?? '-' },
        { label: '累计订单', value: String(u.orderCount ?? 0), highlight: true },
        { label: '累计消费', value: `¥${Number(u.totalSpent ?? 0).toFixed(2)}`, highlight: true },
        { label: '注册时间', value: formatCell('createdAt', u) as string },
        { label: '最近登录', value: formatCell('lastLoginAt', u) as string },
      ];
    } else {
      const m = await getMerchantSummary(id);
      profileDrawer.fields = [
        { label: '店铺名称', value: m.storeName ?? '-' },
        { label: '联系人', value: m.contactName ?? '-' },
        { label: '联系电话', value: m.contactMobile ?? '-' },
        { label: '审核状态', value: statusLabel(String(m.auditStatus)) },
        { label: '在售商品', value: String(m.productCount ?? 0), highlight: true },
        { label: '累计订单', value: String(m.orderCount ?? 0), highlight: true },
        { label: '累计收入', value: `¥${Number(m.totalIncome ?? 0).toFixed(2)}`, highlight: true },
        { label: '入驻时间', value: formatCell('createdAt', m) as string },
      ];
    }
  } catch {
    profileDrawer.fields = [{ label: '加载失败', value: '无法获取详情，请稍后重试' }];
  }
}

// ——— Refund three-column drawer ———
type DetailField = { label: string; value: string };

const refundDrawer = reactive({
  open: false,
  title: '',
  subtitle: '',
  refundNo: '',
  userFields: [] as DetailField[],
  userEvidence: [] as string[],
  merchantFields: [] as DetailField[],
  merchantEvidence: [] as string[],
  orderFields: [] as DetailField[],
});

function openRefundDrawer(row: any) {
  refundDrawer.open = true;
  refundDrawer.title = `售后仲裁 — ${row.refundNo}`;
  refundDrawer.subtitle = `订单号 ${row.orderNo} · 金额 ¥${Number(row.amount).toFixed(2)}`;
  refundDrawer.refundNo = row.refundNo;
  refundDrawer.userFields = [
    { label: '用户', value: row.userName ?? '-' },
    { label: '申请金额', value: `¥${Number(row.amount).toFixed(2)}` },
    { label: '申请时间', value: formatCell('createdAt', row) as string },
    { label: '退款状态', value: statusLabel(String(row.status)) },
  ];
  refundDrawer.userEvidence = row.userEvidence ?? [];
  refundDrawer.merchantFields = [
    { label: '商户', value: row.merchantName ?? '-' },
    { label: '申诉状态', value: String(row.status) === 'MERCHANT_REPLIED' ? '已回复' : '待回复' },
    { label: '处理时限', value: '3 个工作日' },
  ];
  refundDrawer.merchantEvidence = row.merchantEvidence ?? [];
  refundDrawer.orderFields = [
    { label: '仲裁进度', value: statusLabel(String(row.status)) },
    { label: '处理建议', value: String(row.status) === 'PENDING_ARBITRATION' ? '请核对双方举证后裁定' : '可查看历史处理结果' },
  ];
  rejectReason.value = '';
}

async function arbitrateFromDrawer(action: 'approve' | 'reject') {
  const reason = rejectReason.value.trim() || (action === 'approve' ? '平台判定同意退款' : '平台判定驳回退款');
  try {
    await arbitrateRefund(refundDrawer.refundNo, action, reason);
    actionMessage.value = `售后单「${refundDrawer.refundNo}」已${action === 'approve' ? '同意退款' : '驳回'}`;
    refundDrawer.open = false;
    await loadRows();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '仲裁操作失败';
  }
}

function previewImage(src: string) {
  window.open(src, '_blank');
}

function promptFormValue(label: string, initialValue = '') {
  const nextValue = window.prompt(label, initialValue);
  if (nextValue === null) {
    return null;
  }
  return nextValue.trim();
}

function parseBooleanInput(value: string | null, fallback = false) {
  if (value == null || value === '') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === '是' || normalized === '启用';
}

function collectLogisticsPayload(initial: Record<string, unknown> = {}) {
  const name = promptFormValue('规则名称', String(initial.name ?? initial.ruleName ?? ''));
  if (name === null) return null;
  const province = promptFormValue('适用地区', String(initial.province ?? '全国'));
  if (province === null) return null;
  const thresholdAmount = promptFormValue('包邮门槛金额', String(initial.thresholdAmount ?? 0));
  if (thresholdAmount === null) return null;
  const freightAmount = promptFormValue('运费金额', String(initial.freightAmount ?? 0));
  if (freightAmount === null) return null;
  const activeRaw = promptFormValue('是否启用（true/false）', String(initial.active ?? true));
  if (activeRaw === null) return null;

  return {
    name,
    province,
    thresholdAmount: Number(thresholdAmount || 0),
    freightAmount: Number(freightAmount || 0),
    active: parseBooleanInput(activeRaw, Boolean(initial.active ?? true)),
  };
}

function openRejectModal(title: string, description: string, resourceKey: ResourceKey, row: any, action: string) {
  rejectReason.value = '';
  rejectError.value = '';
  rejectModal.open = true;
  rejectModal.title = title;
  rejectModal.description = description;
  rejectModal.resourceKey = resourceKey;
  rejectModal.row = row;
  rejectModal.action = action;
}

function closeRejectModal() {
  rejectModal.open = false;
  rejectReason.value = '';
  rejectError.value = '';
}

async function confirmReject() {
  const reason = rejectReason.value.trim();
  if (!reason) {
    rejectError.value = '请填写驳回原因';
    return;
  }

  rejectError.value = '';

  try {
    if (rejectModal.resourceKey === 'products' && rejectModal.action === 'takedown') {
      await takedownProduct(rejectModal.row.id, reason);
      actionMessage.value = `商品「${rejectModal.row.title ?? rejectModal.row.id}」已下架，原因已推送商家：${reason}`;
    } else if (rejectModal.resourceKey === 'merchants') {
      await auditMerchant(rejectModal.row.id, 4, reason);
      actionMessage.value = `商户「${rejectModal.row.storeName ?? rejectModal.row.name ?? rejectModal.row.id}」已驳回，原因：${reason}`;
    } else if (rejectModal.resourceKey === 'products') {
      await auditProduct(rejectModal.row.id, 4, reason);
      actionMessage.value = `商品「${rejectModal.row.title ?? rejectModal.row.id}」已驳回，原因：${reason}`;
    } else if (rejectModal.resourceKey === 'refunds') {
      await arbitrateRefund(rejectModal.row.refundNo, 'reject', reason);
      actionMessage.value = `售后单「${rejectModal.row.refundNo}」已驳回，原因：${reason}`;
    } else if (rejectModal.resourceKey === 'withdraws') {
      await auditWithdraw(rejectModal.row.withdrawNo || rejectModal.row.applyNo, 4, reason);
      actionMessage.value = `提现单「${rejectModal.row.withdrawNo || rejectModal.row.applyNo}」已驳回，原因：${reason}`;
    } else if (rejectModal.resourceKey === 'activities') {
      await endActivity(rejectModal.row.id, reason);
      actionMessage.value = `活动「${rejectModal.row.activityName ?? rejectModal.row.title ?? rejectModal.row.id}」已强制下线，原因：${reason}`;
    }

    rejectModal.open = false;
    rejectReason.value = '';
    await loadRows();
  } catch (error) {
    rejectError.value = error instanceof Error ? error.message : '驳回操作失败';
  }
}

const config = computed(() => resourceConfigs[props.resourceKey]);
const filterDefs = computed(() => config.value.filters ?? []);
const keyword = computed(() => String(route.query.q ?? ''));
const activeFilterValues = computed<Record<string, string>>(() => {
  const values: Record<string, string> = {};

  for (const filter of filterDefs.value) {
    values[filter.key] = getQueryValue(filter.key);
  }

  return values;
});
const hasAnyFilters = computed(
  () => Boolean(keyword.value) || filterDefs.value.some((filter) => Boolean(activeFilterValues.value[filter.key])),
);
const visibleRows = computed(() =>
  rows.value.filter((row) =>
    filterDefs.value.every((filter) => matchesFilter(row, filter.key, activeFilterValues.value[filter.key])),
  ),
);
const searchSummary = computed(() => {
  const parts: string[] = [keyword.value || '全部'];

  for (const filter of filterDefs.value) {
    const value = activeFilterValues.value[filter.key];
    if (!value) {
      continue;
    }

    const option = filter.options.find((item) => item.value === value);
    parts.push(`${filter.label}：${option?.label ?? value}`);
  }

  return parts.join(' · ');
});

const summaryCards = computed(() => {
  const totalCount = visibleRows.value.length;
  const auditCount = visibleRows.value.filter((item) =>
    ['PENDING_AUDIT', 'PENDING_REVIEW', 'PENDING_ARBITRATION'].includes(String(item.auditStatus ?? item.status)),
  ).length;
  const okCount = visibleRows.value.filter((item) =>
    ['APPROVED', 'NORMAL', 'ON_SHELF', 'RUNNING', 'TO_SHIP', 'COMPLETED', true].includes(
      item.auditStatus ?? item.status ?? item.active,
    ),
  ).length;
  const dangerCount = Math.max(totalCount - auditCount - okCount, 0);

  const auditNote = auditCount > 0
    ? '<span class="mini-warn">需要运营跟进</span>'
    : '<span class="mini-muted">暂无待办</span>';

  const okNote = okCount > 0
    ? '<span class="mini-ok">状态稳定</span>'
    : '<span class="mini-muted">暂无正常项</span>';

  const dangerNote = dangerCount > 0
    ? '<span class="mini-danger">需要关注</span>'
    : '<span class="mini-muted">暂无风险</span>';

  return [
    { title: '总记录', value: totalCount, note: '当前页面拉取到的有效数据' },
    { title: '待处理', value: auditCount, note: auditNote },
    { title: '正常项', value: okCount, note: okNote },
    { title: '风险项', value: dangerCount, note: dangerNote },
  ];
});

watch(
  () => route.fullPath,
  () => {
    void loadRows();
  },
);

watch(
  currentPage,
  (value) => {
    pageInput.value = value;
  },
  { immediate: true },
);

onMounted(() => {
  void loadCatalogCategories();
  if (props.resourceKey === 'coupons') {
    void loadMerchantOptions();
  }
  void loadRows();
  if (refreshApi) {
    const unregister = refreshApi.register(() => {
      void loadCatalogCategories();
      if (props.resourceKey === 'coupons') {
        void loadMerchantOptions();
      }
      void loadRows();
    });
    onBeforeUnmount(() => unregister());
  }
});

async function loadCatalogCategories() {
  try {
    catalogCategories.value = await getCatalogCategories();
    if (!productForm.categoryId) {
      const firstCategory = catalogCategories.value[0]?.children?.[0] ?? catalogCategories.value[0];
      productForm.categoryId = firstCategory ? String(firstCategory.id) : '';
    }
  } catch (error) {
    catalogCategories.value = [];
    if (props.resourceKey === 'products') {
      actionError.value = error instanceof Error ? error.message : '分类加载失败';
    }
  }
}

async function loadMerchantOptions() {
  if (props.resourceKey !== 'coupons') {
    return;
  }
  try {
    const data = await getMerchants({ page: 1, pageSize: 100 });
    merchantOptions.value = (data.items ?? []).map((item: any) => ({
      id: Number(item.id),
      storeName: String(item.storeName ?? item.name ?? `店铺 ${item.id}`),
    }));
  } catch (error) {
    merchantOptions.value = [];
    if (props.resourceKey === 'coupons') {
      actionError.value = error instanceof Error ? error.message : '店铺加载失败';
    }
  }
}

async function loadRows(): Promise<boolean> {
  loading.value = true;
  actionError.value = '';

  try {
    const query = buildServerQuery();

    switch (props.resourceKey) {
      case 'users': {
        const data = await getUsers(query);
        rows.value = data.items;
        total.value = data.total;
        break;
      }
      case 'merchants': {
        const data = await getMerchants(query);
        rows.value = data.items;
        total.value = data.total;
        break;
      }
      case 'products': {
        const data = await getProducts(query);
        rows.value = data.items;
        total.value = data.total;
        break;
      }
      case 'coupons': {
        const data = await getCoupons(query);
        rows.value = data.items;
        total.value = data.total;
        break;
      }
      case 'activities': {
        const data = await getActivities(query);
        rows.value = data;
        total.value = data.length;
        break;
      }
      case 'orders': {
        const data = await getOrders(query);
        rows.value = data.items;
        total.value = data.total;
        break;
      }
      case 'refunds': {
        const data = await getRefunds(query);
        rows.value = data.items;
        total.value = data.total;
        break;
      }
      case 'withdraws': {
        const data = await getWithdraws(query);
        rows.value = data.items;
        total.value = data.total;
        break;
      }
      case 'logistics': {
        const data = await getLogisticsRules(query);
        rows.value = data;
        total.value = data.length;
        break;
      }

      default:
        rows.value = [];
        total.value = 0;
    }

    if (supportsPagination.value && total.value > 0) {
      const lastPage = Math.max(1, Math.ceil(total.value / pageSize.value));
      if (currentPage.value > lastPage) {
        setPage(lastPage);
        return true;
      }
    }
    return true;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '数据加载异常';
    return false;
  } finally {
    loading.value = false;
  }
}

function handleReload() {
  void refreshWithFeedback(() => loadRows());
}

function resetFilters() {
  const nextQuery = { ...route.query } as Record<string, string | string[] | undefined>;

  delete nextQuery.q;
  delete nextQuery.page;

  for (const filter of filterDefs.value) {
    delete nextQuery[filter.key];
  }

  router.replace({ path: route.path, query: nextQuery });
}

function handleFilterChange(filterKey: string, event: Event) {
  const target = event.target as HTMLSelectElement;
  updateQueryValue(filterKey, target.value, true);
}

function buildServerQuery() {
  const query: Record<string, string | number | boolean> = {
    keyword: keyword.value,
    page: supportsPagination.value ? currentPage.value : 1,
    pageSize: supportsPagination.value ? pageSize.value : 100,
  };

  for (const key of ['status', 'auditStatus', 'payStatus', 'deliveryStatus', 'active', 'userType', 'productNature', 'deliveryType', 'type']) {
    const value = getQueryValue(key);
    if (value) {
      query[key] = value;
    }
  }

  return query;
}

function goToPage(page: number) {
  if (!supportsPagination.value) {
    return;
  }

  const next = Math.min(Math.max(Math.floor(Number(page) || 1), 1), totalPages.value);
  setPage(next);
}

async function handleSecondaryAction() {
  try {
    await downloadRowsAsCsv();
    actionMessage.value = `${config.value.secondaryAction} 已导出为 CSV`;
    actionError.value = '';
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '导出失败';
  }
}

async function handlePrimaryAction() {
  if (props.resourceKey === 'activities') {
    const payload = await openActivityFormModal({
      activityName: '',
      activityType: 'SECKILL',
      startAt: '',
      endAt: '',
      productCount: 0,
      status: 'DRAFT',
    });
    if (!payload) {
      return;
    }

    try {
      await createActivity(payload);
      actionMessage.value = `活动「${String(payload.activityName ?? payload.title ?? '')}」已创建`;
      await loadRows();
    } catch (error) {
      actionError.value = error instanceof Error ? error.message : '活动创建失败';
    }
    return;
  }

    if (props.resourceKey === 'users') {
      openStaticPanel(
      '用户管理说明',
      '用户列表直接展示真实数据，支持详情查看和状态切换。',
      [
        { label: '可用操作', value: '详情 / 切换状态' },
        { label: '当前筛选', value: searchSummary.value || '全部' },
      ],
      null,
    );
    return;
  }

  if (props.resourceKey === 'merchants') {
    openStaticPanel(
      '商户管理说明',
      '商户列表直接展示审核与经营信息，支持审核和驳回。',
      [
        { label: '可用操作', value: '审核 / 驳回' },
        { label: '当前筛选', value: searchSummary.value || '全部' },
      ],
      null,
    );
    return;
  }

  if (props.resourceKey === 'products') {
    openProductCreateDrawer();
    return;
  }

  if (props.resourceKey === 'coupons') {
    openCouponDrawer();
    return;
  }

  if (props.resourceKey === 'refunds') {
    openStaticPanel(
      '售后仲裁说明',
      '售后列表直接处理退款争议，审批动作会回写订单状态。',
      [
        { label: '可用操作', value: '同意 / 驳回' },
        { label: '当前筛选', value: searchSummary.value || '全部' },
      ],
      null,
    );
    return;
  }

  if (props.resourceKey === 'logistics') {
    const payload = collectLogisticsPayload({
      name: '',
      province: '全国',
      thresholdAmount: 0,
      freightAmount: 0,
      active: true,
    });
    if (!payload) {
      return;
    }

    try {
      await createLogisticsRule(payload);
      actionMessage.value = `物流规则「${payload.name as string}」已创建`;
      await loadRows();
    } catch (error) {
      actionError.value = error instanceof Error ? error.message : '物流规则创建失败';
    }
    return;
  }

  openStaticPanel(
    config.value.primaryAction,
    `当前资源以列表管理和详情查看为主，先看已接入的运营能力。`,
    [
      { label: '搜索提示', value: config.value.searchPlaceholder },
      { label: '可见记录', value: String(visibleRows.value.length) },
    ],
    null,
  );
}

function rowKey(row: any) {
  return row.id ?? row.orderNo ?? row.refundNo ?? row.name ?? JSON.stringify(row);
}

function isStatusCell(key: string) {
  return ['status', 'auditStatus', 'payStatus', 'deliveryStatus', 'active'].includes(key);
}

function isProfileLink(key: string, row: any) {
  if (props.resourceKey !== 'orders') return false;
  if (key === 'userName' && row.userId != null) return true;
  if (key === 'merchantName' && row.merchantId != null) return true;
  return false;
}

function handleProfileClick(key: string, row: any) {
  if (key === 'userName' && row.userId != null) {
    openProfileDrawer('user', Number(row.userId), String(row.userName));
  } else if (key === 'merchantName' && row.merchantId != null) {
    openProfileDrawer('merchant', Number(row.merchantId), String(row.merchantName));
  }
}

const ACTIVITY_TYPE_MAP: Record<string, string> = {
  SECKILL: '秒杀',
  GROUP_BUY: '拼团',
  CASHBACK: '满减',
};

const COUPON_TYPE_MAP: Record<string, string> = {
  CASHBACK: '满减券',
  NEW_USER: '新人券',
  RETURNING_USER: '回归券',
};

const AMOUNT_KEYS = new Set([
  'walletAmount',
  'minPrice',
  'maxPrice',
  'amount',
  'totalAmount',
  'payAmount',
  'discountAmount',
  'thresholdAmount',
  'freightAmount',
]);

const TIME_KEYS = new Set([
  'createdAt',
  'updatedAt',
  'lastLoginAt',
  'startAt',
  'endAt',
  'publishAt',
  'validStartAt',
  'validEndAt',
]);

function formatTime(raw: unknown): string {
  if (raw == null || raw === '') return '-';
  const d = new Date(String(raw));
  if (isNaN(d.getTime())) return String(raw);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`;
}

function formatCell(key: string, row: any) {
  const value = row[key];

  if (key === 'status') {
    return statusLabel(String(value));
  }

  if (key === 'auditStatus') {
    return statusLabel(String(value));
  }

  if (key === 'activityType') {
    return ACTIVITY_TYPE_MAP[String(value)] ?? value ?? '-';
  }

  if (key === 'type' && props.resourceKey === 'coupons') {
    return COUPON_TYPE_MAP[String(value)] ?? value ?? '-';
  }

  if (key === 'deliveryType') {
    if (value === 2 || String(value) === '2') return '预售商品';
    if (value === 1 || String(value) === '1') return '现货商品';
    return value ?? '-';
  }

  if (key === 'payStatus') {
    return value === 1 ? '已支付' : '待支付';
  }

  if (key === 'deliveryStatus') {
    return value === 2 ? '已发货' : value === 1 ? '待发货' : '未发货';
  }

  if (key === 'remainingStock') {
    return String(value ?? 0);
  }

  if (key === 'active') {
    return value ? '启用' : '停用';
  }

  if (AMOUNT_KEYS.has(key)) {
    return `¥${Number(value).toFixed(2)}`;
  }

  if (TIME_KEYS.has(key)) {
    return formatTime(value);
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }

  return value ?? '-';
}

function statusLabel(value: string) {
  const map: Record<string, string> = {
    NORMAL: '正常',
    DISABLED: '禁用',
    APPROVED: '已通过',
    PENDING_AUDIT: '待审核',
    REJECTED: '已拒绝',
    ON_SHELF: '已上架',
    OFF_SHELF: '已下架',
    DRAFT: '草稿',
    RUNNING: '进行中',
    ENDED: '已结束',
    PENDING_PAY: '待支付',
    TO_SHIP: '待发货',
    COMPLETED: '已完成',
    PENDING_ARBITRATION: '待仲裁',
    MERCHANT_REPLIED: '商家回复',
    REVOKED: '已撤回',
    ENABLED: '启用',
  };

  return map[value] ?? value;
}

function statusClass(key: string, row: any) {
  const value = String(row[key]);

  if (['NORMAL', 'APPROVED', 'ON_SHELF', 'RUNNING', 'COMPLETED', 'TO_SHIP', 'ENABLED'].includes(value) || row[key] === true) {
    return 'ok';
  }

  if (['PENDING_AUDIT', 'PENDING_PAY', 'PENDING_ARBITRATION', 'MERCHANT_REPLIED'].includes(value)) {
    return 'warn';
  }

  if (['DISABLED', 'REJECTED', 'OFF_SHELF', 'DRAFT', 'REVOKED'].includes(value) || row[key] === false) {
    return 'danger';
  }

  return 'blue';
}

function rowActions(row: any) {
  switch (props.resourceKey) {
    case 'users':
      return [
        { key: 'view', label: '详情' },
        { key: 'toggle', label: '切换状态' },
      ];
    case 'merchants': {
      const actions = [
        { key: 'view', label: '详情' },
        { key: 'edit', label: '编辑' },
        { key: 'delete', label: '删除' },
      ];
      if (String(row.auditStatus) === 'PENDING_AUDIT') {
        return [
          { key: 'audit', label: '审核' },
          { key: 'reject', label: '拒绝' },
          ...actions,
        ];
      }
      if (String(row.auditStatus) === 'APPROVED') {
        return [
          ...actions,
          { key: 'revoke', label: '撤回' },
        ];
      }
      return actions;
    }
    case 'products': {
      const actions = [
        { key: 'view', label: '详情' },
        { key: 'edit', label: '编辑' },
        { key: 'delete', label: '删除' },
      ];
      if (String(row.auditStatus) === 'PENDING_AUDIT') {
        return [
          { key: 'audit', label: '审核' },
          { key: 'reject', label: '拒绝' },
          ...actions,
        ];
      }
      if (String(row.auditStatus) === 'APPROVED') {
        const approvedActions = [...actions];
        approvedActions.push({ key: 'revoke', label: '撤回' });
        if (String(row.status) === 'ON_SHELF') {
          approvedActions.push({ key: 'takedown', label: '下架' });
        }
        return approvedActions;
      }
      return actions;
    }
    case 'activities': {
      const actions = [
        { key: 'view', label: '详情' },
        { key: 'edit', label: '编辑' },
        { key: 'copy', label: '复制' },
      ];
      const status = String(row.status);
      if (status === 'DRAFT' || status === 'PAUSED') {
        actions.push({ key: 'publish', label: '发布' });
      }
      if (status === 'RUNNING') {
        actions.push({ key: 'pause', label: '暂停' });
        actions.push({ key: 'finish', label: '结束' });
        actions.push({ key: 'forceEnd', label: '强制下线' });
      }
      return actions;
    }
    case 'orders': {
      const isCompleted = String(row.status) === 'COMPLETED' || Number(row.deliveryStatus) === 2;
      if (isCompleted) {
        return [{ key: 'detail', label: '详情' }];
      }
      return [
        { key: 'detail', label: '详情' },
        { key: 'ship', label: '查看履约' },
      ];
    }
    case 'refunds': {
      const arbitrationStatuses = ['PENDING_ARBITRATION', 'MERCHANT_REPLIED'];
      if (arbitrationStatuses.includes(String(row.status))) {
        return [
          { key: 'approve', label: '同意' },
          { key: 'reject', label: '驳回' },
        ];
      }
      return [{ key: 'view', label: '详情' }];
    }
    case 'withdraws': {
      if (String(row.status) === 'PENDING' || String(row.status) === '待审核') {
        return [
          { key: 'approve', label: '通过' },
          { key: 'reject', label: '驳回' },
        ];
      }
      return [{ key: 'view', label: '详情' }];
    }
    case 'logistics':
      return [
        { key: 'view', label: '详情' },
        { key: 'edit', label: '编辑' },
        { key: 'toggle', label: String(row.active) === 'true' || row.active === true ? '停用' : '启用' },
        { key: 'delete', label: '删除' },
      ];
    case 'coupons':
      return [
        { key: 'view', label: '详情' },
        { key: 'edit', label: '编辑' },
        { key: 'toggle', label: '上下架' },
        { key: 'issue', label: '发放' },
        { key: 'delete', label: '删除' },
      ];

    default:
      return [{ key: 'view', label: '详情' }];
  }
}

async function handleRowAction(action: string, row: any) {
  actionError.value = '';

  try {
    if (props.resourceKey === 'merchants' && action === 'audit') {
      await auditMerchant(row.id);
      actionMessage.value = `商户「${row.storeName ?? row.name ?? row.id}」已通过审核`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'merchants' && action === 'reject') {
      openDangerConfirm(
        '驳回商户入驻申请',
        `即将驳回商户「${row.storeName ?? row.name ?? row.id}」的入驻申请，此操作不可撤销。`,
        '驳回商户',
        () => openRejectModal('驳回商户申请', '请填写驳回原因通知商户', 'merchants', row, action),
      );
      return;
    }

    if (props.resourceKey === 'merchants' && action === 'revoke') {
      openDangerConfirm(
        '撤回商户审核',
        `即将撤回商户「${row.storeName ?? row.name ?? row.id}」的已审核状态，撤回后商户将失去经营权限。`,
        '撤回审核',
        async () => {
          await auditMerchant(row.id, 2, '管理员撤回审核');
          actionMessage.value = `商户「${row.storeName ?? row.name ?? row.id}」已撤回审核，状态已重置`;
          await loadRows();
        },
      );
      return;
    }

    if (props.resourceKey === 'merchants' && (action === 'view' || action === 'detail')) {
      await loadMerchantDetail(row.id);
      actionPanelRow.value = row;
      actionPanel.value = {
        open: true,
        title: '商户详情',
        description: '查看平台自营商户及第三方商户的完整资质和基础信息。',
        fields: [],
        routeTo: null,
      };
      return;
    }

    if (props.resourceKey === 'merchants' && action === 'edit') {
      await loadMerchantDetail(row.id);
      startEditMerchant();
      return;
    }

    if (props.resourceKey === 'merchants' && action === 'delete') {
      handleDeleteMerchant(row);
      return;
    }

    if (props.resourceKey === 'products' && action === 'audit') {
      await auditProduct(row.id);
      actionMessage.value = `商品「${row.title ?? row.name ?? row.id}」已通过审核`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'products' && action === 'reject') {
      openDangerConfirm(
        '驳回商品审核',
        `即将驳回商品「${row.title ?? row.name ?? row.id}」的审核，此操作不可撤销。`,
        '驳回商品',
        () => openRejectModal('驳回商品审核', '请填写驳回原因通知商家', 'products', row, action),
      );
      return;
    }

    if (props.resourceKey === 'products' && action === 'revoke') {
      openDangerConfirm(
        '撤回商品审核',
        `即将撤回商品「${row.title ?? row.name ?? row.id}」的已审核状态，撤回后商品将自动下架。`,
        '撤回审核',
        async () => {
          await auditProduct(row.id, 2, '管理员撤回审核');
          actionMessage.value = `商品「${row.title ?? row.name ?? row.id}」已撤回审核，商品已下架`;
          await loadRows();
        },
      );
      return;
    }

    if (props.resourceKey === 'products' && action === 'takedown') {
      openDangerConfirm(
        '下架商品',
        `即将下架商品「${row.title ?? row.name ?? row.id}」，下架后商品将在C端不可见。`,
        '下架商品',
        () => openRejectModal('下架商品', '请填写下架原因，该信息将推送给商家', 'products', row, 'takedown'),
      );
      return;
    }

    if (props.resourceKey === 'products' && (action === 'view' || action === 'detail')) {
      await loadProductDetail(row.id);
      actionPanelRow.value = row;
      actionPanel.value = {
        open: true,
        title: '商品详情',
        description: '查看平台自营商品的完整信息。',
        fields: [],
        routeTo: null,
      };
      return;
    }

    if (props.resourceKey === 'products' && action === 'edit') {
      await loadProductDetail(row.id);
      startEditProduct();
      return;
    }

    if (props.resourceKey === 'products' && action === 'delete') {
      handleDeleteProduct(row);
      return;
    }

    if (props.resourceKey === 'refunds' && action === 'view') {
      openRefundDrawer(row);
      return;
    }

    if (props.resourceKey === 'refunds' && action === 'approve') {
      await arbitrateRefund(row.refundNo, 'approve');
      actionMessage.value = `售后单「${row.refundNo}」已同意退款`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'refunds' && action === 'reject') {
      openDangerConfirm(
        '驳回退款申请',
        `即将驳回售后单「${row.refundNo}」的退款请求，确认后款项将返回商户。`,
        '驳回退款',
        () => openRejectModal('驳回退款申请', '请填写驳回判定原因', 'refunds', row, action),
      );
      return;
    }

    if (props.resourceKey === 'withdraws' && action === 'approve') {
      await auditWithdraw(row.withdrawNo || row.applyNo, 3);
      actionMessage.value = `提现单「${row.withdrawNo || row.applyNo}」已审核通过`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'withdraws' && action === 'reject') {
      openDangerConfirm(
        '驳回提现申请',
        `即将驳回提现单「${row.withdrawNo || row.applyNo}」的申请，款项将退回商户余额。`,
        '驳回提现',
        () => openRejectModal('驳回提现申请', '请填写驳回原因', 'withdraws', row, action),
      );
      return;
    }

    if (props.resourceKey === 'orders' && action === 'detail') {
      await router.push(`/orders/${row.orderNo}`);
      return;
    }

    if (props.resourceKey === 'activities' && action === 'edit') {
      const detail = await getActivityDetail(Number(row.id));
      const payload = await openActivityFormModal({ ...row, ...(detail && typeof detail === 'object' ? detail : {}) });
      if (!payload) {
        return;
      }
      await updateActivity(row.id, payload);
      actionMessage.value = `活动「${row.activityName ?? row.title ?? row.id}」已更新`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'activities' && action === 'publish') {
      if (!row.startAt || !row.endAt) {
        actionError.value = '活动开始时间和结束时间不能为空，请先编辑活动补充时间';
        return;
      }
      await publishActivity(row.id);
      actionMessage.value = `活动「${row.activityName ?? row.title ?? row.id}」已发布`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'activities' && action === 'pause') {
      await pauseActivity(row.id);
      actionMessage.value = `活动「${row.activityName ?? row.title ?? row.id}」已暂停`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'activities' && action === 'finish') {
      await finishActivity(row.id);
      actionMessage.value = `活动「${row.activityName ?? row.title ?? row.id}」已结束`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'activities' && action === 'copy') {
      await createActivity({
        title: `${row.activityName ?? row.title ?? '活动'}（复制）`,
        activityName: `${row.activityName ?? row.title ?? '活动'}（复制）`,
        activityType: row.activityType ?? 'SECKILL',
        startAt: row.startAt ?? '2026-06-08 10:00:00',
        endAt: row.endAt ?? '2026-06-08 22:00:00',
        products: [],
      });
      actionMessage.value = `活动「${row.activityName ?? row.title ?? row.id}」已复制为新草稿`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'users' && action === 'view') {
      openRecordPanel('用户详情', row, '查看用户基础信息、状态和最近登录情况。');
      return;
    }

    if (props.resourceKey === 'users' && action === 'toggle') {
      const nextStatus = row.status === 'NORMAL' ? 'DISABLED' : 'NORMAL';
      await updateAdminUserStatus(
        row.id,
        nextStatus,
        nextStatus === 'DISABLED' ? '列表页禁用用户' : '列表页恢复用户',
      );
      actionMessage.value = `用户「${row.nickname ?? row.mobile ?? row.id}」状态已切换为 ${statusLabel(nextStatus)}`;
      await loadRows();
      return;
    }

    if (action === 'view') {
      openRecordPanel(actionLabel(action), row, '查看这条记录的完整信息。');
      return;
    }

    if (props.resourceKey === 'activities' && action === 'forceEnd') {
      openDangerConfirm(
        '强制下线活动',
        `即将强制下线活动「${row.activityName ?? row.title ?? row.id}」，正在进行中的活动将被中断。`,
        '强制下线',
        () => openRejectModal('强制下线活动', '请填写下线原因', 'activities', row, action),
      );
      return;
    }

    if (props.resourceKey === 'orders' && action === 'ship') {
      openRecordPanel('履约详情', row, '列表页已切换为真实履约查看入口，发货/改单请继续接入对应接口。', `/orders/${row.orderNo}`);
      return;
    }

    if (props.resourceKey === 'logistics' && action === 'edit') {
      const payload = collectLogisticsPayload(row);
      if (!payload) {
        return;
      }
      await updateLogisticsRule(row.id, payload);
      actionMessage.value = `物流规则「${row.name ?? row.ruleName ?? row.id}」已更新`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'logistics' && action === 'toggle') {
      await updateLogisticsRule(row.id, { active: !row.active });
      actionMessage.value = `物流规则「${row.name ?? row.ruleName ?? row.id}」已切换为 ${row.active ? '停用' : '启用'}`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'logistics' && action === 'delete') {
      openDangerConfirm(
        '删除物流规则',
        `即将删除物流规则「${row.name ?? row.ruleName ?? row.id}」，该操作不可撤销。`,
        '删除规则',
        async () => {
          await deleteLogisticsRule(row.id);
          actionMessage.value = `物流规则「${row.name ?? row.ruleName ?? row.id}」已删除`;
          await loadRows();
        },
      );
      return;
    }

    if (props.resourceKey === 'coupons' && action === 'view') {
      openRecordPanel('优惠券详情', row, '查看优惠券的完整信息、库存和统计数据。');
      return;
    }

    if (props.resourceKey === 'coupons' && action === 'edit') {
      openCouponDrawer(row);
      return;
    }

    if (props.resourceKey === 'coupons' && action === 'toggle') {
      await updateCouponStatus(row.id, row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED');
      actionMessage.value = `优惠券「${row.name ?? row.id}」状态已更新`;
      await loadRows();
      return;
    }

    if (props.resourceKey === 'coupons' && action === 'issue') {
      openCouponIssueModal(row);
      return;
    }

    if (props.resourceKey === 'coupons' && action === 'delete') {
      openDangerConfirm(
        '删除优惠券',
        `即将删除优惠券「${row.name ?? row.id}」，删除后前台将不再展示该券。`,
        '删除优惠券',
        async () => {
          await deleteCoupon(row.id);
          actionMessage.value = `优惠券「${row.name ?? row.id}」已删除`;
          await loadRows();
        },
      );
      return;
    }

    openRecordPanel(actionLabel(action), row, '查看这条记录的完整信息。');
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '操作失败';
  }
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    view: '详情',
    detail: '详情',
    toggle: '切换状态',
    audit: '审核',
    reject: '拒绝',
    revoke: '撤回审核',
    copy: '复制',
    ship: '录入物流',
    approve: '同意',
    edit: '编辑',
    forceEnd: '强制下线',
    takedown: '下架',
  };

  return map[action] ?? action;
}

const actionPanelRow = ref<any>(null);
const isEditing = ref(false);
const editForm = reactive({
  nickname: '',
  mobile: '',
});

const editUserModal = reactive({
  open: false,
  row: null as any,
  nickname: '',
  mobile: '',
  avatarUrl: '',
});

function closeEditUserModal() {
  editUserModal.open = false;
}

function openRecordPanel(title: string, row: any, description: string, routeTo: string | null = null) {
  actionPanelRow.value = row;
  isEditing.value = false;
  const fields = buildDetailFields(row);
  actionPanel.value = {
    open: true,
    title,
    description,
    fields,
    routeTo,
  };
}

function openStaticPanel(title: string, description: string, fields: RowDetailField[], routeTo: string | null = null) {
  actionPanel.value = {
    open: true,
    title,
    description,
    fields,
    routeTo,
  };
}

function openProductCreateDrawer() {
  productCreateDrawer.open = true;
  productCreateError.value = '';
  resetProductForm();
}

function closeProductCreateDrawer() {
  productCreateDrawer.open = false;
  productCreateError.value = '';
}

function toDatetimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function resetCouponForm() {
  couponForm.name = '';
  couponForm.type = 'CASHBACK';
  couponForm.thresholdAmount = '0.00';
  couponForm.discountAmount = '0.00';
  couponForm.stock = 0;
  couponForm.validStartAt = '';
  couponForm.validEndAt = '';
  couponForm.scope = 'ALL';
  couponForm.perUserLimit = 1;
  couponForm.categoryIds = [];
  couponForm.merchantIds = [];
  couponForm.newUserDays = 7;
  couponForm.inactiveDays = 30;
  couponForm.status = 'ENABLED';
}

function openCouponDrawer(row?: any) {
  couponFormError.value = '';
  if (row) {
    editingCouponId.value = Number(row.id);
    couponForm.name = row.name ?? '';
    couponForm.type = row.type ?? 'CASHBACK';
    couponForm.thresholdAmount = String(row.thresholdAmount ?? '0.00');
    couponForm.discountAmount = String(row.discountAmount ?? '0.00');
    couponForm.stock = Number(row.stock ?? 0);
    couponForm.validStartAt = toDatetimeLocalValue(row.validStartAt);
    couponForm.validEndAt = toDatetimeLocalValue(row.validEndAt);
    couponForm.scope = row.scope ?? 'ALL';
    couponForm.perUserLimit = Number(row.perUserLimit ?? 1);
    couponForm.categoryIds = Array.isArray(row.ruleJson?.categoryIds)
      ? row.ruleJson.categoryIds.map((item: number | string) => String(item))
      : [];
    couponForm.merchantIds = Array.isArray(row.ruleJson?.merchantIds)
      ? row.ruleJson.merchantIds.map((item: number | string) => String(item))
      : [];
    couponForm.newUserDays = Number(row.ruleJson?.userRule?.newUserDays ?? 7);
    couponForm.inactiveDays = Number(row.ruleJson?.userRule?.inactiveDays ?? 30);
    couponForm.status = row.status ?? 'ENABLED';
  } else {
    editingCouponId.value = null;
    resetCouponForm();
  }
  couponDrawer.open = true;
}

function closeCouponDrawer() {
  couponDrawer.open = false;
  couponFormError.value = '';
  editingCouponId.value = null;
  resetCouponForm();
}

function openCouponIssueModal(row: any) {
  couponFormError.value = '';
  couponIssueModal.open = true;
  couponIssueModal.couponId = Number(row.id);
  couponIssueModal.name = row.name ?? `优惠券 #${row.id}`;
  couponIssueModal.selectedUser = null;
  couponIssueSearch.keyword = '';
  couponIssueSearch.results = [];
  void searchCouponUsers();
}

function closeCouponIssueModal() {
  couponIssueModal.open = false;
  couponIssueModal.couponId = null;
  couponIssueModal.name = '';
  couponIssueModal.selectedUser = null;
  couponIssueSearch.keyword = '';
  couponIssueSearch.results = [];
}

async function searchCouponUsers() {
  if (couponIssueSearch.loading) {
    return;
  }

  couponIssueSearch.loading = true;
  couponFormError.value = '';
  try {
    const keyword = couponIssueSearch.keyword.trim();
    const data = await getUsers({
      keyword,
      page: 1,
      pageSize: 8,
    });
    couponIssueSearch.results = (data.items ?? []).map((item: any) => ({
      id: Number(item.id),
      nickname: String(item.nickname ?? ''),
      mobile: String(item.mobile ?? ''),
    }));
  } catch (error) {
    couponFormError.value = error instanceof Error ? error.message : '搜索用户失败';
  } finally {
    couponIssueSearch.loading = false;
  }
}

function selectCouponIssueUser(user: { id: number; nickname: string; mobile: string }) {
  couponIssueModal.selectedUser = user;
}

function buildCouponPayload() {
  return {
    name: couponForm.name.trim(),
    type: couponForm.type,
    thresholdAmount: couponForm.thresholdAmount.trim(),
    discountAmount: couponForm.discountAmount.trim(),
    stock: Number(couponForm.stock || 0),
    validStartAt: couponForm.validStartAt ? new Date(couponForm.validStartAt).toISOString() : null,
    validEndAt: couponForm.validEndAt ? new Date(couponForm.validEndAt).toISOString() : null,
    scope: couponForm.scope,
    perUserLimit: Number(couponForm.perUserLimit || 1),
    categoryIds: couponForm.categoryIds
      .map((item) => Number(item))
      .filter((id) => Number.isFinite(id) && id > 0),
    merchantIds: couponForm.merchantIds
      .map((item) => Number(item))
      .filter((id) => Number.isFinite(id) && id > 0),
    userRule: couponForm.type === 'CASHBACK'
      ? undefined
      : {
          type: couponForm.type,
          newUserDays: Number(couponForm.newUserDays || 7),
          inactiveDays: Number(couponForm.inactiveDays || 30),
          autoIssue: true,
        },
    newUserDays: Number(couponForm.newUserDays || 7),
    inactiveDays: Number(couponForm.inactiveDays || 30),
    autoIssue: couponForm.type !== 'CASHBACK',
    status: couponForm.status,
  };
}

async function submitCouponForm() {
  if (couponFormLoading.value) {
    return;
  }

  couponFormLoading.value = true;
  couponFormError.value = '';
  try {
    const payload = buildCouponPayload();
    if (!payload.name) {
      throw new Error('请填写券名称');
    }
    if (payload.discountAmount === '' || Number(payload.discountAmount) <= 0) {
      throw new Error('请填写正确的优惠金额');
    }
    if (editingCouponId.value != null) {
      await updateCoupon(editingCouponId.value, payload);
      actionMessage.value = `优惠券「${payload.name}」已保存`;
    } else {
      await createCoupon(payload);
      actionMessage.value = `优惠券「${payload.name}」已创建`;
    }
    couponDrawer.open = false;
    editingCouponId.value = null;
    await loadRows();
  } catch (error) {
    couponFormError.value = error instanceof Error ? error.message : '保存优惠券失败';
  } finally {
    couponFormLoading.value = false;
  }
}

async function submitCouponIssue() {
  if (couponFormLoading.value || couponIssueModal.couponId == null) {
    return;
  }

  couponFormLoading.value = true;
  couponFormError.value = '';
  try {
    const userId = couponIssueModal.selectedUser?.id;
    if (!userId) {
      throw new Error('请先选择一个用户');
    }
    await issueCoupon(couponIssueModal.couponId, userId);
    actionMessage.value = `优惠券「${couponIssueModal.name}」已发放给用户 #${userId}`;
    closeCouponIssueModal();
    await loadRows();
  } catch (error) {
    couponFormError.value = error instanceof Error ? error.message : '发放优惠券失败';
  } finally {
    couponFormLoading.value = false;
  }
}

async function submitProductCreate() {
  if (productCreateLoading.value) {
    return;
  }

  productCreateLoading.value = true;
  productCreateError.value = '';

  try {
    // Validations
    if (!productForm.categoryId) {
      throw new Error('请选择商品类目');
    }
    if (!productForm.title.trim()) {
      throw new Error('请填写商品标题');
    }
    if (!productForm.coverUrl.trim()) {
      throw new Error('请上传商品封面图');
    }

    const priceRegex = /^\d+(\.\d+)?$/;
    let skus: Array<{
      skuName: string;
      skuCode: string;
      imageUrl: string;
      price: string;
      originalPrice: string;
      stock: number;
      specJson: Record<string, string>;
    }> = [];
    let defaultPrice = '0.00';
    let defaultStock = 0;
    let defaultSkuName = '默认规格';
    let defaultSkuImageUrl = '';

    if (!productForm.isMultiSpec) {
      // Single spec validation
      if (!priceRegex.test(productForm.price.trim())) {
        throw new Error('商品单价格式不正确');
      }
      if (Number(productForm.stock) < 0) {
        throw new Error('库存不能小于 0');
      }

      defaultPrice = productForm.price.trim();
      defaultStock = Number(productForm.stock || 0);
      defaultSkuName = productForm.skuName.trim() || '默认规格';
      defaultSkuImageUrl = productForm.skuImageUrl.trim();

      skus = [
        {
          skuName: defaultSkuName,
          skuCode: `SKU-${Date.now()}`,
          imageUrl: defaultSkuImageUrl,
          price: defaultPrice,
          originalPrice: defaultPrice,
          stock: defaultStock,
          specJson: {},
        },
      ];
    } else {
      // Multi spec validation
      if (productForm.skuList.length === 0) {
        throw new Error('多规格模式下，请至少添加一个规格');
      }

      skus = productForm.skuList.map((sku, index) => {
        if (!sku.skuName.trim()) {
          throw new Error(`请输入第 ${index + 1} 个规格的规格名称`);
        }
        if (!priceRegex.test(sku.price.trim())) {
          throw new Error(`第 ${index + 1} 个规格的单价格式不正确`);
        }
        if (Number(sku.stock) < 0) {
          throw new Error(`第 ${index + 1} 个规格的库存不能小于 0`);
        }
        return {
          skuName: sku.skuName.trim(),
          skuCode: `SKU-${Date.now()}-${index}`,
          imageUrl: sku.imageUrl.trim(),
          price: sku.price.trim(),
          originalPrice: sku.price.trim(),
          stock: Number(sku.stock || 0),
          specJson: { 规格: sku.skuName.trim() },
        };
      });

      defaultPrice = skus[0].price;
      defaultStock = skus.reduce((sum, item) => sum + item.stock, 0);
      defaultSkuName = skus[0].skuName;
      defaultSkuImageUrl = skus[0].imageUrl;
    }

    const images = Array.from(
      new Set(
        [productForm.coverUrl.trim(), ...productAlbumList.value.map(item => item.url.trim())].filter(Boolean),
      ),
    );
    const serviceTags = AVAILABLE_TAGS.filter(t => productForm.selectedTags.includes(t.key));
    const videos = productForm.videoUrl.trim()
      ? [
          {
            videoUrl: productForm.videoUrl.trim(),
            coverUrl: productForm.coverUrl.trim() || null,
          },
        ]
      : [];
    const traceCode = productForm.traceCode.trim();
    const traceDesc = productForm.traceDesc.trim();
    const traceInfo = traceCode || traceDesc
      ? {
          traceCode: traceCode || `TRACE-${Date.now()}`,
          traceDesc,
        }
      : undefined;

    const payload = {
      categoryId: Number(productForm.categoryId),
      title: productForm.title.trim(),
      subtitle: productForm.subtitle.trim(),
      coverUrl: productForm.coverUrl.trim(),
      price: defaultPrice,
      originalPrice: defaultPrice,
      stock: defaultStock,
      originPlace: productForm.originPlace.trim(),
      productNature: productForm.productNature.trim(),
      detailDesc: productForm.detailDesc.trim(),
      skuName: defaultSkuName,
      skuImageUrl: defaultSkuImageUrl,
      images,
      serviceTags,
      deliveryType: productForm.selectedTags.includes('coldChain') ? 2 : 1,
      videos,
      traceInfo,
      brand: productForm.brand.trim(),
      supplierName: productForm.supplierName.trim(),
      publishImmediately: productForm.publishMode === 'PUBLISH',
      isHot: productForm.isHot,
      isPreSale: productForm.isPreSale,
      groupBuyConfig: productForm.groupBuyEnabled ? {
        enabled: true,
        needed: Math.max(Number(productForm.groupBuyNeeded || 3), 2),
        expireHours: Math.max(Number(productForm.groupBuyExpireHours || 24), 1),
        discountRate: Math.min(Math.max(Number(productForm.groupBuyDiscountRate || 0.7), 0.1), 0.95),
      } : {
        enabled: false,
        needed: Math.max(Number(productForm.groupBuyNeeded || 3), 2),
        expireHours: Math.max(Number(productForm.groupBuyExpireHours || 24), 1),
        discountRate: Math.min(Math.max(Number(productForm.groupBuyDiscountRate || 0.7), 0.1), 0.95),
      },
      skus,
    };

    if (isEditingProduct.value) {
      await updateAdminProduct(editingProductId.value!, payload);
      actionMessage.value = '平台商品已保存';
    } else {
      await createAdminProduct(payload);
      actionMessage.value = '平台商品已创建';
    }

    await loadRows();
    closeProductCreateDrawer();
  } catch (error) {
    productCreateError.value = error instanceof Error ? error.message : (isEditingProduct.value ? '修改平台商品失败' : '创建平台商品失败');
  } finally {
    productCreateLoading.value = false;
  }
}

function buildDetailFields(row: any): RowDetailField[] {
  return config.value.columns
    .filter((column) => column.key !== 'actions')
    .map((column) => ({
      label: column.label,
      value: formatCell(column.key, row),
    }));
}

function closeActionPanel() {
  actionPanel.value.open = false;
}

function goActionRoute() {
  if (actionPanel.value.routeTo) {
    router.push(actionPanel.value.routeTo);
  }
}

async function downloadRowsAsCsv() {
  const headers = config.value.columns.filter((column) => column.key !== 'actions');
  const lines = [
    headers.map((column) => escapeCsv(column.label)).join(','),
    ...visibleRows.value.map((row) =>
      headers
        .map((column) => {
          const rawValue = formatCell(column.key, row);
          return escapeCsv(String(rawValue));
        })
        .join(','),
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `farm-admin-${props.resourceKey}-${Date.now()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string) {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function getQueryValue(key: string) {
  const value = route.query[key];

  if (Array.isArray(value)) {
    return String(value[0] ?? '');
  }

  return String(value ?? '');
}

function parsePageNumber(value: unknown, fallback = 1) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parsePageSize(value: unknown, fallback = 20) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(100, Math.max(20, Math.floor(parsed)));
}

function setPage(page: number) {
  const nextQuery = { ...route.query } as Record<string, string | string[] | undefined>;
  const safePage = Math.max(1, Math.floor(Number(page) || 1));

  if (safePage <= 1) {
    delete nextQuery.page;
  } else {
    nextQuery.page = String(safePage);
  }

  router.replace({ path: route.path, query: nextQuery });
}

function updateQueryValue(key: string, value: string, resetPage = false) {
  const nextQuery = { ...route.query } as Record<string, string | string[] | undefined>;

  if (value) {
    nextQuery[key] = value;
  } else {
    delete nextQuery[key];
  }

  if (resetPage) {
    delete nextQuery.page;
  }

  router.replace({ path: route.path, query: nextQuery });
}

function matchesFilter(row: any, key: string, value: string) {
  if (!value) {
    return true;
  }

  if (key === 'pointsTier') {
    const points = Number(row.points || 0);
    if (value === 'hasPoints') return points > 0;
    if (value === 'highPoints') return points > 100;
    if (value === 'vipPoints') return points > 500;
    return true;
  }

  if (key === 'buyerTier') {
    const orders = Number(row.orderCount || 0);
    if (value === 'ordered') return orders > 0;
    if (value === 'loyal') return orders >= 5;
    if (value === 'vipBuyer') return orders >= 15;
    return true;
  }

  if (key === 'userType') {
    const role = row.role || 'USER';
    if (value === 'GUEST') return role === 'GUEST' || !String(row.mobile ?? '').trim();
    if (value === 'REGULAR') return role === 'USER' && Boolean(String(row.mobile ?? '').trim());
    return true;
  }

  const cell = row[key];

  if (key === 'active') {
    return value === 'true' ? Boolean(cell) : !Boolean(cell);
  }

  if (key === 'productNature') {
    return String(cell ?? '').includes(value);
  }

  return String(cell ?? '') === value;
}

function getFieldValue(fields: RowDetailField[], label: string): string {
  const f = fields.find(item => item.label === label);
  return f ? f.value : '-';
}

function getAvatarChar(fields: RowDetailField[]): string {
  const name = getFieldValue(fields, '用户昵称');
  return name && name !== '-' ? name.charAt(0).toUpperCase() : 'U';
}

function getUserStatusClass(fields: RowDetailField[]): string {
  const status = getFieldValue(fields, '状态');
  return status === '正常' ? 'status-online' : 'status-offline';
}

function getUserTier(fields: RowDetailField[]): string {
  const orders = Number(getFieldValue(fields, '订单数') || '0');
  if (orders >= 15) return '黄金果农';
  if (orders >= 5) return '资深农友';
  return '农场萌新';
}

function isGuestUser(row: any): boolean {
  return row?.role === 'GUEST' || !String(row?.mobile ?? '').trim();
}

function openPointAdjustModal() {
  if (!actionPanelRow.value) return;
  const row = actionPanelRow.value;
  pointAdjustError.value = '';
  pointAdjustModal.open = true;
  pointAdjustModal.userId = Number(row.id);
  pointAdjustModal.nickname = row.nickname || '';
  pointAdjustModal.mobile = row.mobile || '';
  pointAdjustModal.mode = 'INCREASE';
  pointAdjustModal.amount = 50;
  pointAdjustModal.remark = '后台手动发放积分';
}

function closePointAdjustModal() {
  pointAdjustModal.open = false;
  pointAdjustModal.userId = null;
  pointAdjustModal.nickname = '';
  pointAdjustModal.mobile = '';
  pointAdjustModal.mode = 'INCREASE';
  pointAdjustModal.amount = 50;
  pointAdjustModal.remark = '';
  pointAdjustError.value = '';
}

async function submitPointAdjust() {
  if (pointAdjustLoading.value || pointAdjustModal.userId == null) {
    return;
  }

  const amount = Math.trunc(Number(pointAdjustModal.amount ?? 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    pointAdjustError.value = '请输入大于 0 的整数积分';
    return;
  }

  pointAdjustLoading.value = true;
  pointAdjustError.value = '';
  try {
    const signedPoints = pointAdjustModal.mode === 'INCREASE' ? amount : -amount;
    const result = await adjustAdminUserPoints({
      userId: pointAdjustModal.userId,
      points: signedPoints,
      remark: pointAdjustModal.remark.trim(),
    });
    const direction = signedPoints > 0 ? '增加' : '扣减';
    actionMessage.value = `已${direction}用户 #${result.userId} ${Math.abs(signedPoints)} 分，当前余额 ${result.balance}。`;
    closePointAdjustModal();
    await loadRows();
  } catch (error) {
    pointAdjustError.value = error instanceof Error ? error.message : '调整积分失败';
  } finally {
    pointAdjustLoading.value = false;
  }
}

function openUserCouponIssueModal() {
  if (!actionPanelRow.value) return;
  const row = actionPanelRow.value;
  userCouponIssueError.value = '';
  userCouponIssueModal.open = true;
  userCouponIssueModal.userId = Number(row.id);
  userCouponIssueModal.nickname = row.nickname || '';
  userCouponIssueModal.mobile = row.mobile || '';
  userCouponIssueModal.selectedCoupon = null;
  userCouponIssueSearch.keyword = '';
  userCouponIssueSearch.results = [];
  void searchUserCouponIssueCoupons();
}

function closeUserCouponIssueModal() {
  userCouponIssueModal.open = false;
  userCouponIssueModal.userId = null;
  userCouponIssueModal.nickname = '';
  userCouponIssueModal.mobile = '';
  userCouponIssueModal.selectedCoupon = null;
  userCouponIssueSearch.keyword = '';
  userCouponIssueSearch.results = [];
  userCouponIssueError.value = '';
}

async function searchUserCouponIssueCoupons() {
  if (userCouponIssueSearch.loading) {
    return;
  }

  userCouponIssueSearch.loading = true;
  userCouponIssueError.value = '';
  try {
    const keyword = userCouponIssueSearch.keyword.trim();
    const data = await getCoupons({
      keyword,
      page: 1,
      pageSize: 8,
      status: 'ENABLED',
    });
    userCouponIssueSearch.results = (data.items ?? []).map((item: any) => ({
      id: Number(item.id),
      name: String(item.name ?? ''),
      type: String(item.type ?? ''),
      thresholdAmount: String(item.thresholdAmount ?? '0.00'),
      discountAmount: String(item.discountAmount ?? '0.00'),
      remainingStock: Number(item.remainingStock ?? 0),
    }));
  } catch (error) {
    userCouponIssueError.value = error instanceof Error ? error.message : '搜索优惠券失败';
  } finally {
    userCouponIssueSearch.loading = false;
  }
}

function selectUserCouponIssueCoupon(coupon: { id: number; name: string; type: string; thresholdAmount: string; discountAmount: string; remainingStock: number }) {
  userCouponIssueModal.selectedCoupon = coupon;
}

async function submitUserCouponIssue() {
  if (userCouponIssueLoading.value || userCouponIssueModal.userId == null) {
    return;
  }

  if (!userCouponIssueModal.selectedCoupon) {
    userCouponIssueError.value = '请先选择一个优惠券';
    return;
  }

  userCouponIssueLoading.value = true;
  userCouponIssueError.value = '';
  try {
    await issueCoupon(userCouponIssueModal.selectedCoupon.id, userCouponIssueModal.userId);
    actionMessage.value = `优惠券「${userCouponIssueModal.selectedCoupon.name}」已发放给用户 #${userCouponIssueModal.userId}`;
    closeUserCouponIssueModal();
    await loadRows();
  } catch (error) {
    userCouponIssueError.value = error instanceof Error ? error.message : '发放优惠券失败';
  } finally {
    userCouponIssueLoading.value = false;
  }
}

function startEditUser() {
  if (!actionPanelRow.value) return;
  const row = actionPanelRow.value;
  editUserModal.row = row;
  editUserModal.nickname = row.nickname || '';
  editUserModal.mobile = row.mobile || '';
  editUserModal.avatarUrl = row.avatarUrl || '';
  editUserModal.open = true;
}

async function saveUserEditModal() {
  try {
    if (editUserModal.row) {
      const row = editUserModal.row;
      try {
        await fetch(`/api/admin/users/${row.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('farm-admin-token') ?? ''}`
          },
          body: JSON.stringify({
            nickname: editUserModal.nickname,
            mobile: editUserModal.mobile,
            avatarUrl: editUserModal.avatarUrl,
          }),
        });
      } catch (err) {
        actionError.value = err instanceof Error ? err.message : '接口未实现，用户信息修改失败';
        return;
      }

      actionMessage.value = '用户信息修改成功！';
      editUserModal.open = false;
    }
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '保存失败';
  }
}

async function deleteUserAccount(userId: number) {
  await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('farm-admin-token') ?? ''}`
    }
  });
}

function handleDeleteUser() {
  if (!actionPanelRow.value) return;
  const row = actionPanelRow.value;
  openDangerConfirm(
    '注销用户账号',
    `您即将彻底注销用户「${row.nickname ?? row.mobile ?? row.id}」的农场账号。注销后该用户的积分将被清空，且在C端小程序上将无法再次登录，此操作不可撤销！`,
    '彻底注销',
    async () => {
      try {
        await deleteUserAccount(row.id);
        actionMessage.value = `用户「${row.nickname ?? row.mobile ?? row.id}」已成功注销。`;
        actionPanel.value.open = false;
        await loadRows();
      } catch (error) {
        actionError.value = error instanceof Error ? error.message : '注销失败，接口未实现';
      }
    }
  );
}

function getUserTierLabel(orderCount: number | string): string {
  const count = Number(orderCount || 0);
  if (count >= 15) return '黄金果农';
  if (count >= 5) return '资深农友';
  return '农场萌新';
}

function getUserTierClass(orderCount: number | string): string {
  const count = Number(orderCount || 0);
  if (count >= 15) return 'badge-gold';
  if (count >= 5) return 'badge-green';
  return 'badge-gray';
}

</script>

<style>
/* User Table Cell Meta */
.user-cell-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  text-align: left;
}

.user-avatar-mini {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--green-soft);
  display: grid;
  place-items: center;
  color: var(--green);
  font-weight: 800;
  font-size: 14px;
}

.user-cell-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-cell-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.user-cell-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
  align-self: flex-start;
}

.badge-gold {
  background: var(--gold-soft);
  color: var(--warn);
  border: 1px solid rgba(17, 17, 17, 0.12);
}

.badge-green {
  background: var(--green-soft);
  color: var(--green-2);
  border: 1px solid rgba(17, 17, 17, 0.12);
}

.badge-gray {
  background: #f1f3f0;
  color: var(--muted);
  border: 1px solid #e1e3e0;
}

.coupon-user-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow: auto;
  padding-right: 4px;
}

.coupon-user-result {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel);
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.18s ease;
}

.coupon-user-result:hover {
  border-color: var(--green-2);
  transform: translateY(-1px);
}

.coupon-user-result.selected {
  border-color: var(--green-2);
  box-shadow: 0 0 0 1px rgba(17, 17, 17, 0.12);
  background: rgba(17, 17, 17, 0.04);
}

/* User Profile Card Styles */
.user-profile-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px 4px;
  text-align: left;
}

.user-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
}

.user-avatar-badge {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: linear-gradient(135deg, #f7f7f7, #ffffff);
  display: grid;
  place-items: center;
  box-shadow: 0 8px 16px rgba(17, 17, 17, 0.06);
}

.avatar-char {
  font-size: 28px;
  font-weight: 800;
  color: var(--green);
}

.user-status-dot {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid var(--panel);
}

.status-online {
  background: var(--green-2);
}

.status-offline {
  background: var(--danger);
}

.user-meta-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name-group h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
}

.user-phone {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Assets Grid */
.user-assets-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.asset-card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.asset-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.point-asset {
  background: linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
}

.order-asset {
  background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%);
}

.asset-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
}

.asset-val-wrap {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.asset-value {
  font-size: 28px;
  font-weight: 900;
  color: var(--text);
}

.asset-unit {
  font-size: 12px;
  color: var(--muted);
}

.mini-action-btn {
  margin-top: 6px;
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-600);
  background: var(--brand-50);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--brand-100);
  transition: background 0.2s;
}

.mini-action-btn:hover {
  background: var(--brand-600);
  color: #fff;
}

/* Timeline */
.user-timeline-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.user-timeline-section h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
}

.profile-timeline {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 14px;
}

.profile-timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: var(--line);
  z-index: 1;
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
  padding-bottom: 20px;
  z-index: 2;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--line);
  display: grid;
  place-items: center;
  font-size: 11px;
  color: var(--muted);
  font-weight: 800;
  flex-shrink: 0;
}

.timeline-item.done .timeline-dot {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green);
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
}

.timeline-content strong {
  font-size: 13px;
  color: var(--text);
}

.timeline-item.done .timeline-content strong {
  color: var(--green);
}

.timeline-content p {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.user-avatar-mini-img {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.user-avatar-img {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  object-fit: cover;
}

.role-tag--guest {
  background: #f1f3f0 !important;
  color: var(--muted) !important;
  border: 1px solid #e1e3e0 !important;
}

.upload-placeholder-box--compact {
  min-height: 100px;
  padding: 20px 16px;
}

.video-preview {
  object-fit: contain;
  background: #000;
  height: 140px;
}

.video-delete-btn {
  opacity: 1;
  z-index: 10;
}

/* Form Section Formatting */
.form-section {
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px 18px;
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 0;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Premium Uploader Styles */
.premium-uploader {
  width: 100%;
}

.cover-uploader {
  display: block;
  width: 100%;
  border: 2px dashed var(--line, #e2e8e2);
  border-radius: 8px;
  background: var(--panel, #ffffff);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.cover-uploader:hover {
  border-color: var(--green, #187857);
  background: rgba(17, 17, 17, 0.02);
}

.upload-placeholder-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: var(--muted, #869e8f);
  text-align: center;
  min-height: 140px;
}

.upload-icon {
  margin-bottom: 8px;
  color: var(--muted, #869e8f);
  transition: transform 0.2s ease;
}

.cover-uploader:hover .upload-icon {
  transform: translateY(-2px);
  color: var(--green, #187857);
}

.upload-text-main {
  font-size: 14px;
  font-weight: 700;
  color: var(--text, #111111);
  margin-bottom: 4px;
}

.upload-text-sub {
  font-size: 12px;
  color: var(--muted, #869e8f);
}

.image-preview-container {
  position: relative;
  width: 100%;
  min-height: 140px;
  max-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #f7faf7;
}

.uploaded-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-action-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-preview-container:hover .image-action-overlay {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  color: #333;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #ffffff;
  transform: scale(1.05);
}

/* Album Uploader Grid */
.album-uploader-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.album-item-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line, #e2e8e2);
  background: #f7faf7;
}

.album-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
}

.album-item-card:hover .album-delete-btn {
  opacity: 1;
}

.album-delete-btn:hover {
  background: var(--danger, #d9534f);
  transform: scale(1.1);
}

.album-uploader-add {
  display: block;
}

.album-uploader-add :deep(.el-upload) {
  display: block;
  width: 100%;
  height: 100%;
}

.add-placeholder {
  aspect-ratio: 1;
  border: 2px dashed var(--line, #e2e8e2);
  border-radius: 8px;
  background: var(--panel, #ffffff);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--muted, #869e8f);
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-placeholder:hover {
  border-color: var(--green, #187857);
  color: var(--green, #187857);
  background: rgba(17, 17, 17, 0.02);
}

/* Spec Mode Selector */
.spec-mode-selector {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.spec-radio-card {
  flex: 1;
  border: 1px solid var(--line, #e2e8e2);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  background: var(--panel, #ffffff);
}

.spec-radio-card.active {
  border-color: var(--green, #187857);
  background: rgba(17, 17, 17, 0.03);
  box-shadow: 0 0 0 1px #111111;
}

.radio-label-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text, #111111);
  margin-bottom: 4px;
}

.radio-label-desc {
  font-size: 11px;
  color: var(--muted, #869e8f);
}

.hidden-radio {
  display: none;
}

/* Single Spec Layout */
.single-spec-grid {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.form-grid-3 {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.sku-image-upload-wrap {
  width: 100px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sku-image-upload-wrap .field-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
}

.sku-mini-uploader {
  display: block;
}

.sku-mini-uploader :deep(.el-upload) {
  display: block;
  width: 100%;
}

.sku-mini-preview, .sku-mini-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  border: 1px dashed var(--line, #e2e8e2);
}

.sku-mini-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sku-mini-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 10px;
  padding: 2px 0;
  text-align: center;
}

.sku-mini-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  gap: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sku-mini-placeholder:hover {
  border-color: var(--green);
  color: var(--green);
}

/* Multi Spec Layout */
.multi-spec-container {
  width: 100%;
}

.spec-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
  text-align: left;
}

.spec-table th {
  padding: 8px 12px;
  background: #f7faf7;
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
  border-bottom: 1px solid var(--line);
}

.spec-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}

.table-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 13px;
  background: var(--panel);
  color: var(--text);
  box-sizing: border-box;
}

.table-input:focus {
  border-color: var(--green);
  outline: none;
}

.sku-table-uploader {
  display: inline-block;
  vertical-align: middle;
}

.sku-table-preview, .sku-table-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  border: 1px dashed var(--line);
}

.sku-table-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sku-table-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 9px;
  text-align: center;
}

.sku-table-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--muted);
  cursor: pointer;
}

.sku-table-placeholder:hover {
  border-color: var(--green);
  color: var(--green);
}

.table-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.table-action-btn:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
  background: #fff8f8;
}

.table-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.add-sku-row-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border: 1px dashed var(--green);
  border-radius: 8px;
  background: rgba(17, 17, 17, 0.02);
  color: var(--green);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-sku-row-btn:hover {
  background: rgba(17, 17, 17, 0.06);
  transform: translateY(-1px);
}

/* Service Tags Selector */
.service-tags-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
  margin-top: 6px;
}

.tag-select-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  background: var(--panel);
  transition: all 0.2s ease;
  user-select: none;
}

.tag-select-card:hover {
  border-color: var(--green);
  background: rgba(17, 17, 17, 0.01);
}

.tag-select-card.active {
  border-color: var(--green);
  background: rgba(17, 17, 17, 0.04);
}

.tag-card-checkbox {
  width: 16px;
  height: 16px;
  border: 1px solid var(--line);
  border-radius: 4px;
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.tag-select-card.active .tag-card-checkbox {
  border-color: var(--green);
  background: var(--green);
}

.checkbox-inner {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 1px;
  background: transparent;
  transition: all 0.2s ease;
}

.tag-select-card.active .checkbox-inner {
  background: #ffffff;
}

.tag-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tag-card-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.tag-card-desc {
  font-size: 10px;
  color: var(--muted);
  line-height: 1.2;
}

/* Product Profile Details Card Styles */
.product-profile-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px 4px;
  text-align: left;
}

.product-hero-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.product-cover-preview {
  width: 100%;
  height: 220px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--line);
  flex-shrink: 0;
}

.product-hero-info {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  flex: 1;
  min-width: 0;
  gap: 8px;
}

.product-category-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--green);
  background: var(--green-soft);
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
  margin-bottom: 4px;
}

.product-title-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 2px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-subtitle-text {
  font-size: 11px;
  color: var(--muted);
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-price-stock {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-val {
  font-size: 18px;
  font-weight: 800;
  color: var(--green-2, #187857);
}

.stock-val {
  font-size: 12px;
  color: var(--muted);
}

/* Product Meta grid */
.product-meta-section {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
}

.meta-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.group-buy-summary {
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--brand-50);
}

.group-buy-summary__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.group-buy-summary__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(17, 17, 17, 0.12);
}

.group-buy-summary__label {
  font-size: 11px;
  color: var(--muted);
}

.meta-item {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  font-size: 12px;
  gap: 4px;
}

.meta-label {
  color: var(--muted);
  width: auto;
  flex-shrink: 1;
}

.meta-value {
  color: var(--text);
  font-weight: 600;
}

.status-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-active {
  background: var(--green-soft);
  color: #111111;
  border: 1px solid rgba(17, 17, 17, 0.12);
}

.status-inactive {
  background: #f1f3f0;
  color: var(--muted);
  border: 1px solid #e1e3e0;
}

/* Service tag chips */
.service-tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  font-size: 10px;
  font-weight: 700;
  background: #ffffff;
  color: #111111;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(17, 17, 17, 0.12);
}

/* Skus List */
.product-skus-section,
.product-video-section,
.product-album-section,
.product-desc-section {
  border-top: 1px solid var(--line);
  padding-top: 16px;
}

.product-skus-section h4,
.product-video-section h4,
.product-album-section h4,
.product-desc-section h4 {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 10px 0;
}

.sku-preview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sku-preview-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 8px 12px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.sku-preview-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--line);
}

.sku-preview-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.sku-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sku-code {
  font-size: 10px;
  color: var(--muted);
  font-family: monospace;
}

.sku-preview-price-stock {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.sku-price {
  font-size: 13px;
  font-weight: 700;
  color: var(--green);
}

.sku-stock {
  font-size: 10px;
  color: var(--muted);
}

/* Video */
.video-preview-wrapper {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #000;
  display: flex;
  justify-content: center;
}

.detail-video-player {
  max-width: 100%;
  max-height: 200px;
}

/* Gallery album */
.detail-images-gallery {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.gallery-img-item {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--line);
  cursor: zoom-in;
  transition: transform 0.2s ease;
}

.gallery-img-item:hover {
  transform: scale(1.04);
}

/* Detail text desc */
.desc-text {
  font-size: 12px;
  color: var(--text);
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px;
}

.desc-html {
  font-size: 13px;
  color: var(--text);
  line-height: 1.7;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
}

.desc-html :deep(p) {
  margin: 0 0 10px;
}

.desc-html :deep(img) {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 8px 0 12px;
  border-radius: 8px;
  object-fit: cover;
}

/* Action button area */
.product-actions-section {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

/* Merchant Profile Details Card Styles */
.merchant-profile-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px 4px;
  text-align: left;
}

.merchant-hero-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  align-items: stretch;
}

.merchant-logo-preview {
  width: 100%;
  height: 220px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--line);
  flex-shrink: 0;
}

.merchant-hero-info {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  flex: 1;
  min-width: 0;
  gap: 8px;
}

.merchant-id-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  background: #f1f3f0;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
  margin-bottom: 4px;
}

.merchant-title-text {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 2px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.merchant-subtitle-text {
  font-size: 11px;
  color: var(--muted);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.merchant-meta-section {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
}

.status-rejected {
  background: var(--danger-soft);
  color: var(--danger);
  border: 1px solid rgba(220, 53, 69, 0.12);
}

/* Qualifications Section */
.merchant-qualifications-section {
  border-top: 1px solid var(--line);
  padding-top: 16px;
}

.merchant-qualifications-section h4 {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 12px 0;
}

.qualification-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qualification-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.qualification-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 2px;
  text-align: left;
}

.qualification-type {
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
}

.qualification-filename {
  font-size: 10px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.view-file-btn {
  height: 28px;
  padding: 0 10px;
  font-size: 11px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}

.merchant-actions-section {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

@media (max-width: 768px) {
  .resource-pagination .pagination-actions {
    width: 100%;
  }

  .resource-pagination .pagination-actions .ghost-btn {
    flex: 1;
    justify-content: center;
  }
}

</style>

