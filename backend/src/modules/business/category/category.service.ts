import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CategorySeedService } from '../../../common/services/category-seed.service';
import { ObjectStorageService } from '../../../common/storage/object-storage.service';

export type CategoryChildView = {
  id: number;
  name: string;
  iconUrl: string;
  sortOrder: number;
};

export type CategoryView = {
  id: number;
  name: string;
  iconUrl: string;
  sortOrder: number;
  children: CategoryChildView[];
};

export type ListCategoriesQuery = {
  parentId?: string;
  level?: string;
  status?: string;
  page?: string;
  pageSize?: string;
};

export type PagedCategoriesResult = {
  page: number;
  pageSize: number;
  total: number;
  items: CategoryView[] | CategoryChildView[];
};

export type CategoryTagView = {
  id: number;
  name: string;
  iconUrl: string;
};

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categorySeedService: CategorySeedService,
    private readonly objectStorageService: ObjectStorageService,
  ) {}

  async getCatalogCategories(): Promise<CategoryView[]> {
    await this.categorySeedService.ensureSeed();

    const categories = await this.prisma.category.findMany({
      where: { status: 1, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const roots = categories.filter((item) => item.parentId == null);
    return roots.map((root) => ({
      id: this.toNumber(root.id),
      name: root.name,
      iconUrl: this.resolvePublicUrl(root.iconUrl) ?? '',
      sortOrder: root.sortOrder,
      children: categories
        .filter((item) => item.parentId === root.id)
        .map((child) => ({
          id: this.toNumber(child.id),
          name: child.name,
          iconUrl: this.resolvePublicUrl(child.iconUrl) ?? '',
          sortOrder: child.sortOrder,
        })),
    }));
  }

  async listCategoryTags(): Promise<CategoryTagView[]> {
    await this.categorySeedService.ensureSeed();

    const roots = await this.prisma.category.findMany({
      where: { parentId: null, status: 1, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return roots.map((root) => ({
      id: this.toNumber(root.id),
      name: root.name,
      iconUrl: this.resolvePublicUrl(root.iconUrl) ?? '',
    }));
  }

  async listCategories(query: ListCategoriesQuery = {}): Promise<PagedCategoriesResult> {
    await this.categorySeedService.ensureSeed();

    const level = String(query.level ?? '2');
    const status = query.status != null ? Number(query.status) : 1;
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const parentIdParam = query.parentId != null ? Number(query.parentId) : undefined;

    const baseWhere = {
      status,
      deletedAt: null,
      ...(parentIdParam != null && parentIdParam > 0
        ? { parentId: BigInt(parentIdParam) }
        : parentIdParam === 0
          ? { parentId: null }
          : {}),
    };

    const total = await this.prisma.category.count({ where: baseWhere });

    if (level === '1') {
      const roots = await this.prisma.category.findMany({
        where: { ...baseWhere, parentId: null },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      return {
        page,
        pageSize,
        total,
        items: roots.map((root) => this.mapRoot(root)),
      };
    }

    if (level === '2' || level === 'tree') {
      const allCategories = await this.prisma.category.findMany({
        where: { status, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });

      const roots = allCategories
        .filter((item) => item.parentId == null)
        .slice((page - 1) * pageSize, page * pageSize)
        .map((root) => ({
          ...this.mapRoot(root),
          children: allCategories
            .filter((item) => item.parentId === root.id)
            .map((child) => this.mapChild(child)),
        }));

      return {
        page,
        pageSize,
        total,
        items: roots,
      };
    }

    // level === 'all' or any other value: flat list under parentId
    const items = await this.prisma.category.findMany({
      where: baseWhere,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      page,
      pageSize,
      total,
      items: items.map((item) =>
        item.parentId == null ? this.mapRoot(item) : this.mapChild(item),
      ),
    };
  }

  private mapRoot(item: { id: bigint; name: string; iconUrl: string | null; sortOrder: number }): CategoryView {
    return {
      id: this.toNumber(item.id),
      name: item.name,
      iconUrl: this.resolvePublicUrl(item.iconUrl) ?? '',
      sortOrder: item.sortOrder,
      children: [],
    };
  }

  private mapChild(item: { id: bigint; name: string; iconUrl: string | null; sortOrder: number }): CategoryChildView {
    return {
      id: this.toNumber(item.id),
      name: item.name,
      iconUrl: this.resolvePublicUrl(item.iconUrl) ?? '',
      sortOrder: item.sortOrder,
    };
  }

  private resolvePublicUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const baseUrl = this.objectStorageService.getPublicBaseUrl().replace(/\/+$/, '');
    if (url.startsWith('/')) {
      return `${baseUrl}${url}`;
    }
    const localMatches = [
      'http://127.0.0.1:6004',
      'http://localhost:6004',
      'https://127.0.0.1:6004',
      'https://localhost:6004',
    ];
    for (const match of localMatches) {
      if (url.startsWith(match)) {
        return url.replace(match, baseUrl);
      }
    }
    return url;
  }

  private toNumber(value: bigint | number | null | undefined): number {
    return Number(value ?? 0);
  }

  private normalizePage(value: string | number | null | undefined): number {
    const page = Number(value ?? 1);
    if (!Number.isFinite(page) || page < 1) {
      return 1;
    }
    return Math.floor(page);
  }

  private normalizePageSize(value: string | number | null | undefined, defaultPageSize = 20): number {
    const pageSize = Number(value ?? defaultPageSize);
    if (!Number.isFinite(pageSize)) {
      return defaultPageSize;
    }
    return Math.min(100, Math.max(1, Math.floor(pageSize)));
  }
}
