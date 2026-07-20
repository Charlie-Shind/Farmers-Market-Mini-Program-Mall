<template>
  <div class="page-stack">
    <StatGrid :cards="metricCards" class="dashboard-metrics" />

    <section class="panel dashboard-period-bar">
      <div class="panel-head compact">
        <div class="segmented">
          <button
            v-for="p in periods"
            :key="p.key"
            type="button"
            :class="{ active: activePeriod === p.key }"
            @click="setPeriod(p.key)"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Core Content Grid: Trends & High-Priority Todos -->
    <section class="content-grid">
      <el-card class="panel trend-card">
        <template #header>
        <div class="panel-head">
          <div>
            <h2>{{ currentPeriodLabel }}经营趋势</h2>
          </div>
          <div class="segmented">
            <button
              v-for="mode in chartModes"
                :key="mode.key"
                type="button"
                :class="{ active: activeMetric === mode.key }"
                :aria-pressed="activeMetric === mode.key"
                @click="activeMetric = mode.key"
              >
                {{ mode.label }}
              </button>
            </div>
          </div>
        </template>

        <div v-loading="loading" class="chart-container-wrap">
          <div v-if="loadError" class="panel-banner warn">
            <strong>数据加载失败</strong>
            <span>{{ loadError }}</span>
          </div>

          <!-- ECharts Trend Container -->
          <div v-show="!loading && salesData.length" ref="chartRef" class="dashboard-chart"></div>

          <div v-if="!loading && !salesData.length" class="empty-state compact">
            <strong>暂无趋势数据</strong>
            <span>当前暂无近 7 日经营数据，等有订单后这里会自动展示。</span>
          </div>

          <div class="chart-summary">
            <div>
              <span>当前指标</span>
              <strong>{{ chartModeLabel }} · {{ chartCurrentLabel }}</strong>
            </div>
            <div>
              <span>近 7 日总计</span>
              <strong>{{ chartTotalLabel }}</strong>
            </div>
            <div>
              <span>日均</span>
              <strong>{{ chartAverageLabel }}</strong>
            </div>
          </div>
        </div>
      </el-card>

      <!-- High-Priority Todos -->
      <el-card class="panel todo-card">
        <template #header>
          <div class="panel-head compact">
            <h2>待办</h2>
            <el-button link type="primary" @click="router.push('/orders')">查看全部</el-button>
          </div>
        </template>

        <div class="insight-list">
          <div v-for="item in todoItems" :key="item.key" class="insight-item" :class="item.tone">
            <div class="insight-item__main">
              <strong>{{ item.title }}</strong>
              <span>{{ item.description }}</span>
            </div>
            <el-button size="small" type="primary" @click="router.push(item.to)">
              {{ item.actionLabel }}
            </el-button>
          </div>
        </div>
      </el-card>
    </section>

    <!-- Bottom Grid: Hot Products & Risk Alerts -->
    <section class="bottom-grid">
      <el-card class="panel hot-products-card">
        <template #header>
          <div class="panel-head compact">
            <h2>商品</h2>
            <el-button link type="primary" @click="router.push('/products')">商品管理</el-button>
          </div>
        </template>

        <div v-loading="loading" class="hot-products-table-wrap">
          <el-table
            v-if="!loading && hotProducts.length"
            :data="hotProducts"
            style="width: 100%"
          >
            <el-table-column label="商品" min-width="200">
              <template #default="{ row }">
                <div class="cell-main">
                  <div class="thumb thumb-cover">
                    <img v-if="row.coverUrl" :src="row.coverUrl" :alt="row.title" />
                    <span v-else>{{ row.title.slice(0, 1) }}</span>
                  </div>
                  <div class="product-info-cell">
                    <strong>{{ row.title }}</strong>
                    <span>近 7 日成交 {{ row.salesCount.toLocaleString() }} 单</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="销量" width="100" align="center">
              <template #default="{ row }">
                <strong>{{ row.salesCount.toLocaleString() }}</strong>
              </template>
            </el-table-column>
            <el-table-column label="热度" width="100" align="center">
              <template #default>
                <el-tag type="success" effect="light" round>热销</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default>
                <el-button link type="primary" @click="router.push('/products')">查看</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="!loading && !hotProducts.length" class="empty-state compact">
            <strong>暂无热门商品</strong>
            <span>当前没有可展示的商品成交数据。</span>
          </div>
        </div>
      </el-card>

      <!-- Risk Warnings -->
      <el-card class="panel risk-alerts-card">
        <template #header>
          <div class="panel-head compact">
            <h2>风险</h2>
            <el-button link type="primary" @click="router.push('/analytics')">风险明细</el-button>
          </div>
        </template>

        <div class="insight-list">
          <div v-for="item in riskItems" :key="item.key" class="insight-item" :class="item.tone">
            <div class="insight-item__main">
              <strong>{{ item.title }}</strong>
              <span>{{ item.description }}</span>
            </div>
            <el-button size="small" @click="router.push(item.to)">
              {{ item.actionLabel }}
            </el-button>
          </div>
        </div>
      </el-card>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';

