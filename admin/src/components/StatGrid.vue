<template>
  <section class="metric-grid">
    <article v-for="card in cards" :key="card.title" class="metric-card">
      <div class="metric-title">{{ card.title }}</div>
      <strong>{{ card.value }}</strong>
      <p v-html="card.note" />
    </article>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  cards: Array<{
    title: string;
    value: string | number;
    note: string;
  }>;
}>();
</script>
