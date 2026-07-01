/**
 * 小程序环境配置入口
 *
 * 实际配置位于同级 env.config.ts（不入版本控制）
 * 如需新增配置项，请同时修改:
 *   - env.config.example.ts (模板)
 *   - env.config.ts (本地实际值)
 *   - 本文件 (类型声明 + 默认值)
 */
import {
  API_BASE_URLS as USER_API_BASE_URLS,
  TRACE_BASE_URL as USER_TRACE_BASE_URL,
  QR_CODE_API_URL as USER_QR_CODE_API_URL,
  REQUEST_TIMEOUT as USER_REQUEST_TIMEOUT,
} from './env.config';

export type AppEnv = 'dev' | 'test' | 'prod';
export type MiniProgramRuntimeEnv = 'develop' | 'trial' | 'release';

const DEFAULT_APP_ENV: AppEnv = 'dev';

function getMiniProgramRuntimeEnv(): MiniProgramRuntimeEnv {
  try {
    return wx.getAccountInfoSync().miniProgram.envVersion;
  } catch (error) {
    return 'develop';
  }
}

export const RUNTIME_ENV = getMiniProgramRuntimeEnv();

export const APP_ENV: AppEnv =
  RUNTIME_ENV === 'develop'
    ? 'dev'
    : RUNTIME_ENV === 'trial'
      ? 'test'
      : 'prod';

/**
 * 三个环境的 API 地址
 * 由 env.config.ts 提供，本文件不内置任何 localhost / IP
 */
export const API_BASE_MAP: Record<AppEnv, string> = USER_API_BASE_URLS;

export const API_BASE = API_BASE_MAP[APP_ENV] || API_BASE_MAP[DEFAULT_APP_ENV];

/** 溯源页 URL 前缀 */
export const TRACE_BASE_URL: string = USER_TRACE_BASE_URL;

/** 二维码生成 API */
export const QR_CODE_API_URL: string = USER_QR_CODE_API_URL;

/** 请求超时（毫秒） */
export const REQUEST_TIMEOUT: number = USER_REQUEST_TIMEOUT;

export function getEnvLabel(env: MiniProgramRuntimeEnv = RUNTIME_ENV): string {
  if (env === 'develop') return '开发版';
  if (env === 'trial') return '体验版';
  return '正式版';
}

export function getAppEnvLabel(env: AppEnv = APP_ENV): string {
  if (env === 'dev') return '开发环境';
  if (env === 'test') return '测试环境';
  return '生产环境';
}

/** 构造溯源页完整 URL */
export function buildTracePageUrl(traceCode: string): string {
  return `${TRACE_BASE_URL}/${encodeURIComponent(traceCode)}`;
}

/** 构造二维码图片 URL */
export function buildQrCodeImageUrl(data: string, size = 200): string {
  const separator = QR_CODE_API_URL.includes('?') ? '&' : '?';
  return `${QR_CODE_API_URL}${separator}size=${size}x${size}&data=${encodeURIComponent(data)}`;
}