import {
  getActivities,
  getDashboardOverview,
  getDashboardSales,
  getHotProducts,
  getMerchants,
  getOrders,
  getProducts,
  getRefunds,
} from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';

const router = useRouter();

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

type SalesRow = {
  date: string;
  salesAmount: string;
  orderCount: number;
};

type HotProduct = {
  id: number;
  title: string;
  salesCount: number;
  coverUrl?: string;
};

type OrderRow = {
  status: string;
  payStatus: number;
  deliveryStatus: number;
};

type RefundRow = {
  status: string;
};

type MerchantRow = {
  auditStatus: string;
};

type ProductRow = {
  auditStatus: string;
};

type ActivityRow = {
  status: string;
};

type ChartMetric = 'sales' | 'orders';
type Tone = 'danger' | 'warn' | 'mid' | 'low' | 'high';
type InsightItem = {
  key: string;
  tone: Tone;
  title: string;
  description: string;
  to: string;
  actionLabel: string;
};

const overview = ref({
  salesAmount: '0.00',
  orderCount: 0,
  userCount: 0,
  merchantCount: 0,
});
const salesData = ref<SalesRow[]>([]);
const hotProducts = ref<HotProduct[]>([]);
const ordersData = ref<OrderRow[]>([]);
const refundsData = ref<RefundRow[]>([]);
const merchantsData = ref<MerchantRow[]>([]);
const productsData = ref<ProductRow[]>([]);
const activitiesData = ref<ActivityRow[]>([]);
const loading = ref(true);
const loadError = ref('');
const activeMetric = ref<ChartMetric>('sales');
const activePeriod = ref('7');

const periods = [
  { key: '7', label: '近 7 日' },
  { key: '30', label: '近 30 日' },
  { key: '90', label: '近 3 月' },
  { key: '0', label: '全部' },
];
const currentPeriodLabel = computed(() => periods.find(p => p.key === activePeriod.value)?.label ?? '近 7 日');
const periodDays = computed(() => {
  const v = Number(activePeriod.value);
  return v > 0 ? v : undefined;
});

function setPeriod(key: string) {
  activePeriod.value = key;
  loadAll();
}

const chartModes: Array<{ key: ChartMetric; label: string }> = [
  { key: 'sales', label: '成交额' },
  { key: 'orders', label: '订单量' },
];

const metricCards = computed(() => [
  {
    title: '今日成交额',
    value: `¥${formatAmount(overview.value.salesAmount)}`,
    note: salesTrendNote.value,
  },
  {
    title: '今日订单数',
    value: overview.value.orderCount.toLocaleString(),
    note: toShipCount.value > 0
      ? `<span class="mini-warn">${toShipCount.value} 单待发货</span>`
      : '<span class="mini-muted">暂无待发货</span>',
  },
  {
    title: '平台用户',
    value: overview.value.userCount.toLocaleString(),
    note: pendingRefundCount.value > 0
      ? `<span class="mini-warn">${pendingRefundCount.value} 单售后待处理</span>`
      : '<span class="mini-muted">暂无售后待处理</span>',
  },
  {
    title: '入驻商户',
    value: overview.value.merchantCount.toLocaleString(),
    note: merchantNote.value,
  },
]);

const chartSeries = computed(() =>
  salesData.value.map((item) => ({
    date: item.date,
    label: weekdayLabel(item.date),
    value: activeMetric.value === 'sales' ? Number(item.salesAmount) : item.orderCount,
  })),
);

const chartMax = computed(() => Math.max(...chartSeries.value.map((item) => item.value), 1));

const chartModeLabel = computed(
  () => chartModes.find((mode) => mode.key === activeMetric.value)?.label ?? '成交额',
);

const chartTotalLabel = computed(() => {
  const total = chartSeries.value.reduce((sum, item) => sum + item.value, 0);
  return formatChartValue(total);
});

