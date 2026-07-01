/**
 * 从 Lucide Icons (ISC) 生成小程序 shared/icons 注册表
 * 运行：node scripts/gen-lucide-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { icons: lucideIcons } = require('../wxapp/node_modules/lucide/dist/cjs/lucide.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../wxapp/miniprogram/shared/icons/registry');

const ICON_MAP = {
  home: 'Home',
  category: 'LayoutGrid',
  discover: 'Compass',
  cart: 'ShoppingCart',
  profile: 'User',
  back: 'ChevronLeft',
  chevronRight: 'ChevronRight',
  chevronLeft: 'ChevronLeft',
  chevronDown: 'ChevronDown',
  chevronUp: 'ChevronUp',
  close: 'X',
  menu: 'Menu',
  more: 'Ellipsis',
  sidebarCollapse: 'PanelLeftClose',
  sidebarExpand: 'PanelLeftOpen',
  arrowRight: 'ArrowRight',
  arrowDown: 'ChevronDown',
  map: 'MapPin',
  search: 'Search',
  plus: 'Plus',
  plusLight: 'Plus',
  minus: 'Minus',
  check: 'Check',
  edit: 'Pencil',
  delete: 'Trash2',
  refresh: 'RefreshCw',
  filter: 'Filter',
  sort: 'ArrowUpDown',
  share: 'Share2',
  upload: 'Upload',
  download: 'Download',
  camera: 'Camera',
  image: 'Image',
  eye: 'Eye',
  eyeOff: 'EyeOff',
  qrcode: 'QrCode',
  scan: 'ScanLine',
  logout: 'LogOut',
  play: 'Play',
  pause: 'Pause',
  copy: 'Copy',
  loader: 'LoaderCircle',
  info: 'Info',
  success: 'Check',
  warning: 'TriangleAlert',
  error: 'CircleX',
  messageInfo: 'Info',
  messageSuccess: 'CircleCheck',
  messageWarning: 'TriangleAlert',
  messageError: 'CircleX',
  empty: 'Inbox',
  networkError: 'WifiOff',
  clock: 'Clock',
  calendar: 'Calendar',
  bell: 'Bell',
  location: 'MapPin',
  message: 'MessageSquare',
  phone: 'Phone',
  avatar: 'User',
  logo: 'Sprout',
  flash: 'Zap',
  group: 'Users',
  gift: 'Gift',
  origin: 'Leaf',
  favorite: 'Heart',
  history: 'History',
  follow: 'UserPlus',
  support: 'Headset',
  feedback: 'MessageSquareText',
  comment: 'MessageSquare',
  refund: 'Undo2',
  address: 'MapPin',
  coupon: 'Ticket',
  points: 'Award',
  shop: 'Store',
  member: 'BadgeCheck',
  shopBag: 'ShoppingBag',
  settings: 'Settings',
  shield: 'ShieldCheck',
  redPacket: 'Gift',
  invoice: 'FileText',
  star: 'Star',
  starFilled: 'Star',
  thumbUp: 'ThumbsUp',
  signin: 'LogIn',
  invite: 'UserPlus',
  report: 'Flag',
  categoryFruit: 'Apple',
  categoryMeat: 'Beef',
  categoryRice: 'Wheat',
  categoryGift: 'Gift',
  categoryOrganic: 'Leaf',
  categoryOrigin: 'MapPinned',
  categoryPresale: 'CalendarClock',
  categoryLocal: 'Warehouse',
  catVegetable: 'Carrot',
  catSnack: 'Cookie',
  catDrink: 'CupSoda',
  catBaby: 'Baby',
  catSeafood: 'Fish',
  catPersonal: 'Sparkles',
  orderPendingPay: 'Wallet',
  orderPendingShip: 'Package',
  orderPendingReceive: 'Truck',
  orderPendingReview: 'Star',
  orderRefunded: 'RotateCcw',
  wallet: 'Wallet',
  truck: 'Truck',
  package: 'Package',
  delivering: 'PackageCheck',
  signed: 'ClipboardCheck',
  wechatPay: 'MessageCircle',
  wechat: 'MessageCircle',
};

const CATEGORIES = {
  navigation: [
    'home', 'category', 'discover', 'cart', 'profile', 'back', 'chevronRight', 'chevronLeft',
    'chevronDown', 'chevronUp', 'close', 'menu', 'more', 'sidebarCollapse', 'sidebarExpand',
    'arrowRight', 'arrowDown', 'map',
  ],
  action: [
    'search', 'plus', 'plusLight', 'minus', 'check', 'edit', 'delete', 'refresh', 'filter', 'sort',
    'share', 'upload', 'download', 'camera', 'image', 'eye', 'eyeOff', 'qrcode', 'scan', 'logout',
    'play', 'pause', 'copy', 'loader',
  ],
  status: [
    'info', 'success', 'warning', 'error', 'messageInfo', 'messageSuccess', 'messageWarning',
    'messageError', 'empty', 'networkError', 'clock', 'calendar', 'bell',
  ],
  business: [
    'location', 'message', 'phone', 'avatar', 'logo', 'flash', 'group', 'gift', 'origin', 'favorite',
    'history', 'follow', 'support', 'feedback', 'comment', 'refund', 'address', 'coupon', 'points',
    'shop', 'member', 'shopBag', 'settings', 'shield', 'redPacket', 'invoice', 'star', 'starFilled',
    'thumbUp', 'signin', 'invite', 'report',
  ],
  category: [
    'categoryFruit', 'categoryMeat', 'categoryRice', 'categoryGift', 'categoryOrganic', 'categoryOrigin',
    'categoryPresale', 'categoryLocal', 'catVegetable', 'catSnack', 'catDrink', 'catBaby', 'catSeafood',
    'catPersonal',
  ],
  order: [
    'orderPendingPay', 'orderPendingShip', 'orderPendingReceive', 'orderPendingReview', 'orderRefunded',
    'wallet', 'truck', 'package', 'delivering', 'signed', 'wechatPay', 'wechat',
  ],
};

function nodeToSvg([tag, attrs]) {
  const parts = Object.entries(attrs)
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '&quot;')}"`)
    .join(' ');
  return `<${tag} ${parts}/>`;
}

function lucideToBody(name, { filled = false } = {}) {
  const lucideName = ICON_MAP[name];
  if (!lucideName || !lucideIcons[lucideName]) {
    throw new Error(`Missing Lucide mapping for icon: ${name} -> ${lucideName}`);
  }

  return lucideIcons[lucideName]
    .map((node) => {
      const [tag, attrs] = node;
      if (filled && tag === 'path') {
        return nodeToSvg([tag, { ...attrs, fill: 'currentColor' }]);
      }
      return nodeToSvg([tag, attrs]);
    })
    .join('');
}

function writeRegistry(category, names) {
  const constName = `${category}Icons`;
  const lines = names.map((name) => {
    const body = lucideToBody(name, { filled: name === 'starFilled' });
    return `  ${name}: '${body.replace(/'/g, "\\'")}',`;
  });

  const content = `// Lucide Icons (ISC) 内联 SVG — ${category}类
// https://lucide.dev — 由 scripts/gen-lucide-icons.mjs 自动生成，请勿手改

export const ${constName} = {
${lines.join('\n')}
} as const;
`;

  const file = path.join(OUT_DIR, `${category}.ts`);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Wrote ${file} (${names.length} icons)`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [category, names] of Object.entries(CATEGORIES)) {
  writeRegistry(category, names);
}

// 同步生成 .js 副本（小程序运行时可能直接引用 js）
for (const category of Object.keys(CATEGORIES)) {
  const tsFile = path.join(OUT_DIR, `${category}.ts`);
  const jsFile = path.join(OUT_DIR, `${category}.js`);
  const ts = fs.readFileSync(tsFile, 'utf8');
  fs.writeFileSync(jsFile, ts.replace(/ as const;/g, ';'), 'utf8');
}

console.log('Done. Lucide icon registry regenerated.');
