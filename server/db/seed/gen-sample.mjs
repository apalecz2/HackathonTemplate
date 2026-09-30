// Regenerates sample.csv deterministically: node db/seed/gen-sample.mjs
import fs from 'node:fs';

const regions = ['East', 'West', 'North', 'South', 'Central'];
const products = ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Webcam'];
const price = { Laptop: 1200, Monitor: 320, Keyboard: 85, Mouse: 40, Headset: 110, Webcam: 75 };
let seed = 1;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

let out = 'order_id,order_date,region,product,quantity,unit_price,status\n';
for (let i = 1; i <= 240; i++) {
  const date = new Date(Date.UTC(2024, 0, 1) + Math.floor(rand() * 365) * 864e5).toISOString().slice(0, 10);
  const product = products[Math.floor(rand() * products.length)];
  const roll = rand();
  const status = roll < 0.04 ? '' : roll < 0.85 ? 'completed' : roll < 0.93 ? 'cancelled' : 'returned';
  const region = regions[Math.floor(rand() * regions.length)];
  out += [1000 + i, date, region, product, 1 + Math.floor(rand() * 5), price[product], status].join(',') + '\n';
}
fs.writeFileSync(new URL('./sample.csv', import.meta.url), out);
