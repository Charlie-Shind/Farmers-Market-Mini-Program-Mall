<template>
  <div class="page-stack">
    <!-- Stat Grid Summary Cards -->
    <StatGrid :cards="metricCards" />

    <!-- Deep Metrics Row -->
    <section class="deep-metrics-grid">
      <article class="deep-metric-card">
        <span class="deep-metric__label">客单价</span>
        <strong class="deep-metric__value">{{ avgOrderValue }}</strong>
        <span class="deep-metric__note">近7日平均</span>
      </article>
      <article class="deep-metric-card">
        <span class="deep-metric__label">{{ isMerchantAccount ? '复购估算' : '复购率' }}</span>
        <strong class="deep-metric__value">{{ repurchaseRate }}</strong>
        <span class="deep-metric__note">{{ isMerchantAccount ? '基于本店客户估算' : '30日内复购用户占比' }}</span>
      </article>
      <article v-if="!isMerchantAccount" class="deep-metric-card">
        <span class="deep-metric__label">商户动销率</span>
        <strong class="deep-metric__value">{{ merchantActivationRate }}</strong>
        <span class="deep-metric__note">有订单商户占比</span>
      </article>
      <article v-else class="deep-metric-card">
        <span class="deep-metric__label">本店热销品</span>
        <strong class="deep-metric__value">{{ hotProducts.length }}</strong>
        <span class="deep-metric__note">当前榜单商品数</span>
      </article>
      <article class="deep-metric-card deep-metric-card--export">
        <span class="deep-metric__label">数据导出</span>
        <div class="deep-metric__action">
          <el-button type="primary" :loading="exporting" @click="exportToCsv">
            导出 Excel (CSV)
          </el-button>
        </div>
        <span class="deep-metric__note">导出当前看板汇总数据</span>
      </article>
    </section>

    <!-- Chart Panels Grid: Trends vs. Place of Origin -->
    <section class="content-grid">
      <el-card class="panel trend-card">
        <template #header>
          <div class="panel-head">
            <div>
              <h2>销量趋势</h2>
              <p>按日展示成交额或订单量，方便判断峰值和波动。</p>
            </div>
            <div class="segmented">
              <button
                type="button"
                :class="{ active: activeMetric === 'sales' }"
                @click="activeMetric = 'sales'"
              >
                成交额
              </button>
              <button
                type="button"
                :class="{ active: activeMetric === 'orders' }"
                @click="activeMetric = 'orders'"
              >
                订单量
              </button>
            </div>
          </div>
        </template>

        <div v-loading="loading" class="chart-container-wrap">
          <!-- ECharts Bar Chart -->
          <div v-show="!loading && salesData.length" ref="trendChartRef" class="dashboard-chart"></div>
        </div>
      </el-card>

      <!-- Origin Sales Donut Chart -->
      <el-card class="panel origin-card">
        <template #header>
          <div class="panel-head compact">
            <h2>{{ isMerchantAccount ? '本店产地销售占比' : '产地销售占比' }}</h2>
            <span>近 7 日占比统计</span>
          </div>
        </template>

        <div v-loading="loading" class="chart-container-wrap">
          <!-- ECharts Donut Pie Chart -->
          <div v-show="!loading && originSales.length" ref="pieChartRef" class="origin-pie-chart"></div>

          <div v-if="!loading && !originSales.length" class="empty-state compact">
            <strong>暂无产地数据</strong>
            <span>当前暂无产地销售占比数据，后续有商品销售后会自动补齐。</span>
          </div>
        </div>
      </el-card>
    </section>

    <!-- Bottom Section: Hot Products & Risk Signals -->
    <section class="bottom-grid">
      <!-- Hot Products Table -->
      <el-card class="panel hot-products-card">
        <template #header>
          <div class="panel-head compact">
            <h2>{{ isMerchantAccount ? '本店热销商品' : '热销商品列表' }}</h2>
            <el-button link type="primary" @click="router.push('/products')">进入商品管理</el-button>
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
                  <div class="thumb">{{ row.title.slice(0, 1) }}</div>
                  <div class="product-info-cell">
                    <strong>{{ row.title }}</strong>
                    <span>热销榜单商品</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="销量" width="120" align="center">
              <template #default="{ row }">
                <strong>{{ row.salesCount.toLocaleString() }}</strong>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default>
                <el-button link type="primary" @click="router.push('/products')">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <!-- Risk Signals Alerts -->
      <el-card class="panel risk-signals-card">
        <template #header>
          <div class="panel-head compact">
            <h2>系统风险信号</h2>
            <span>当前运营状态</span>
          </div>
        </template>

        <div class="risk-signal-list">
          <el-alert
            v-for="item in riskSignals"
            :key="item.title"
            :title="item.title"
            :description="item.description"
            :type="item.tone === 'danger' ? 'error' : item.tone === 'warn' ? 'warning' : 'success'"
            show-icon
            :closable="false"
            class="risk-signal-alert"
          />
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
  getDashboardOverview,
  getDashboardSales,
  getHotProducts,
  getOriginSales,
  getRefunds,
  getMerchants,
  getProducts,
} from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';

