/**
 * 全局下拉刷新：在 app 启动时安装，给所有页面（Page / Component 页面）注入 onPullDownRefresh。
 * 优先调用页面自带的 onPullDownRefresh；否则尝试常见加载方法 / pageLifetimes.show。
 */
type AnyFn = (...args: any[]) => any;

function asPromise(result: unknown) {
  return Promise.resolve(result);
}

async function invokeDefaultRefresh(ctx: any, pageShow?: AnyFn) {
  const attempts: Array<[string, any[]]> = [
    ['refreshPage', []],
    ['refresh', []],
    ['reload', []],
    ['loadData', []],
    ['loadHomeData', []],
    ['loadProfileData', []],
    ['loadCartData', []],
    ['loadOrders', [true]],
    ['loadList', [true]],
    ['fetchData', []],
    ['initData', []],
    ['bootstrap', []],
  ];

  for (const [name, args] of attempts) {
    const fn = ctx?.[name];
    if (typeof fn === 'function') {
      await asPromise(fn.apply(ctx, args));
      return;
    }
  }

  if (typeof pageShow === 'function') {
    await asPromise(pageShow.call(ctx));
    return;
  }

  if (typeof ctx?.onShow === 'function') {
    await asPromise(ctx.onShow());
  }
}

function isLikelyPageComponent(options: Record<string, any> | undefined) {
  if (!options || typeof options !== 'object') return false;
  if (options.pageLifetimes) return true;
  if (typeof options.onLoad === 'function' || typeof options.onShow === 'function') return true;
  if (typeof options.onPullDownRefresh === 'function') return true;
  const methods = options.methods || {};
  if (typeof methods.onLoad === 'function' || typeof methods.onShow === 'function') return true;
  if (typeof methods.onPullDownRefresh === 'function') return true;
  return false;
}

function wrapPullDownHandler(userPull: AnyFn | undefined, pageShow?: AnyFn) {
  return async function onPullDownRefresh(this: any) {
    try {
      if (typeof userPull === 'function') {
        await asPromise(userPull.call(this));
      } else {
        await invokeDefaultRefresh(this, pageShow);
      }
    } catch (error) {
      console.error('[pullDownRefresh]', error);
    } finally {
      try {
        wx.stopPullDownRefresh();
      } catch {
        // ignore
      }
    }
  };
}

export function installPullDownRefresh() {
  const originComponent = Component;
  (Component as any) = function patchedComponent(options: any = {}) {
    if (!isLikelyPageComponent(options)) {
      return originComponent(options);
    }

    const next = { ...options };
    const methods = { ...(next.methods || {}) };
    const userPull = methods.onPullDownRefresh || next.onPullDownRefresh;
    const pageShow = next.pageLifetimes?.show;
    methods.onPullDownRefresh = wrapPullDownHandler(userPull, pageShow);
    next.methods = methods;
    if (next.onPullDownRefresh) {
      delete next.onPullDownRefresh;
    }
    return originComponent(next);
  };

  const originPage = Page;
  (Page as any) = function patchedPage(options: any = {}) {
    const next = { ...options };
    next.onPullDownRefresh = wrapPullDownHandler(next.onPullDownRefresh, next.onShow);
    return originPage(next);
  };
}
