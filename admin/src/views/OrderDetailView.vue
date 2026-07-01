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
              <button type="button" class="primary-btn" disabled>录入物流</button>
            </div>
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
                <span>{{ order.deliveryStatus === 2 ? '已发货' : '等待商户确认物流' }}</span>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { getOrderDetail } from '@/api/admin';

type OrderDetail = Awaited<ReturnType<typeof getOrderDetail>>;

const route = useRoute();
const loading = ref(true);
const loadError = ref('');
const order = ref<OrderDetail | null>(null);

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
  };
  return map[status] || status;
}

function statusClass(status: string) {
  if (status === 'COMPLETED') return 'ok';
  if (status === 'PENDING_PAY') return 'warn';
  if (status === 'CANCELLED') return 'danger';
  return 'blue';
}

onMounted(async () => {
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
