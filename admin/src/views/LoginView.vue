<template>
  <div class="login-page" :style="{ backgroundImage: `url(${LOGIN_BG_IMAGE})` }">
    <div class="login-page__overlay"></div>

    <div class="login-page__content">
      <form class="login-card" @submit.prevent="handleSubmit">
        <div class="login-card__brand">
          <BrandAvatar size="lg" />
          <div>
            <strong>{{ BRAND_NAME }}</strong>
            <span>{{ BRAND_SUBTITLE }}</span>
          </div>
        </div>

        <div class="login-card__intro">
          <h1>欢迎回来</h1>
          <p>请使用后台账号登录，验证码与限流策略已启用。</p>
        </div>

        <label class="form-field">
          <span>用户名</span>
          <input
            v-model.trim="form.username"
            type="text"
            placeholder="请输入用户名"
            autocomplete="username"
            maxlength="64"
          />
        </label>

        <label class="form-field">
          <span>密码</span>
          <input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
            maxlength="128"
          />
        </label>

        <label class="form-field">
          <span>验证码</span>
          <div class="captcha-row">
            <input
              v-model.trim="form.captchaCode"
              type="text"
              placeholder="请输入右侧验证码"
              autocomplete="off"
              maxlength="6"
            />
            <button
              type="button"
              class="captcha-image-btn"
              :disabled="captchaLoading"
              title="点击刷新验证码"
              @click="loadCaptcha"
            >
              <img v-if="captchaImage" :src="captchaImage" alt="验证码" />
              <span v-else>加载中</span>
            </button>
          </div>
        </label>

        <AppMessage
          v-if="loginError"
          class="login-message"
          type="error"
          title="登录失败"
          :content="loginError"
        />

        <button class="primary-btn login-submit" type="submit" :disabled="loading || captchaLoading">
          {{ loading ? '登录中...' : '进入后台' }}
        </button>

        <p class="login-security-tip">
          连续 5 次登录失败将锁定 15 分钟；验证码 5 分钟内有效且仅可使用一次。
        </p>
      </form>

      <footer class="login-page__footer">
        <span>连接产地与社区 · 让运营更高效</span>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { fetchLoginCaptcha, login } from '@/api/admin';
import AppMessage from '@/components/AppMessage.vue';
import BrandAvatar from '@/components/BrandAvatar.vue';
import { BRAND_NAME, BRAND_SUBTITLE, LOGIN_BG_IMAGE } from '@/constants/brand';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const captchaLoading = ref(false);
const loginError = ref('');
const captchaId = ref('');
const captchaImage = ref('');
const form = reactive({
  username: '',
  password: '',
  captchaCode: '',
});

async function loadCaptcha() {
  captchaLoading.value = true;
  form.captchaCode = '';

  try {
    const data = await fetchLoginCaptcha();
    captchaId.value = data.captchaId;
    captchaImage.value = data.image;
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : '验证码加载失败';
  } finally {
    captchaLoading.value = false;
  }
}

async function handleSubmit() {
  if (!form.username || !form.password) {
    loginError.value = '请输入用户名和密码';
    return;
  }
  if (!captchaId.value || !form.captchaCode) {
    loginError.value = '请输入验证码';
    return;
  }

  loading.value = true;
  loginError.value = '';

  try {
    const result = await login(
      form.username,
      form.password,
      captchaId.value,
      form.captchaCode,
    );
    localStorage.setItem('farm-admin-name', result.roleNames?.[0] || result.role || '平台管理员');
    localStorage.setItem('farm-admin-account', result.accountNo);
    await router.replace(String(route.query.redirect ?? '/dashboard'));
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : '登录请求失败';
    await loadCaptcha();
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadCaptcha();
});
</script>
