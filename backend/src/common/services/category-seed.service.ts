import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObjectStorageService } from '../storage/object-storage.service';

const PARENT_CATEGORIES = [
  {
    name: '时令果蔬',
    sortOrder: 1,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#E8F5E9"/><g transform="translate(32, 32) scale(2.66)"><path d="M12 21a6 6 0 0 0 6-6c0-4-3-7-6-7s-6 3-6 7a6 6 0 0 0 6 6z" fill="none" stroke="#2C4A39" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8A4 4 0 0 1 8 12" fill="none" stroke="#2C4A39" stroke-width="1.8" stroke-linecap="round"/><path d="M16 4l-4 4" fill="none" stroke="#2C4A39" stroke-width="1.8" stroke-linecap="round"/></g></svg>',
  },
  {
    name: '肉禽蛋奶',
    sortOrder: 2,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#FFF3E0"/><g transform="translate(32, 32) scale(2.66)"><path d="M5 12c0 -4 3 -7 7 -7s7 3 7 7s-3 7 -7 7s-7 -3 -7 -7z" fill="none" stroke="#E65100" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12h14" fill="none" stroke="#E65100" stroke-width="1.8"/><circle cx="9" cy="12" r="1.5" fill="#E65100"/><circle cx="15" cy="12" r="1.5" fill="#E65100"/></g></svg>',
  },
  {
    name: '粮油干货',
    sortOrder: 3,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#FFF8E1"/><g transform="translate(32, 32) scale(2.66)"><path d="M3 12h18" fill="none" stroke="#FF8F00" stroke-width="1.8"/><path d="M12 3v9" fill="none" stroke="#FF8F00" stroke-width="1.8" stroke-linecap="round"/><path d="M12 12a8 8 0 0 0 8 8H4a8 8 0 0 0 8-8z" fill="none" stroke="#FF8F00" stroke-width="1.8" stroke-linejoin="round"/></g></svg>',
  },
  {
    name: '特产礼盒',
    sortOrder: 4,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#FCE4EC"/><g transform="translate(32, 32) scale(2.66)"><rect x="3" y="11" width="18" height="10" rx="2" fill="none" stroke="#C2185B" stroke-width="1.8"/><path d="M12 2v18" fill="none" stroke="#C2185B" stroke-width="1.8"/><path d="M3 11h18" fill="none" stroke="#C2185B" stroke-width="1.8"/><path d="M12 7a2.5 2.5 0 1 0-2.5-2.5" fill="none" stroke="#C2185B" stroke-width="1.8" stroke-linecap="round"/><path d="M12 7a2.5 2.5 0 1 1 2.5-2.5" fill="none" stroke="#C2185B" stroke-width="1.8" stroke-linecap="round"/></g></svg>',
  },
];