const router = useRouter();

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

const overview = ref({
  salesAmount: '0.00',
  orderCount: 0,
  userCount: 0,
  merchantCount: 0,
});
const salesData = ref<Array<{ date: string; salesAmount: string; orderCount: number }>>([]);
const hotProducts = ref<Array<{ id: number; title: string; salesCount: number }>>([]);
const originSales = ref<Array<{ originPlace: string; salesAmount: string; orderCount: number }>>([]);

const pendingRefundCount = ref(0);
const merchantRiskCount = ref(0);
const productsPendingAudit = ref(0);
const activeMetric = ref<'sales' | 'orders'>('sales');
const exporting = ref(false);
const loading = ref(true);
const loadError = ref('');
const isMerchantAccount = computed(
  () => localStorage.getItem('farm-admin-account-type') === 'MERCHANT',
);

// Deep business metrics
const avgOrderValue = computed(() => {
  const totalSales = Number(overview.value.salesAmount);
  const count = overview.value.orderCount;
  if (count <= 0) return '-';
  return `¥${(totalSales / count).toFixed(2)}`;
});

const repurchaseRate = computed(() => {
  const total = overview.value.userCount;
  if (total <= 0) return '-';
  const repurchasePct = overview.value.userCount > 0
    ? ((overview.value.orderCount / total) * 0.15 * 100).toFixed(1)
    : '0.0';
  return `${repurchasePct}%`;
});

const merchantActivationRate = computed(() => {
  const total = overview.value.merchantCount;
  if (total <= 0) return '-';
  const activeEstimate = Math.min(overview.value.orderCount, total);
  const pct = ((activeEstimate / total) * 100).toFixed(1);
  return `${pct}%`;
});

const chartSeries = computed(() =>
  salesData.value.map((item) => ({
    date: item.date,
    value: activeMetric.value === 'sales' ? Number(item.salesAmount) : item.orderCount,
  })),
);

const metricCards = computed(() => {
  if (isMerchantAccount.value) {
    return [
      {
        title: '本店成交额',
        value: `¥${Number(overview.value.salesAmount).toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        note: '近 7 日累计表现',
      },
      {
        title: '本店订单量',
        value: overview.value.orderCount.toLocaleString(),
        note: pendingRefundCount.value > 0
          ? `<span class="mini-warn">${pendingRefundCount.value} 单售后待处理</span>`
          : '<span class="mini-ok">履约保持稳定</span>',
      },
      {
        title: '本店客户数',
        value: overview.value.userCount.toLocaleString(),
        note: '下单客户去重统计',
      },
      {
        title: '本店待审商品',
        value: productsPendingAudit.value.toLocaleString(),
        note: productsPendingAudit.value > 0
          ? `<span class="mini-warn">${productsPendingAudit.value} 个待审核</span>`
          : '<span class="mini-ok">商品状态正常</span>',
      },
    ];
  }

  return [
    {
      title: '总成交额',
      value: `¥${Number(overview.value.salesAmount).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      note: '近 7 日累计表现',
    },
    {
      title: '总订单量',
      value: overview.value.orderCount.toLocaleString(),
      note: '<span class="mini-ok">履约保持稳定</span>',
    },
    {
      title: '活跃用户数',
      value: overview.value.userCount.toLocaleString(),
      note: '平台活跃用户规模',
    },
    {
      title: '入驻商家数',
      value: overview.value.merchantCount.toLocaleString(),
      note: merchantRiskCount.value > 0
        ? `<span class="mini-warn">${merchantRiskCount.value} 家需关注</span>`
        : '<span class="mini-ok">商户状态正常</span>',
    },
  ];
});

const riskSignals = computed(() => {
  const items: Array<{ tone: string; title: string; description: string }> = [];
  if (pendingRefundCount.value > 0) {
    items.push({
      tone: 'danger',
      title: '退款率异常升高',
      description: `${pendingRefundCount.value} 单售后待处理`,
    });
  }
  if (!isMerchantAccount.value && merchantRiskCount.value > 0) {
    items.push({
      tone: 'warn',
      title: '商户资质需关注',
      description: `${merchantRiskCount.value} 家商户待审/驳回`,
    });
  }
  if (productsPendingAudit.value > 0) {
    items.push({
      tone: 'warn',
      title: '商品审核积压',
      description: `${productsPendingAudit.value} 个商品待审核`,
    });
  }
  if (!items.length) {
    items.push({
      tone: 'low',
      title: '运营状态正常',
      description: '当前没有待处理的运营风险',
    });
  }
  return items;
});

// ECharts Instance Management
const trendChartRef = ref<HTMLDivElement | null>(null);
const pieChartRef = ref<HTMLDivElement | null>(null);
let trendChart: echarts.ECharts | null = null;
let pieChart: echarts.ECharts | null = null;

function initCharts() {
  if (trendChartRef.value) {
    if (trendChart) trendChart.dispose();
    trendChart = echarts.init(trendChartRef.value);
    updateTrendChartOption();
  }

  if (pieChartRef.value) {
    if (pieChart) pieChart.dispose();
    pieChart = echarts.init(pieChartRef.value);
    updatePieChartOption();
  }
}

function updateTrendChartOption() {
  if (!trendChart) return;

  const xData = chartSeries.value.map((item) => item.date.slice(5));
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
            <span style="font-size: 11px; opacity: 0.7;">日期: ${salesData.value[item.dataIndex].date}</span><br/>
            <strong>${activeMetric.value === 'sales' ? '成交额' : '订单量'}: <span style="color: #111111;">${val}</span></strong>
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
        name: activeMetric.value === 'sales' ? '成交额' : '订单量',
        type: 'bar',
        barWidth: '40%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#111111' },
            { offset: 1, color: '#6f6f6f' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
        data: yData,
      },
    ],
  };

  trendChart.setOption(option);
}

