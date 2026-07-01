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
  left?: number;
  width?: number;
};

export function buildPageTopStyle(extraGapPx = 4): string {
  try {
    const system = wx.getSystemInfoSync() as WindowInfoLike;
    const menu = wx.getMenuButtonBoundingClientRect() as MenuRectLike;
    const safeTop = system.safeArea?.top ?? system.statusBarHeight ?? (menu.top != null ? menu.top : 0);
    const compactGapPx = Math.max(0, extraGapPx - 8);
    const pageTop = Math.max(0, Math.round(safeTop + compactGapPx));
    const safeRight =
      menu.left != null && system.windowWidth != null
        ? Math.max(24, Math.round(system.windowWidth - menu.left + 12))
        : 112;

    return `--page-top: ${pageTop}px; --header-safe-right: ${safeRight}px;`;
  } catch {
    return `--page-top: 40px; --header-safe-right: 112px;`;
  }
}

export function buildPageHeaderStyle(extraGapPx = 4, rightGapPx = 12): string {
  try {
    const system = wx.getSystemInfoSync() as WindowInfoLike;
    const menu = wx.getMenuButtonBoundingClientRect() as MenuRectLike;
    const safeTop = system.safeArea?.top ?? system.statusBarHeight ?? (menu.top != null ? menu.top : 0);
    const menuTop = Math.round(menu.top ?? safeTop);
    const menuBottom = Math.round(menu.bottom ?? menuTop + 32);
    const menuHeight = Math.max(32, menuBottom - menuTop);
    const contentTop = menuBottom + Math.max(12, extraGapPx);
    const safeRight =
      menu.left != null && system.windowWidth != null
        ? Math.max(12, Math.round(system.windowWidth - menu.left + rightGapPx))
        : 24;

    return `--menu-top: ${menuTop}px; --menu-height: ${menuHeight}px; --header-content-top: ${contentTop}px; --page-top: ${contentTop}px; --header-safe-right: ${safeRight}px;`;
  } catch {
    return `--menu-top: 48px; --menu-height: 32px; --header-content-top: 88px; --page-top: 88px; --header-safe-right: 24px;`;
  }
}

export function buildHeaderSafeRightStyle(extraGapPx = 12): string {
  try {
    const system = wx.getSystemInfoSync() as WindowInfoLike;
    const menu = wx.getMenuButtonBoundingClientRect() as MenuRectLike;
    const safeRight =
      menu.left != null && system.windowWidth != null
        ? Math.max(24, Math.round(system.windowWidth - menu.left + extraGapPx))
        : 24;

    return `--header-safe-right: ${safeRight}px;`;
  } catch {
    return `--header-safe-right: 24px;`;
  }
}
