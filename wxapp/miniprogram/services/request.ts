import { API_BASE, REQUEST_TIMEOUT } from '../config/index';
import { logger } from '../utils/logger';
import { buildMerchantLoginUrl, buildProfileLoginUrl, isMerchantRoute } from '../utils/auth-route';
import { clearUserLocalState } from './auth';
import { getToken } from './token';

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  statusCode: number;
  path?: string;
  timestamp?: string;
  data?: T;
  message?: string;
  error?: unknown;
}

export interface RequestOptions<TData = unknown> {
  url: string;
  method?: WechatMiniprogram.RequestOption['method'];
  data?: TData;
  header?: Record<string, string>;
  auth?: boolean;
  timeout?: number;
}

export interface UploadOptions {
  url: string;
  filePath: string;
  name?: string;
  formData?: Record<string, string | number | boolean | undefined>;
  header?: Record<string, string>;
  auth?: boolean;
  timeout?: number;
}

function resolveUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

function parseEnvelope<T>(payload: unknown): ApiEnvelope<T> | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload as ApiEnvelope<T>;
}

function getAuthBootstrapReady(): Promise<unknown> {
  try {
    const app = getApp<any>();
    return app.globalData?.authBootstrapReady || Promise.resolve();
  } catch {
    return Promise.resolve();
  }
}

function getErrorMessage(payload: ApiEnvelope | null, fallback: string): string {
  if (!payload) {
    return fallback;
  }

  return payload.message || fallback;
}

function redirectToLoginPage() {
  try {
    const pages = getCurrentPages();
    const currentRoute = pages[pages.length - 1]?.route ? `/${pages[pages.length - 1].route}` : '';
    const loginUrl = currentRoute && isMerchantRoute(currentRoute)
      ? buildMerchantLoginUrl(currentRoute)
      : buildProfileLoginUrl(currentRoute || '/pages/index/index');

    if (currentRoute.includes('/pages/login/login')) {
      return;
    }

    wx.redirectTo({
      url: loginUrl,
    });
  } catch {
    wx.reLaunch({
      url: '/pages/login/login',
    });
  }
}

export async function request<T = unknown, TData = unknown>(
  options: RequestOptions<TData>,
): Promise<T> {
  const { auth = true, timeout = REQUEST_TIMEOUT, header = {} } = options;

  if (auth && !getToken()) {
    await getAuthBootstrapReady();
  }

  const token = getToken();

  return new Promise<T>((resolve, reject) => {
    wx.request({
      url: resolveUrl(options.url),
      method: options.method || 'GET',
      data: options.data as WechatMiniprogram.IAnyObject | undefined,
      timeout,
      header: {
        'content-type': 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...header,
      },
      success: (res) => {
        const envelope = parseEnvelope<T>(res.data);

        logger.debug('request success', {
          url: options.url,
          statusCode: res.statusCode,
          envelope,
        });

        if (res.statusCode === 401) {
          clearUserLocalState();
          redirectToLoginPage();
          reject(new Error(getErrorMessage(envelope, '登录已失效，请重新登录')));
          return;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(getErrorMessage(envelope, `请求失败：${res.statusCode}`)));
          return;
        }

        if (envelope && envelope.success === false) {
          reject(new Error(getErrorMessage(envelope, '请求失败')));
          return;
        }

        resolve((envelope && envelope.data != null ? envelope.data : null) as T);
      },
      fail: (error) => {
        logger.error('request fail', {
          url: options.url,
          error,
        });

        reject(new Error('网络请求失败，请稍后重试'));
      },
    });
  });
}

export async function upload<T = unknown>(options: UploadOptions): Promise<T> {
  const { auth = true, timeout = REQUEST_TIMEOUT, header = {} } = options;

  if (auth && !getToken()) {
    await getAuthBootstrapReady();
  }

  const token = getToken();

  return new Promise<T>((resolve, reject) => {
    wx.uploadFile({
      url: resolveUrl(options.url),
      filePath: options.filePath,
      name: options.name || 'file',
      formData: options.formData as WechatMiniprogram.IAnyObject | undefined,
      timeout,
      header: {
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...header,
      },
      success: (res) => {
        let payload: unknown = null;

        try {
          payload = res.data ? JSON.parse(res.data) : null;
        } catch {
          payload = null;
        }

        const envelope = parseEnvelope<T>(payload);

        logger.debug('upload success', {
          url: options.url,
          statusCode: res.statusCode,
          envelope,
        });

        if (res.statusCode === 401) {
          clearUserLocalState();
          redirectToLoginPage();
          reject(new Error(getErrorMessage(envelope, '登录已失效，请重新登录')));
          return;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(getErrorMessage(envelope, `上传失败：${res.statusCode}`)));
          return;
        }

        if (envelope && envelope.success === false) {
          reject(new Error(getErrorMessage(envelope, '上传失败')));
          return;
        }

        resolve((envelope && envelope.data != null ? envelope.data : null) as T);
      },
      fail: (error) => {
        logger.error('upload fail', {
          url: options.url,
          error,
        });

        reject(new Error('上传失败，请稍后重试'));
      },
    });
  });
}

export function get<T = unknown, TData = unknown>(
  url: string,
  data?: TData,
  options?: Omit<RequestOptions<TData>, 'url' | 'method' | 'data'>,
) {
  return request<T, TData>({
    url,
    data,
    method: 'GET',
    ...options,
  });
}

export function post<T = unknown, TData = unknown>(
  url: string,
  data?: TData,
  options?: Omit<RequestOptions<TData>, 'url' | 'method' | 'data'>,
) {
  return request<T, TData>({
    url,
    data,
    method: 'POST',
    ...options,
  });
}

export function del<T = unknown, TData = unknown>(
  url: string,
  data?: TData,
  options?: Omit<RequestOptions<TData>, 'url' | 'method' | 'data'>,
) {
  return request<T, TData>({
    url,
    data,
    method: 'DELETE',
    ...options,
  });
}
