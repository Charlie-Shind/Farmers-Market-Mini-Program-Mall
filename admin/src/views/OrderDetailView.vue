<template>
  <div class="page-stack">
    <section v-if="loading" class="panel">
      <div class="empty-state">
        <strong>订单详情加载中</strong>
        <span>正在从后端拉取订单真实数据。</span>
      </div>
    </section>

    <section v-else-if="loadError" class="panel">
      <div class="empty-state">
        <strong>订单详情加载失败</strong>
        <span>{{ loadError }}</span>
        <RouterLink class="primary-btn" to="/orders">返回列表</RouterLink>
      </div>
    </section>

    <template v-else-if="order">
      <section class="detail-grid">
        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>订单详情</h2>
              <p>{{ order.orderNo }} · {{ order.merchantName }}</p>
            </div>
            <div class="top-actions">
              <RouterLink class="ghost-btn" to="/orders">返回列表</RouterLink>
              <button
                type="button"
                class="primary-btn"
                :disabled="!canShip"
                :title="shipButtonTitle"
                @click="openShipModal"
              >
                {{ order.deliveryStatus === 2 ? '已发货' : '录入物流' }}
              </button>
            </div>
          </div>

          <div v-if="actionMessage" class="panel-banner success" style="margin-bottom: 12px;">
            <strong>操作成功</strong>
            <span>{{ actionMessage }}</span>
          </div>
          <div v-if="actionError" class="panel-banner warn" style="margin-bottom: 12px;">
            <strong>提示</strong>
            <span>{{ actionError }}</span>
          </div>

          <div class="detail-list">
            <div class="detail-row">
              <span>订单状态</span>
              <strong><span :class="['status', statusClass(order.status)]">{{ statusLabel(order.status) }}</span></strong>
            </div>
            <div class="detail-row">
              <span>支付状态</span>
              <strong><span :class="['status', order.payStatus === 1 ? 'ok' : 'warn']">{{ order.payStatus === 1 ? '已支付' : '待支付' }}</span></strong>
            </div>
            <div class="detail-row">
              <span>发货状态</span>
              <strong>{{ deliveryLabel }}</strong>
            </div>
            <div class="detail-row">
              <span>快递公司</span>
              <strong>{{ order.logisticsCompany || '—' }}</strong>
            </div>
            <div class="detail-row">
              <span>快递单号</span>
              <strong>{{ order.trackingNo || '—' }}</strong>
            </div>
            <div class="detail-row">
              <span>售后状态</span>
              <strong>{{ afterSaleText }}</strong>
            </div>
            <div class="detail-row detail-row--full">
              <span>收货信息</span>
              <strong>{{ shippingText }}</strong>
            </div>
            <div class="detail-row detail-row--full">
              <span>订单备注</span>
              <strong>{{ remarkText }}</strong>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head compact">
            <h2>履约时间线</h2>
            <span class="tag">自动记录</span>
          </div>

          <div class="timeline-list">
            <div class="timeline-item">
              <span class="timeline-dot ok"></span>
              <div class="timeline-body">
                <strong>下单成功</strong>
                <span>订单已由后端返回真实数据</span>
              </div>
            </div>
            <div class="timeline-item">
              <span class="timeline-dot" :class="order.payStatus === 1 ? 'ok' : 'warn'"></span>
              <div class="timeline-body">
                <strong>支付状态</strong>
                <span>{{ order.payStatus === 1 ? '已支付' : '待支付' }}</span>
              </div>
            </div>
            <div class="timeline-item">
              <span class="timeline-dot" :class="order.deliveryStatus === 2 ? 'ok' : ''"></span>
              <div class="timeline-body">
                <strong>发货状态</strong>
                <span v-if="order.deliveryStatus === 2">
                  已发货
                  <template v-if="order.trackingNo">
                    · {{ order.logisticsCompany || '快递' }} {{ order.trackingNo }}
                  </template>
                </span>
                <span v-else>等待录入物流</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="bottom-grid">
        <article class="panel">
          <div class="panel-head compact">
            <h2>商品明细</h2>
            <span>快照信息</span>
          </div>

          <div class="table-x">
            <table class="data-table">
              <thead>
                <tr>
                  <th>商品</th>
                  <th>规格</th>
                  <th>单价</th>
                  <th>数量</th>
                  <th>小计</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in order.items" :key="item.orderItemId">
                  <td data-label="商品">
                    <div class="cell-main">
                      <div class="thumb thumb-cover">
                        <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.title" />
                        <span v-else>{{ item.title.slice(0, 1) }}</span>
                      </div>
                      <div class="product-info-cell">
                        <strong>{{ item.title }}</strong>
                        <span>{{ order.merchantName }}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="规格">{{ item.skuName }}</td>
                  <td data-label="单价">¥{{ item.price }}</td>
                  <td data-label="数量">{{ item.quantity }}</td>
                  <td data-label="小计">¥{{ item.subtotal }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head compact">
            <h2>金额汇总</h2>
            <span>订单费用</span>
          </div>

          <div class="detail-list detail-list--single">
            <div class="detail-row">
              <span>商品金额</span>
              <strong>¥{{ order.totalAmount }}</strong>
            </div>
            <div class="detail-row">
              <span>运费</span>
              <strong>¥{{ order.freightAmount }}</strong>
            </div>
            <div class="detail-row">
              <span>优惠</span>
              <strong>¥{{ order.discountAmount }}</strong>
            </div>
            <div class="detail-row">
              <span>实付金额</span>
              <strong class="amount-highlight">¥{{ order.payAmount }}</strong>
            </div>
          </div>
        </article>
      </section>
    </template>

    <div v-if="shipModal.open" class="action-modal" @click.self="closeShipModal">
      <section class="action-card action-card--narrow" role="dialog" aria-modal="true" aria-label="录入物流">
        <header class="action-card__head">
          <div>
            <h3>录入物流</h3>
            <p>填写快递信息后，订单将变为已发货，用户可在小程序查看单号。</p>
          </div>
          <button type="button" class="text-btn" :disabled="shipModal.loading" @click="closeShipModal">关闭</button>
        </header>

        <form class="action-card__body" @submit.prevent="submitShip">
          <div v-if="shipModal.error" class="panel-banner warn">
            <strong>提示</strong>
            <span>{{ shipModal.error }}</span>
          </div>

          <div class="panel-banner success ship-order-banner">
            <strong>订单号</strong>
            <span>{{ order?.orderNo }}</span>
          </div>

          <label class="form-field">
            <span>快递公司 <em style="color: var(--danger); font-style: normal;">*</em></span>
            <select
              v-model="shipModal.logisticsCompany"
              required
              :disabled="shipModal.loading || !logisticsCompanies.length"
            >
              <option value="" disabled>请选择快递公司</option>
              <option
                v-for="company in logisticsCompanies"
                :key="company.code"
                :value="company.name"
              >
                {{ company.name }}
              </option>
            </select>
            <small v-if="!logisticsCompanies.length" class="form-help">暂无快递公司，请先到系统配置中维护。</small>
          </label>

          <label class="form-field">
            <span>快递单号 <em style="color: var(--danger); font-style: normal;">*</em></span>
            <input
              v-model="shipModal.trackingNo"
              type="text"
              maxlength="64"
              placeholder="请输入快递单号"
              required
              :disabled="shipModal.loading"
            />
          </label>

          <div class="form-actions">
            <button type="button" class="ghost-btn" :disabled="shipModal.loading" @click="closeShipModal">取消</button>
            <button type="submit" class="primary-btn" :disabled="shipModal.loading">
              {{ shipModal.loading ? '提交中…' : '确认发货' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { getLogisticsCompanies, getOrderDetail, shipOrder } from '@/api/admin';

type OrderDetail = Awaited<ReturnType<typeof getOrderDetail>>;
type LogisticsCompany = { code: string; name: string };

const route = useRoute();
const loading = ref(true);
const loadError = ref('');
const actionMessage = ref('');
const actionError = ref('');
const order = ref<OrderDetail | null>(null);
const logisticsCompanies = ref<LogisticsCompany[]>([]);

const shipModal = reactive({
  open: false,
  logisticsCompany: '',
  trackingNo: '',
  loading: false,
  error: '',
});

const canShip = computed(() => Boolean(order.value?.canShip));

const shipButtonTitle = computed(() => {
  if (!order.value) return '';
  if (order.value.deliveryStatus === 2) return '订单已发货';
  if (order.value.payStatus !== 1) return '订单未支付，无法发货';
  if (!order.value.canShip) return '当前订单状态不可发货';
  return '录入物流并发货';
});

const afterSaleText = computed(() => {
  if (!order.value) {
    return '无';
  }

  const status = order.value.afterSaleStatus;
  if (status === 1 || status === 2) {
    return '售后中';
  }
  if (status === 3) {
    return '已通过';
  }
  if (status === 4) {
    return '已驳回';
  }
  return '无';
});

const deliveryLabel = computed(() => {
  if (!order.value) return '未发货';
  if (order.value.deliveryStatus === 2) return '已发货';
  if (order.value.deliveryStatus === 1) return '待发货';
  return '未发货';
});

const shippingText = computed(() => {
  if (!order.value || !order.value.addressSnapshot) {
    return '暂无收货信息';
  }
  const addr = order.value.addressSnapshot as Record<string, string>;
  return `${addr.receiverName || ''} (${addr.receiverMobile || ''}) ${addr.province || ''}${addr.city || ''}${addr.district || ''} ${addr.detailAddress || ''}`;
});

const remarkText = computed(() => order.value?.remark || '无');

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING_PAY: '待支付',
    TO_SHIP: '待发货',
    SHIPPED: '已发货',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    CANCELED: '已取消',
  };
  return map[status] || status;
}

function statusClass(status: string) {
  if (status === 'COMPLETED' || status === '已完成' || status === 'TO_SHIP' || status === '待发货' || status === 'SHIPPED' || status === '已发货') {
    return 'ok';
  }
  if (status === 'PENDING_PAY' || status === '待支付') return 'warn';
  if (status === 'CANCELLED' || status === 'CANCELED' || status === '已取消') return 'danger';
  return 'blue';
}

function openShipModal() {
  if (!canShip.value || !order.value) {
    return;
  }
  const existing = order.value.logisticsCompany || '';
  const matched = logisticsCompanies.value.find((item) => item.name === existing);
  shipModal.open = true;
  shipModal.logisticsCompany = matched?.name || logisticsCompanies.value[0]?.name || '';
  shipModal.trackingNo = order.value.trackingNo || '';
  shipModal.loading = false;
  shipModal.error = '';
  actionError.value = '';
  if (!logisticsCompanies.value.length) {
    void loadLogisticsCompanies();
  }
}

function closeShipModal() {
  if (shipModal.loading) {
    return;
  }
  shipModal.open = false;
  shipModal.error = '';
}

async function submitShip() {
  if (!order.value || shipModal.loading) {
    return;
  }

  const company = shipModal.logisticsCompany.trim();
  if (!company) {
    shipModal.error = '请选择快递公司';
    return;
  }

  const trackingNo = shipModal.trackingNo.trim();
  if (!trackingNo) {
    shipModal.error = '请填写快递单号';
    return;
  }

  shipModal.loading = true;
  shipModal.error = '';

  try {
    await shipOrder(order.value.orderNo, {
      trackingNo,
      logisticsCompany: company,
    });
    order.value = await getOrderDetail(order.value.orderNo);
    actionMessage.value = `已发货，快递单号 ${trackingNo}`;
    actionError.value = '';
    shipModal.open = false;
  } catch (error) {
    shipModal.error = error instanceof Error ? error.message : '发货失败';
  } finally {
    shipModal.loading = false;
  }
}

async function loadLogisticsCompanies() {
  try {
    logisticsCompanies.value = await getLogisticsCompanies();
  } catch {
    logisticsCompanies.value = [];
  }
}

onMounted(async () => {
  void loadLogisticsCompanies();
  try {
    const orderNo = String(route.params.orderNo ?? '').trim();
    order.value = await getOrderDetail(orderNo);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '订单详情加载失败';
  } finally {
    loading.value = false;
  }
});
</script>
