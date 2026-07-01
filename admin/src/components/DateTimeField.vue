<template>
  <label class="datetime-field" :class="{ 'datetime-field--block': block }">
    <span v-if="label" class="datetime-field__label">
      {{ label }}
      <em v-if="required" class="datetime-field__required">*</em>
    </span>
    <el-date-picker
      :model-value="modelValue"
      :type="type"
      :value-format="valueFormat"
      :placeholder="placeholder"
      :disabled="disabled"
      :clearable="clearable"
      class="datetime-field__picker"
      popper-class="farm-datetime-popper"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </label>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string | null;
    label?: string;
    type?: 'date' | 'datetime';
    valueFormat?: string;
    placeholder?: string;
    disabled?: boolean;
    clearable?: boolean;
    required?: boolean;
    block?: boolean;
  }>(),
  {
    modelValue: '',
    label: '',
    type: 'datetime',
    valueFormat: 'YYYY-MM-DD HH:mm:ss',
    placeholder: '选择日期时间',
    disabled: false,
    clearable: true,
    required: false,
    block: true,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string | null | undefined];
}>();
</script>