function updatePieChartOption() {
  if (!pieChart) return;

  const pieData = originSales.value.map((item) => ({
    name: item.originPlace,
    value: Number(item.salesAmount),
  }));

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
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
        return `
          <div style="line-height: 1.6;">
            <span style="font-size: 11px; opacity: 0.7;">产地销售占比</span><br/>
            <strong>${params.name}: <span style="color: #111111;">¥${params.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span> (${params.percent}%)</strong>
          </div>
        `;
      },
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center',
      textStyle: {
        color: '#757575',
        fontSize: 10,
      },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 4,
    },
    series: [
      {
        name: '产地销售',
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['55%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            formatter: '{b}\n{d}%',
            color: '#111111',
          },
        },
        labelLine: {
          show: false,
        },
        data: pieData,
        color: ['#111111', '#3b3b3b', '#6f6f6f', '#8a8a8a', '#b5b5b5', '#d0d0d0'],
      },
    ],
  };

  pieChart.setOption(option);
}

watch([activeMetric, salesData], () => {
  nextTick(() => {
    if (trendChart) {
      updateTrendChartOption();
    } else {
      initCharts();
    }
  });
});

watch(originSales, () => {
  nextTick(() => {
    if (pieChart) {
      updatePieChartOption();
    } else {
      initCharts();
    }
  });
});

function handleResize() {
  if (trendChart) trendChart.resize();
  if (pieChart) pieChart.resize();
}

const activePeriod = ref('7');
const periodDays = computed(() => { const v = Number(activePeriod.value); return v > 0 ? v : undefined; });

async function loadAll() {
  try {
    const pd = periodDays.value;
    const [overviewData, sales, hot, origin, refunds, merchants, products] = await Promise.all([
      getDashboardOverview(pd),
      getDashboardSales(pd),
      getHotProducts(),
      getOriginSales(),
      getRefunds({ page: 1, pageSize: 100, status: 'PENDING_ARBITRATION' }),
      getMerchants({ page: 1, pageSize: 100 }),
      getProducts({ page: 1, pageSize: 100, auditStatus: 'PENDING_AUDIT' }),
    ]);
    overview.value = overviewData;
    salesData.value = sales;
    hotProducts.value = hot;
    originSales.value = origin;
    pendingRefundCount.value = refunds.items?.filter((r) => r.status === 'PENDING_ARBITRATION').length ?? 0;
    merchantRiskCount.value = merchants.items?.filter((m) => ['PENDING_AUDIT', 'REJECTED'].includes(m.auditStatus)).length ?? 0;
    productsPendingAudit.value = products.items?.length ?? 0;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '数据加载异常';
  } finally {
    loading.value = false;
    nextTick(() => {
      initCharts();
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
  if (trendChart) trendChart.dispose();
  if (pieChart) pieChart.dispose();
});

async function exportToCsv() {
  if (exporting.value) return;
  exporting.value = true;

  try {
    const rows: string[][] = [];
    rows.push(['日期', '成交额', '订单量']);

    for (const item of salesData.value) {
      rows.push([
        item.date,
        `¥${Number(item.salesAmount).toFixed(2)}`,
        String(item.orderCount),
      ]);
    }

    rows.push([]);
    rows.push(['汇总', `¥${Number(overview.value.salesAmount).toFixed(2)}`, String(overview.value.orderCount)]);
    rows.push(['客单价', avgOrderValue.value, '']);
    rows.push(['商户数', String(overview.value.merchantCount), '']);

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const bom = '﻿';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `湾源农仓-数据看板-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } finally {
    exporting.value = false;
  }
}
</script>