const chartCurrentLabel = computed(() => {
  const latest = chartSeries.value[chartSeries.value.length - 1];
  if (!latest) {
    return activeMetric.value === 'sales' ? '¥0.00' : '0';
  }
  return formatChartValue(latest.value);
});

const chartAverageLabel = computed(() => {
  if (!chartSeries.value.length) {
    return activeMetric.value === 'sales' ? '¥0.00' : '0';
  }

  const average = chartSeries.value.reduce((sum, item) => sum + item.value, 0) / chartSeries.value.length;
  return formatChartValue(average);
});

const pendingRefundCount = computed(
  () => refundsData.value.filter((item) => item.status === 'PENDING_ARBITRATION').length,
);

const toShipCount = computed(
  () =>
    ordersData.value.filter(
      (item) =>
        (item.status === 'TO_SHIP' || item.status === '待发货') &&
        item.payStatus === 1 &&
        item.deliveryStatus === 0,
    ).length,
);

const pendingProductAuditCount = computed(
  () => productsData.value.filter((item) => item.auditStatus === 'PENDING_AUDIT').length,
);

const merchantAttentionCount = computed(
  () =>
    merchantsData.value.filter((item) =>
      ['PENDING_AUDIT', 'REJECTED'].includes(item.auditStatus),
    ).length,
);

const draftActivityCount = computed(
  () => activitiesData.value.filter((item) => item.status === 'DRAFT').length,
);

const salesTrendNote = computed(() => {
  if (salesData.value.length < 2) {
    return '暂无环比数据';
  }

  const current = Number(salesData.value[salesData.value.length - 1]?.salesAmount ?? 0);
  const previous = Number(salesData.value[salesData.value.length - 2]?.salesAmount ?? 0);

  if (!previous) {
    return '较前一日暂无对比';
  }

  const rate = ((current - previous) / previous) * 100;
  const tone = rate >= 0 ? 'positive' : 'mini-danger';
  const sign = rate >= 0 ? '+' : '';

  return `较前一日 <span class="${tone}">${sign}${rate.toFixed(1)}%</span>`;
});

const merchantNote = computed(() => {
  if (!merchantAttentionCount.value) {
    return '<span class="mini-ok">审核通过率稳定</span>';
  }

  return `<span class="mini-warn">${merchantAttentionCount.value} 家商户待处理</span>`;
});

const todoItems = computed<InsightItem[]>(() => [
  {
    key: 'refunds',
    tone: pendingRefundCount.value > 0 ? 'danger' : 'low',
    title: `${pendingRefundCount.value} 单高风险售后`,
    description:
      pendingRefundCount.value > 0 ? '等待平台仲裁' : '当前没有待仲裁售后',
    to: '/refunds',
    actionLabel: pendingRefundCount.value > 0 ? '去仲裁' : '查看',
  },
  {
    key: 'orders',
    tone: toShipCount.value > 0 ? 'warn' : 'low',
    title: `${toShipCount.value} 单待发货订单`,
    description:
      toShipCount.value > 0 ? '已支付但未出库' : '当前没有待发货订单',
    to: '/orders',
    actionLabel: toShipCount.value > 0 ? '催发货' : '查看',
  },
  {
    key: 'products',
    tone: pendingProductAuditCount.value > 0 ? 'mid' : 'low',
    title: `${pendingProductAuditCount.value} 个商品待审核`,
    description:
      pendingProductAuditCount.value > 0 ? '影响上架与活动排期' : '当前没有待审核商品',
    to: '/products',
    actionLabel: pendingProductAuditCount.value > 0 ? '去审核' : '查看',
  },
]);

const riskItems = computed<InsightItem[]>(() => [
  {
    key: 'refunds-risk',
    tone: pendingRefundCount.value > 0 ? 'high' : 'low',
    title:
      pendingRefundCount.value > 0
        ? `售后待处理 ${pendingRefundCount.value} 单`
        : '售后风险受控',
    description:
      pendingRefundCount.value > 0 ? '优先处理平台仲裁单' : '当前没有高风险售后',
    to: '/refunds',
    actionLabel: pendingRefundCount.value > 0 ? '下钻' : '查看',
  },
  {
    key: 'merchant-risk',
    tone: merchantAttentionCount.value > 0 ? 'mid' : 'low',
    title:
      merchantAttentionCount.value > 0
        ? `${merchantAttentionCount.value} 家商户资质待处理`
        : '商户审核稳定',
    description:
      merchantAttentionCount.value > 0 ? '待审 / 驳回商户需要补充资料' : '当前没有待处理商户',
    to: '/merchants',
    actionLabel: merchantAttentionCount.value > 0 ? '处理' : '查看',
  },
  {
    key: 'activity-risk',
    tone: draftActivityCount.value > 0 ? 'warn' : 'low',
    title:
      draftActivityCount.value > 0 ? `${draftActivityCount.value} 个活动待上线` : '活动排期正常',
    description:
      draftActivityCount.value > 0 ? '草稿活动尚未排期发布' : '当前没有未发布活动',
    to: '/activities',
    actionLabel: '查看',
  },
]);

