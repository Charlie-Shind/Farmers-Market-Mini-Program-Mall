import { get, post } from './request';
import { getCurrentSub, removeToken, setCurrentSub, setToken, setAvailableRoles, setCurrentRole, getToken } from './token';
import { invalidateCartItemCount } from './app';
import { clearProfileDraft } from './profile';

export interface AuthUser {
  sub: string;
  role: string;
  tokenType: string;
  roles?: string[];
}

export interface AuthSessionResponse {
  tokenType: string;
  accessToken: string;
  tokenPrefix: string;
  expiresIn: string;
  user: AuthUser;
}

export interface AuthStatusResponse {
  module: string;
  status: string;
  note?: string;
}

export interface AuthMeResponse {
  user: AuthUser;
  canUseGuest: boolean;
}

export interface WechatLoginPayload {
  code: string;
  avatarUrl?: string;
}

export interface WechatPhoneBindPayload {
  loginCode: string;
  phoneCode: string;
  avatarUrl?: string;
}

export interface WechatPhoneLoginPayload {
  phoneCode: string;
}

export interface WechatSmsLoginPayload {
  code: string;
}

export function fetchAuthStatus() {
  return get<AuthStatusResponse>('/identity/auth/status', undefined, {
    auth: false,
  });
}

export function fetchAnonymousSession() {
  return get<AuthSessionResponse>('/identity/auth/anonymous', undefined, {
    auth: false,
  }).then((session) => {
    if (session && session.accessToken && !getToken()) {
      applySession(session);
    }

    return session;
  });
}

export function fetchCurrentUser() {
  return get<AuthMeResponse>('/identity/auth/me');
}

export function loginWithWechatCode(payload: WechatLoginPayload) {
  return post<AuthSessionResponse>('/identity/auth/wechat/login', payload, {
    auth: false,
  }).then((session) => {
    if (session && session.accessToken) {
      applySession(session);
    }

    return session;
  });
}

export function bindWechatPhone(payload: WechatPhoneBindPayload) {
  return post<AuthSessionResponse>('/identity/auth/wechat/phone-bind', payload, {
    auth: false,
  }).then((session) => {
    if (session && session.accessToken) {
      applySession(session);
    }

    return session;
  });
}

export function loginWithWechatPhone(payload: WechatPhoneLoginPayload) {
  return post<AuthSessionResponse>('/identity/auth/wechat/phone-login', payload, {
    auth: false,
  }).then((session) => {
    if (session && session.accessToken) {
      applySession(session);
    }

    return session;
  });
}

export function loginWithWechatSms(payload: WechatSmsLoginPayload) {
  return post<AuthSessionResponse>('/identity/auth/wechat/sms-login', payload, {
    auth: false,
  }).then((session) => {
    if (session && session.accessToken) {
      applySession(session);
    }

    return session;
  });
}

export function refreshToken() {
  return post<AuthSessionResponse>('/identity/auth/refresh', {}).then((session) => {
    if (session && session.accessToken) {
      applySession(session);
    }

    return session;
  });
}

export function switchRole(role: string) {
  return post<AuthSessionResponse>('/identity/auth/switch-role', { role }, {
    auth: true,
  }).then((session) => {
    if (session && session.accessToken) {
      applySession(session);
    }

    return session;
  });
}

function applySession(session: AuthSessionResponse): void {
  const oldSub = getCurrentSub();
  const newSub = session.user?.sub;
  const switched = Boolean(oldSub && newSub && oldSub !== newSub);

  if (switched) {
    clearUserLocalState();
  }

  setToken(
    session.accessToken,
    session.tokenType === 'guest' ? 'guest' : 'access',
    session.user?.role || '',
  );
  setAvailableRoles(session.user?.roles || []);
  setCurrentRole(session.user?.role || '');

  if (newSub) {
    setCurrentSub(newSub);
  }
}

const USER_PROFILE_CACHE_KEY = 'farm_user_profile_cache';

export function clearUserLocalState(): void {
  removeToken();
  invalidateCartItemCount();

  try {
    wx.removeStorageSync(USER_PROFILE_CACHE_KEY);
  } catch (error) {
    // storage may not be available; ignore
  }

  try {
    clearProfileDraft();
  } catch (error) {
    // ignore
  }

  try {
    const app = getApp<any>();
    app?.eventBus?.emit?.('user:switched');
  } catch (error) {
    // event bus not ready; ignore
  }
}

export const refreshSessionToken = refreshToken;
