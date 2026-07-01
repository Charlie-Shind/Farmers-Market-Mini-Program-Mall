import { Injectable } from '@nestjs/common';

import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Injectable()
export class AdminContentService {
  constructor(private readonly platformDataService: PlatformDataService) {}

  listCoupons(query: Record<string, string>) {
    return this.platformDataService.listAdminCoupons(query);
  }

  listExchangeItems(query: Record<string, string>) {
    return this.platformDataService.listAdminExchangeItems(query);
  }

  createCoupon(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.createAdminCoupon(body, user);
  }

  createExchangeItem(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.createAdminExchangeItem(body, user);
  }

  getCoupon(couponId: number) {
    return this.platformDataService.getAdminCouponDetail(couponId);
  }

  getExchangeItem(couponId: number) {
    return this.platformDataService.getAdminExchangeItemDetail(couponId);
  }

  updateCoupon(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateAdminCoupon(couponId, body, user);
  }

  updateExchangeItem(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateAdminExchangeItem(couponId, body, user);
  }

  updateCouponStatus(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateAdminCouponStatus(couponId, body, user);
  }

  updateExchangeItemStatus(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateAdminExchangeItemStatus(couponId, body, user);
  }

  issueCoupon(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.platformDataService.issueAdminCoupon(couponId, body, user);
  }

  issueExchangeItem(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.platformDataService.issueAdminCoupon(couponId, body, user);
  }

  deleteCoupon(user: AuthUser, couponId: number) {
    return this.platformDataService.deleteAdminCoupon(couponId, user);
  }

  deleteExchangeItem(user: AuthUser, couponId: number) {
    return this.platformDataService.deleteAdminExchangeItem(couponId, user);
  }

  listBanners() {
    return this.platformDataService.getBanners();
  }

  createBanner(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.createBanner(body, user);
  }

  updateBannerStatus(user: AuthUser, bannerId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateBannerStatus(bannerId, body, user);
  }

  reorderBanners(user: AuthUser, bannerIds: number[]) {
    return this.platformDataService.reorderBanners(bannerIds, user);
  }

  updateBanner(user: AuthUser, bannerId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateBanner(bannerId, body, user);
  }

  deleteBanner(user: AuthUser, bannerId: number) {
    return this.platformDataService.deleteBanner(bannerId, user);
  }

  listLogisticsRules() {
    return this.platformDataService.getLogisticsRules();
  }

  createLogisticsTemplate(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.createLogisticsRule(body, user);
  }

  updateLogisticsTemplate(user: AuthUser, templateId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateLogisticsRule(templateId, body, user);
  }

  deleteLogisticsTemplate(user: AuthUser, templateId: number) {
    return this.platformDataService.deleteLogisticsRule(templateId, user);
  }

  listWithdraws(query: Record<string, string>) {
    return this.platformDataService.listAdminWithdraws(query);
  }

  getSettings() {
    return this.platformDataService.getSystemSettings();
  }

  saveSettings(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.updateSystemSettings(body, user);
  }

  listLogs(query: Record<string, string>) {
    return this.platformDataService.getOperationLogs(query);
  }

  auditWithdraw(user: AuthUser, applyNo: string, body: Record<string, unknown>) {
    return this.platformDataService.auditWithdraw(user, applyNo, body);
  }

  getDashboardOverview(periodDays?: number) {
    return this.platformDataService.getDashboardOverview(periodDays);
  }

  getDashboardSales(periodDays?: number) {
    return this.platformDataService.getDashboardSales(periodDays);
  }

  getHotProducts() {
    return this.platformDataService.getHotProducts();
  }

  getOriginSales() {
    return this.platformDataService.getOriginSales();
  }
}
