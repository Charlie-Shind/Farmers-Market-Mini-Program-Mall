/**
 * 将 TS/JS 中的 /assets/icons/*.svg 路径替换为 Lucide 图标名
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../wxapp/miniprogram');

const MAP = {
  '/assets/icons/back.svg': 'back',
  '/assets/icons/filter.svg': 'filter',
  '/assets/icons/close.svg': 'close',
  '/assets/icons/check.svg': 'check',
  '/assets/icons/bell.svg': 'bell',
  '/assets/icons/wallet.svg': 'wallet',
  '/assets/icons/store.svg': 'shop',
  '/assets/icons/box.svg': 'package',
  '/assets/icons/message.svg': 'message',
  '/assets/icons/edit.svg': 'edit',
  '/assets/icons/eye.svg': 'eye',
  '/assets/icons/camera.svg': 'camera',
  '/assets/icons/clock.svg': 'clock',
  '/assets/icons/search.svg': 'search',
  '/assets/icons/plus.svg': 'plus',
  '/assets/icons/bill.svg': 'invoice',
  '/assets/icons/order.svg': 'invoice',
  '/assets/icons/chart.svg': 'discover',
  '/assets/icons/truck.svg': 'truck',
  '/assets/icons/star.svg': 'star',
  '/assets/icons/minus.svg': 'minus',
  '/assets/icons/home.svg': 'home',
  '/assets/icons/location.svg': 'map',
  '/assets/icons/user.svg': 'profile',
  '/assets/icons/shield.svg': 'shield',
  '/assets/icons/chevron.svg': 'chevronRight',
  '/assets/icons/chevron-right.svg': 'chevronRight',
  '/assets/icons/delivery.svg': 'truck',
  '/assets/icons/finance.svg': 'wallet',
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  for (const [from, to] of Object.entries(MAP)) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changed += 1;
    console.log('Updated:', path.relative(ROOT, file));
  }
}

console.log(`Done. ${changed} files updated.`);
