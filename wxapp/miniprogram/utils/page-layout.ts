type WindowInfoLike = {
  statusBarHeight?: number;
  windowWidth?: number;
  safeArea?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    width?: number;
    height?: number;
  };
};

type MenuRectLike = {
  top?: number;
  bottom?: number;
  height?: number;
  left?: number;
  width?: number;
};

type PageMetrics = {
  statusBarHeight: number;
  menuTop: number;
  menuHeight: number;
  menuBottom: number;
  /** 状态栏下方整段导航栏高度（含胶囊上下间距），标题在这段内垂直居中即可与胶囊对齐 */
  navBarHeight: number;
  safeRight: number;
};

/**
 * 微信官方同款度量：
 * gap = menu.top - statusBarHeight
 * navBarHeight = gap * 2 + menu.height
 * 标题栏：padding-top=statusBarHeight，height=navBarHeight → 与胶囊垂直居中对齐
 */
export function readPageMetrics(rightGapPx = 12): PageMetrics {
  try {
    const system = wx.getSystemInfoSync() as WindowInfoLike;
    const menu = wx.getMenuButtonBoundingClientRect() as MenuRectLike;
    const statusBarHeight = Math.max(
      20,
      Math.round(system.statusBarHeight ?? system.safeArea?.top ?? 20),
    );
    const menuTop = Math.max(
      statusBarHeight,
      Math.round(menu.top ?? statusBarHeight + 6),
    );
    const menuHeight = Math.max(
      32,
      Math.round(menu.height ?? ((menu.bottom ?? menuTop + 32) - menuTop)),
    );
    const menuBottom = menuTop + menuHeight;
    const gap = Math.max(0, menuTop - statusBarHeight);
    const navBarHeight = gap * 2 + menuHeight;
    const safeRight =
      menu.left != null && system.windowWidth != null
        ? Math.max(12, Math.round(system.windowWidth - menu.left + rightGapPx))
        : 112;

    return {
      statusBarHeight,
      menuTop,
      menuHeight,
      menuBottom,
      navBarHeight,
      safeRight,
    };
  } catch {
    return {
      statusBarHeight: 20,
      menuTop: 48,
      menuHeight: 32,
      menuBottom: 80,
      navBarHeight: 44,
      safeRight: 112,
    };
  }
}

function toCssVars(metrics: PageMetrics, pageTop: number): string {
  return [
    `--status-bar-height: ${metrics.statusBarHeight}px`,
    `--menu-top: ${metrics.menuTop}px`,
    `--menu-height: ${metrics.menuHeight}px`,
    `--nav-height: ${metrics.navBarHeight}px`,
    `--nav-side: ${metrics.navBarHeight}px`,
    `--nav-bottom: ${metrics.menuBottom}px`,
    `--nav-gap-bottom: 12rpx`,
    `--page-top: ${pageTop}px`,
    `--header-content-top: ${pageTop}px`,
    `--header-safe-right: ${metrics.safeRight}px`,
  ].join('; ');
}

/**
 * 标准自定义导航（返回+标题与右侧胶囊垂直居中对齐）。
 * page-top = 状态栏高度；标题栏高度 = 完整导航栏高度。
 */
export function buildPageTopStyle(_extraGapPx = 0, rightGapPx = 12): string {
  const metrics = readPageMetrics(rightGapPx);
  return toCssVars(metrics, metrics.statusBarHeight);
}

/**
 * 胶囊下方整行工具栏（搜索页等需占满宽度时）。
 */
export function buildPageHeaderStyle(_extraGapPx = 8, rightGapPx = 12): string {
  const metrics = readPageMetrics(rightGapPx);
  const pageTop = metrics.statusBarHeight + metrics.navBarHeight + 8;
  return toCssVars(metrics, pageTop);
}

export function buildHeaderSafeRightStyle(extraGapPx = 12): string {
  const metrics = readPageMetrics(extraGapPx);
  return [
    `--header-safe-right: ${metrics.safeRight}px`,
    `--nav-height: ${metrics.navBarHeight}px`,
    `--status-bar-height: ${metrics.statusBarHeight}px`,
  ].join('; ');
}
