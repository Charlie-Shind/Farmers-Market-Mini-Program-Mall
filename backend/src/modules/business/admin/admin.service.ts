import { Injectable } from '@nestjs/common';

import { AuthUser } from '../../../common/types';
import { ChatService } from '../chat/chat.service';
import { AdminActivityService } from './admin-activity.service';
import { AdminContentService } from './admin-content.service';
import { AdminEntryService } from './admin-entry.service';
import { AdminOrderService } from './admin-order.service';
import { AdminProductService } from './admin-product.service';
import { AdminRefundService } from './admin-refund.service';
import { AdminMerchantService } from './admin-merchant.service';
import { AdminUserService } from './admin-user.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly chatService: ChatService,
    private readonly adminEntryService: AdminEntryService,
    private readonly adminActivityService: AdminActivityService,
    private readonly adminContentService: AdminContentService,
    private readonly adminOrderService: AdminOrderService,
    private readonly adminProductService: AdminProductService,
    private readonly adminRefundService: AdminRefundService,
    private readonly adminMerchantService: AdminMerchantService,
    private readonly adminUserService: AdminUserService,
  ) {}

  login(body: Record<string, unknown>) {
    return this.adminEntryService.login(body);
  }

  auditMerchant(user: AuthUser, merchantId: number, body: Record<string, unknown>) {
    return this.adminMerchantService.auditMerchant(user, merchantId, body);
  }

  enableMerchant(user: AuthUser, merchantId: number) {
    return this.adminMerchantService.enableMerchant(user, merchantId);
  }

  disableMerchant(user: AuthUser, merchantId: number) {
    return this.adminMerchantService.disableMerchant(user, merchantId);
  }

  updateMerchantCommission(user: AuthUser, merchantId: number, body: Record<string, unknown>) {
    return this.adminMerchantService.updateMerchantCommission(user, merchantId, body);
  }

  auditProduct(user: AuthUser, productId: number, body: Record<string, unknown>) {
    return this.adminProductService.auditProduct(user, productId, body);
  }

  listUsers(query: Record<string, string>) {
    return this.adminUserService.listUsers(query);
  }

  getUserSummary(userId: number) {
    return this.adminUserService.getUserSummary(userId);
  }

  updateUserProfile(user: AuthUser, userId: number, body: Record<string, unknown>) {
    return this.adminUserService.updateUserProfile(user, userId, body);
  }

  deleteUser(user: AuthUser, userId: number) {
    return this.adminUserService.deleteUser(user, userId);
  }

  updateUserStatus(user: AuthUser, userId: number, body: Record<string, unknown>) {
    return this.adminUserService.updateUserStatus(user, userId, body);
  }

  adjustUserPoints(user: AuthUser, body: Record<string, unknown>) {
    return this.adminUserService.adjustUserPoints(user, body);
  }

  listAdminAccounts(query: Record<string, string>) {
    return this.adminUserService.listAdminAccounts(query);
  }

  createAdminAccount(user: AuthUser, body: Record<string, unknown>) {
    return this.adminUserService.createAdminAccount(user, body);
  }

  updateAdminAccount(user: AuthUser, adminUserId: number, body: Record<string, unknown>) {
    return this.adminUserService.updateAdminAccount(user, adminUserId, body);
  }

  resetAdminPassword(user: AuthUser, adminUserId: number, body: Record<string, unknown>) {
    return this.adminUserService.resetAdminPassword(user, adminUserId, body);
  }

  deleteAdminAccount(user: AuthUser, adminUserId: number) {
    return this.adminUserService.deleteAdminAccount(user, adminUserId);
  }

  listAdminRoles(query: Record<string, string>) {
    return this.adminUserService.listAdminRoles(query);
  }

  createAdminRole(user: AuthUser, body: Record<string, unknown>) {
    return this.adminUserService.createAdminRole(user, body);
  }

  updateAdminRole(user: AuthUser, roleId: number, body: Record<string, unknown>) {
    return this.adminUserService.updateAdminRole(user, roleId, body);
  }

  deleteAdminRole(user: AuthUser, roleId: number) {
    return this.adminUserService.deleteAdminRole(user, roleId);
  }

  listMerchants(query: Record<string, string>) {
    return this.adminMerchantService.listMerchants(query);
  }

  getMerchantSummary(merchantId: number) {
    return this.adminMerchantService.getMerchantSummary(merchantId);
  }

  getAdminMerchantDetail(merchantId: number) {
    return this.adminMerchantService.getAdminMerchantDetail(merchantId);
  }

  updateAdminMerchant(user: AuthUser, merchantId: number, body: Record<string, unknown>) {
    return this.adminMerchantService.updateAdminMerchant(user, merchantId, body);
  }

  deleteAdminMerchant(user: AuthUser, merchantId: number) {
    return this.adminMerchantService.deleteAdminMerchant(user, merchantId);
  }

  listProducts(query: Record<string, string>) {
    return this.adminProductService.listProducts(query);
  }

  createProduct(user: AuthUser, body: Record<string, unknown>) {
    return this.adminProductService.createProduct(user, body);
  }

  getProductDetail(productId: number) {
    return this.adminProductService.getProductDetail(productId);
  }

  updateProduct(user: AuthUser, productId: number, body: Record<string, unknown>) {
    return this.adminProductService.updateProduct(user, productId, body);
  }

  deleteProduct(user: AuthUser, productId: number) {
    return this.adminProductService.deleteProduct(user, productId);
  }

  takedownProduct(user: AuthUser, productId: number) {
    return this.adminProductService.takedownProduct(user, productId);
  }

  restoreProduct(user: AuthUser, productId: number) {
    return this.adminProductService.restoreProduct(user, productId);
  }

  listActivities() {
    return this.adminActivityService.listActivities();
  }

  getActivity(activityId: number) {
    return this.adminActivityService.getAdminActivityDetail(activityId);
  }

  createActivity(user: AuthUser, body: Record<string, unknown>) {
    return this.adminActivityService.createActivity(body, user);
  }

  updateActivity(user: AuthUser, activityId: number, body: Record<string, unknown>) {
    return this.adminActivityService.updateActivity(activityId, body, user);
  }

  deleteActivity(user: AuthUser, activityId: number) {
    return this.adminActivityService.deleteActivity(activityId, user);
  }

  publishActivity(user: AuthUser, activityId: number) {
    return this.adminActivityService.publishAdminActivity(user, activityId);
  }

  pauseActivity(user: AuthUser, activityId: number) {
    return this.adminActivityService.pauseAdminActivity(user, activityId);
  }

  finishActivity(user: AuthUser, activityId: number) {
    return this.adminActivityService.finishAdminActivity(user, activityId);
  }

  listCoupons(query: Record<string, string>) {
    return this.adminContentService.listCoupons(query);
  }

  listExchangeItems(query: Record<string, string>) {
    return this.adminContentService.listExchangeItems(query);
  }

  createCoupon(user: AuthUser, body: Record<string, unknown>) {
    return this.adminContentService.createCoupon(user, body);
  }

  createExchangeItem(user: AuthUser, body: Record<string, unknown>) {
    return this.adminContentService.createExchangeItem(user, body);
  }

  getCoupon(couponId: number) {
    return this.adminContentService.getCoupon(couponId);
  }

  getExchangeItem(couponId: number) {
    return this.adminContentService.getExchangeItem(couponId);
  }

  updateCoupon(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.adminContentService.updateCoupon(user, couponId, body);
  }

  updateExchangeItem(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.adminContentService.updateExchangeItem(user, couponId, body);
  }

  updateCouponStatus(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.adminContentService.updateCouponStatus(user, couponId, body);
  }

  updateExchangeItemStatus(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.adminContentService.updateExchangeItemStatus(user, couponId, body);
  }

  issueCoupon(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.adminContentService.issueCoupon(user, couponId, body);
  }

  issueExchangeItem(user: AuthUser, couponId: number, body: Record<string, unknown>) {
    return this.adminContentService.issueExchangeItem(user, couponId, body);
  }

  deleteCoupon(user: AuthUser, couponId: number) {
    return this.adminContentService.deleteCoupon(user, couponId);
  }

  deleteExchangeItem(user: AuthUser, couponId: number) {
    return this.adminContentService.deleteExchangeItem(user, couponId);
  }

  listBanners() {
    return this.adminContentService.listBanners();
  }

  createBanner(user: AuthUser, body: Record<string, unknown>) {
    return this.adminContentService.createBanner(user, body);
  }

  updateBannerStatus(user: AuthUser, bannerId: number, body: Record<string, unknown>) {
    return this.adminContentService.updateBannerStatus(user, bannerId, body);
  }

  reorderBanners(user: AuthUser, bannerIds: number[]) {
    return this.adminContentService.reorderBanners(user, bannerIds);
  }

  updateBanner(user: AuthUser, bannerId: number, body: Record<string, unknown>) {
    return this.adminContentService.updateBanner(user, bannerId, body);
  }

  deleteBanner(user: AuthUser, bannerId: number) {
    return this.adminContentService.deleteBanner(user, bannerId);
  }

  listOrders(query: Record<string, string>) {
    return this.adminOrderService.listOrders(query);
  }

  getOrder(orderNo: string) {
    return this.adminOrderService.getOrder(orderNo);
  }

  listRefunds(query: Record<string, string>) {
    return this.adminRefundService.listRefunds(query);
  }

  listLogisticsRules() {
    return this.adminContentService.listLogisticsRules();
  }

  createLogisticsTemplate(user: AuthUser, body: Record<string, unknown>) {
    return this.adminContentService.createLogisticsTemplate(user, body);
  }

  updateLogisticsTemplate(user: AuthUser, templateId: number, body: Record<string, unknown>) {
    return this.adminContentService.updateLogisticsTemplate(user, templateId, body);
  }

  deleteLogisticsTemplate(user: AuthUser, templateId: number) {
    return this.adminContentService.deleteLogisticsTemplate(user, templateId);
  }

  getRefundDetail(refundNo: string) {
    return this.adminRefundService.getAdminRefundDetail(refundNo);
  }

  listWithdraws(query: Record<string, string>) {
    return this.adminContentService.listWithdraws(query);
  }

  getSettings() {
    return this.adminContentService.getSettings();
  }

  getChatSupportTarget() {
    return this.adminEntryService.getChatSupportTarget();
  }

  listChatConversations(query: Record<string, string>) {
    return this.chatService.listAdminConversations(query);
  }

  getChatConversation(conversationId: number) {
    return this.chatService.getAdminConversation(conversationId);
  }

  listChatMessages(conversationId: number, page: number, pageSize: number) {
    return this.chatService.listAdminMessages(conversationId, page, pageSize);
  }

  sendChatMessage(user: AuthUser, conversationId: number, body: Record<string, unknown>) {
    return this.chatService.sendAdminMessage(user, {
      conversationId,
      content: typeof body.content === 'string' ? body.content : '',
      contentType: typeof body.contentType === 'string' ? (body.contentType as 'TEXT' | 'IMAGE') : 'TEXT',
      attachments: body.attachments as any,
    });
  }

  saveSettings(user: AuthUser, body: Record<string, unknown>) {
    return this.adminContentService.saveSettings(user, body);
  }

  listLogs(query: Record<string, string>) {
    return this.adminContentService.listLogs(query);
  }

  arbitrateRefund(user: AuthUser, refundNo: string, body: Record<string, unknown>) {
    return this.adminRefundService.arbitrateRefund(refundNo, body, user);
  }

  auditWithdraw(user: AuthUser, applyNo: string, body: Record<string, unknown>) {
    return this.adminContentService.auditWithdraw(user, applyNo, body);
  }

  getDashboardOverview(periodDays?: number) {
    return this.adminContentService.getDashboardOverview(periodDays);
  }

  getDashboardSales(periodDays?: number) {
    return this.adminContentService.getDashboardSales(periodDays);
  }

  getHotProducts() {
    return this.adminContentService.getHotProducts();
  }

  getOriginSales() {
    return this.adminContentService.getOriginSales();
  }
}
