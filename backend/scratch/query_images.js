const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = 'postgresql://farm:farm123456@127.0.0.1:6001/farm?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Querying Banners...');
  const banners = await prisma.banner.findMany();
  console.log('Banners count:', banners.length);
  banners.forEach(b => {
    console.log(`Banner ID: ${b.id}, Title: ${b.title}, URL: ${b.imageUrl}`);
  });

  console.log('\nQuerying Categories...');
  const categories = await prisma.category.findMany();
  console.log('Categories count:', categories.length);
  categories.slice(0, 10).forEach(c => {
    console.log(`Category ID: ${c.id}, Name: ${c.name}, Icon: ${c.iconUrl}`);
  });

  console.log('\nQuerying Products...');
  const products = await prisma.product.findMany();
  console.log('Products count:', products.length);
  products.slice(0, 10).forEach(p => {
    console.log(`Product ID: ${p.id}, Title: ${p.title}, Cover: ${p.coverUrl}`);
  });

  console.log('\nQuerying ProductImages...');
  const productImages = await prisma.productImage.findMany();
  console.log('ProductImages count:', productImages.length);
  productImages.slice(0, 10).forEach(pi => {
    console.log(`ProductImage ID: ${pi.id}, ProductId: ${pi.productId}, URL: ${pi.imageUrl}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
