/// <reference path="./types/index.d.ts" />

type AppEnv = 'dev' | 'test' | 'prod';
type MiniProgramRuntimeEnv = 'develop' | 'trial' | 'release';

interface IAppOption extends WechatMiniprogram.IAnyObject {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    accessToken?: string,
    appEnv?: AppEnv,
    runtimeEnv?: MiniProgramRuntimeEnv,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}
