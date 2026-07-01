export type ProductVisibilityLike = {
  deletedAt?: Date | null;
  status?: number | null;
  auditStatus?: number | null;
};

export function isPublicProductVisible(product: ProductVisibilityLike): boolean {
  return !product.deletedAt && product.status === 1 && product.auditStatus === 2;
}