const SUB_CATEGORIES = [
  {
    name: '调味品',
    parentName: '粮油干货',
    sortOrder: 1,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#E0F7FA"/><g transform="translate(32, 32) scale(2.66)"><path d="M9 3h6M10 3v3m4-3v3M6 9h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z" fill="none" stroke="#006064" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6h4v3h-4z" fill="none" stroke="#006064" stroke-width="1.8"/></g></svg>',
  },
  {
    name: '米/面/粉/杂粮',
    parentName: '粮油干货',
    sortOrder: 2,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#F3E5F5"/><g transform="translate(32, 32) scale(2.66)"><path d="M12 3L6 12h12z" fill="none" stroke="#4A148C" stroke-width="1.8" stroke-linejoin="round"/><path d="M2 12h20" fill="none" stroke="#4A148C" stroke-width="1.8"/><path d="M12 12a8 8 0 0 1-8 8h16a8 8 0 0 1-8-8z" fill="none" stroke="#4A148C" stroke-width="1.8"/><path d="M16 2l-6 10" fill="none" stroke="#4A148C" stroke-width="1.8"/></g></svg>',
  },
  {
    name: '南北干货',
    parentName: '粮油干货',
    sortOrder: 3,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#EFEBE9"/><g transform="translate(32, 32) scale(2.66)"><path d="M12 3a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9z" fill="none" stroke="#3E2723" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 12v7a2 2 0 0 0 4 0v-7" fill="none" stroke="#3E2723" stroke-width="1.8" stroke-linecap="round"/></g></svg>',
  },
  {
    name: '即食海参',
    parentName: '特产礼盒',
    sortOrder: 1,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#E0F2F1"/><g transform="translate(32, 32) scale(2.66)"><path d="M3 12s4-8 9-8s9 8 9 8s-4 8-9 8s-9-8-9-8z" fill="none" stroke="#004D40" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="12" r="1.5" fill="#004D40"/><path d="M21 12l2 2v-4z" fill="none" stroke="#004D40" stroke-width="1.8"/></g></svg>',
  },
  {
    name: '查干臻品',
    parentName: '特产礼盒',
    sortOrder: 2,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#FFF3E0"/><g transform="translate(32, 32) scale(2.66)"><path d="M3 12c4-5 9-6 13-3s3 9-1 11s-9 0-12-8z" fill="none" stroke="#E65100" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9c3 0 4-2 3-3" fill="none" stroke="#E65100" stroke-width="1.8"/><path d="M16 12l4 4v-8z" fill="none" stroke="#E65100" stroke-width="1.8"/></g></svg>',
  },
];

@Injectable()
export class CategorySeedService {
  private readonly logger = new Logger(CategorySeedService.name);
  private seedPromise: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorageService: ObjectStorageService,
  ) {}

  async ensureSeed(): Promise<void> {
    if (!this.seedPromise) {
      this.seedPromise = this.seedCategories();
    }

    try {
      await this.seedPromise;
    } catch (error) {
      this.seedPromise = null;
      throw error;
    }
  }

  private async seedCategories(): Promise<void> {
    const categoryCount = await this.prisma.category.count();
    if (categoryCount > 0) {
      return;
    }

    this.logger.log('Seeding client parent categories...');
    const parentMap = new Map<string, { id: bigint; name: string }>();

    for (const pCat of PARENT_CATEGORIES) {
      const iconUrl = await this.uploadCategoryIcon(pCat.name, pCat.svg);
      let cat = await this.prisma.category.findFirst({
        where: { name: pCat.name, parentId: null },
      });
      if (!cat) {
        cat = await this.prisma.category.create({
          data: { name: pCat.name, sortOrder: pCat.sortOrder, iconUrl, status: 1 },
        });
      } else {
        cat = await this.prisma.category.update({
          where: { id: cat.id },
          data: { iconUrl },
        });
      }
      parentMap.set(pCat.name, cat);
    }

    this.logger.log('Seeding client subcategories...');
    for (const sCat of SUB_CATEGORIES) {
      const parent = parentMap.get(sCat.parentName);
      if (!parent) {
        continue;
      }
      const iconUrl = await this.uploadCategoryIcon(sCat.name, sCat.svg);
      const existing = await this.prisma.category.findFirst({
        where: { name: sCat.name, parentId: parent.id },
      });
      if (!existing) {
        await this.prisma.category.create({
          data: {
            name: sCat.name,
            parentId: parent.id,
            sortOrder: sCat.sortOrder,
            iconUrl,
            status: 1,
          },
        });
      } else {
        await this.prisma.category.update({
          where: { id: existing.id },
          data: { iconUrl },
        });
      }
    }
  }

  private async uploadCategoryIcon(name: string, svgContent: string): Promise<string> {
    try {
      const uploadResult = await this.objectStorageService.uploadPublicObject({
        buffer: Buffer.from(svgContent, 'utf8'),
        fileName: `category-${name.replace(/\//g, '_')}.svg`,
        mimeType: 'image/svg+xml',
        folder: 'categories',
      });
      return uploadResult.url;
    } catch (e: any) {
      this.logger.error(`Failed to upload category icon ${name}: ${e.message}`);
      return '';
    }
  }
}
