export type LocationSource = 'auto' | 'manual';

export type SelectedLocation = {
  source: LocationSource;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  updatedAt: number;
};

const LOCATION_STORAGE_KEY = 'selected-location';

export const DEFAULT_LOCATION_LABEL = '湾源县';

type ReverseGeocodeResult = {
  name: string;
  address: string;
};

let reverseGeocodeOverride: ((lat: number, lng: number) => Promise<ReverseGeocodeResult>) | null = null;

export function setReverseGeocodeProvider(
  provider: (lat: number, lng: number) => Promise<ReverseGeocodeResult>,
): void {
  reverseGeocodeOverride = provider;
}

export function loadSelectedLocation(): SelectedLocation | null {
  try {
    const value = wx.getStorageSync(LOCATION_STORAGE_KEY);
    if (!value || typeof value !== 'object') {
      return null;
    }

    const draft = value as Partial<SelectedLocation>;
    if (
      !draft.source ||
      !draft.name ||
      !Number.isFinite(Number(draft.latitude)) ||
      !Number.isFinite(Number(draft.longitude))
    ) {
      return null;
    }

    return {
      source: draft.source,
      name: String(draft.name),
      address: String(draft.address ?? ''),
      latitude: Number(draft.latitude),
      longitude: Number(draft.longitude),
      updatedAt: Number(draft.updatedAt ?? Date.now()),
    };
  } catch {
    return null;
  }
}

export function saveSelectedLocation(location: SelectedLocation) {
  wx.setStorageSync(LOCATION_STORAGE_KEY, location);
}

export function clearSelectedLocation() {
  try {
    wx.removeStorageSync(LOCATION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function ensureLocationPermission(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          resolve();
          return;
        }

        wx.authorize({
          scope: 'scope.userLocation',
          success: () => resolve(),
          fail: () => {
            wx.showModal({
              title: '需要定位权限',
              content: '请在设置中允许小程序使用定位权限，以便我们为您提供自动定位服务。',
              confirmText: '去设置',
              success: (modalRes) => {
                if (!modalRes.confirm) {
                  reject(new Error('user denied permission'));
                  return;
                }

                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.userLocation']) {
                      resolve();
                      return;
                    }
                    reject(new Error('user denied permission in settings'));
                  },
                  fail: reject,
                });
              },
              fail: reject,
            });
          },
        });
      },
      fail: reject,
    });
  });
}

function getCurrentGPSLocation(): Promise<WechatMiniprogram.GetLocationSuccessCallbackResult> {
  return new Promise((resolve, reject) => {
    const fuzzy = (wx as any).getFuzzyLocation as
      | ((opts: { type?: string; success: (res: any) => void; fail: (err: any) => void }) => void)
      | undefined;

    if (typeof fuzzy === 'function') {
      fuzzy({
        type: 'gcj02',
        success: resolve,
        fail: () => {
          wx.getLocation({
            type: 'gcj02',
            success: resolve,
            fail: reject,
          });
        },
      });
      return;
    }

    wx.getLocation({
      type: 'gcj02',
      success: resolve,
      fail: reject,
    });
  });
}

function buildFallbackLocation(): ReverseGeocodeResult {
  return {
    name: DEFAULT_LOCATION_LABEL,
    address: DEFAULT_LOCATION_LABEL,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  if (reverseGeocodeOverride) {
    return reverseGeocodeOverride(lat, lng);
  }
  return buildFallbackLocation();
}

export async function updateAutoLocation(): Promise<SelectedLocation> {
  await ensureLocationPermission();
  const gps = await getCurrentGPSLocation();
  const reverse = await reverseGeocode(gps.latitude, gps.longitude);

  const autoLocation: SelectedLocation = {
    source: 'auto',
    name: reverse.name,
    address: reverse.address,
    latitude: gps.latitude,
    longitude: gps.longitude,
    updatedAt: Date.now(),
  };
  saveSelectedLocation(autoLocation);
  return autoLocation;
}