// ECharts Instance Management
const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

function initChart() {
  if (!chartRef.value) return;
  if (chartInstance) {
    chartInstance.dispose();
  }
  chartInstance = echarts.init(chartRef.value);
  updateChartOption();
}

function updateChartOption() {
  if (!chartInstance) return;

  const xData = chartSeries.value.map((item) => item.label);
  const yData = chartSeries.value.map((item) => item.value);

  const option: echarts.EChartsOption = {
    grid: {
      top: 30,
      left: 60,
      right: 20,
      bottom: 30,
      containLabel: false,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#111111',
      borderWidth: 0,
      borderRadius: 12,
      padding: [10, 14],
      textStyle: {
        color: '#ffffff',
        fontSize: 12,
        fontFamily: 'inherit',
      },
      formatter: (params: any) => {
        const item = params[0];
        const val = activeMetric.value === 'sales'
          ? `¥${Number(item.value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
          : `${item.value} 单`;
        return `
          <div style="line-height: 1.6;">
            <span style="font-size: 11px; opacity: 0.7;">${salesData.value[item.dataIndex].date} (${item.name})</span><br/>
            <strong>${chartModeLabel.value}: <span style="color: #111111;">${val}</span></strong>
          </div>
        `;
      },
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLine: {
        lineStyle: {
          color: '#e8e8e8',
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
          color: '#757575',
        fontSize: 11,
        margin: 10,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: '#e8e8e8',
          type: 'dashed',
        },
      },
      axisLabel: {
          color: '#757575',
        fontSize: 10,
        formatter: (value: number) => {
          if (activeMetric.value === 'sales') {
            return value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value.toLocaleString('zh-CN');
          }
          return value.toLocaleString('zh-CN');
        },
      },
    },
    series: [
      {
        name: chartModeLabel.value,
        type: 'line',
        smooth: true,
        showSymbol: false,
        symbolSize: 6,
        itemStyle: {
          color: '#2c4a39',
        },
        lineStyle: {
          width: 3,
          color: '#2c4a39',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(44, 74, 57, 0.18)' },
            { offset: 1, color: 'rgba(44, 74, 57, 0.02)' },
          ]),
        },
        data: yData,
      },
    ],
  };

  chartInstance.setOption(option);
}

watch([activeMetric, salesData], () => {
  nextTick(() => {
    if (chartInstance) {
      updateChartOption();
    } else {
      initChart();
    }
  });
});

function handleResize() {
  if (chartInstance) {
    chartInstance.resize();
  }
}

async function loadAll() {
  try {
    const pd = periodDays.value;
    const [overviewData, sales, hot, orders, refunds, merchants, products, activities] = await Promise.all([
      getDashboardOverview(pd),
      getDashboardSales(pd),
      getHotProducts(),
      getOrders(),
      getRefunds(),
      getMerchants(),
      getProducts(),
      getActivities(),
    ]);

    overview.value = overviewData;
    salesData.value = sales;
    hotProducts.value = hot;
    ordersData.value = orders.items;
    refundsData.value = refunds.items;
    merchantsData.value = merchants.items;
    productsData.value = products.items;
    activitiesData.value = activities;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '数据加载异常';
  } finally {
    loading.value = false;
    nextTick(() => {
      initChart();
    });
  }
}

onMounted(async () => {
  await loadAll();
  window.addEventListener('resize', handleResize);

  if (refreshApi) {
    const unregister = refreshApi.register(() => loadAll());
    onBeforeUnmount(() => unregister());
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (chartInstance) {
    chartInstance.dispose();
  }
});

function formatAmount(value: string) {
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChartValue(value: number) {
  return activeMetric.value === 'sales'
    ? `¥${Number(value).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : `${Math.round(value).toLocaleString('zh-CN')}`;
}

function weekdayLabel(date: string) {
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return map[new Date(`${date}T00:00:00`).getDay()];
}
</script>
