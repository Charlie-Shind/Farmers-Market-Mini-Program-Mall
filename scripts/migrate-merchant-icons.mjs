/**
 * 将商家端 wxml 中 /assets/icons/*.svg 替换为 t-icon
 * 运行：node scripts/migrate-merchant-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MERCHANT_DIR = path.join(__dirname, '../wxapp/miniprogram/pages/merchant');

const FILE_TO_NAME = {
  back: 'back',
  filter: 'filter',
  close: 'close',
  check: 'check',
  bell: 'bell',
  wallet: 'wallet',
  store: 'shop',
  box: 'package',
  message: 'message',
  edit: 'edit',
  eye: 'eye',
  camera: 'camera',
  clock: 'clock',
  search: 'search',
  plus: 'plus',
  bill: 'invoice',
  minus: 'minus',
  truck: 'truck',
  settings: 'settings',
  home: 'home',
  cart: 'cart',
  star: 'star',
  location: 'map',
  phone: 'phone',
  upload: 'upload',
  download: 'download',
  refresh: 'refresh',
  share: 'share',
  qrcode: 'qrcode',
  scan: 'scan',
  logout: 'logout',
  delete: 'delete',
  copy: 'copy',
  image: 'image',
  menu: 'menu',
  more: 'more',
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.wxml')) out.push(full);
  }
  return out;
}

function migrateContent(content) {
  let next = content;

  next = next.replace(
    /<image([^>]*?)class="fit-icon"([^>]*?)src="\/assets\/icons\/([a-zA-Z0-9_-]+)\.svg"([^>]*?)\/>/g,
    (_m, a, b, file, c) => {
      const name = FILE_TO_NAME[file.replace(/-/g, '')] || FILE_TO_NAME[file] || file;
      const attrs = `${a}${b}${c}`.replace(/\s*mode="aspectFit"/g, '');
      const styleMatch = attrs.match(/style="([^"]*)"/);
      const sizeMatch = styleMatch?.[1]?.match(/width:\s*([^;]+)/);
      const size = sizeMatch ? sizeMatch[1].trim() : '40rpx';
      const opacityMatch = styleMatch?.[1]?.match(/opacity:\s*([^;]+)/);
      const opacityAttr = opacityMatch ? ` opacity="${opacityMatch[1].trim()}"` : '';
      return `<t-icon name="${name}" size="${size}"${opacityAttr}></t-icon>`;
    },
  );

  // icon-box wrappers with dynamic item.icon paths - leave dynamic for manual TS fix
  return next;
}

function ensureTIcon(jsonFile) {
  if (!fs.existsSync(jsonFile)) return;
  const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const comps = json.usingComponents || {};
  if (!comps['t-icon']) {
    const rel = path
      .relative(path.dirname(jsonFile), path.join(__dirname, '../wxapp/miniprogram/components/base/t-icon/t-icon'))
      .replace(/\\/g, '/');
    comps['t-icon'] = rel;
    json.usingComponents = comps;
    fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2) + '\n', 'utf8');
  }
}

let changed = 0;
for (const file of walk(MERCHANT_DIR)) {
  const original = fs.readFileSync(file, 'utf8');
  const next = migrateContent(original);
  if (next !== original) {
    fs.writeFileSync(file, next, 'utf8');
    ensureTIcon(file.replace(/\.wxml$/, '.json'));
    changed += 1;
    console.log('Migrated:', path.relative(MERCHANT_DIR, file));
  }
}

console.log(`Done. ${changed} merchant wxml files updated.`);
