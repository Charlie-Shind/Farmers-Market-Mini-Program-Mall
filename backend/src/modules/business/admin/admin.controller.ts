import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser, Public, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { LeaderService } from '../../../common/services/leader.service';
import { ChatService } from '../chat/chat.service';

@Roles(RoleCode.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly leaderService: LeaderService,
    private readonly chatService: ChatService,
  ) {}

  @Public()
  @Get('auth/captcha')
  getLoginCaptcha() {
    return this.platformDataService.createAdminLoginCaptcha();
  }

  @Public()
  @Post('auth/login')
  login(@Body() body: Record<string, unknown>, @Req() req: Request) {
    const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim();
    const clientIp = forwarded || req.ip || req.socket.remoteAddress || 'unknown';
    return this.platformDataService.adminLogin(body, clientIp);
  }

  @Post('merchants/:merchantId/audit')
  auditMerchant(
    @CurrentUser() user: AuthUser,
    @Param('merchantId') merchantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.auditMerchant(Number(merchantId), body, user);
  }

  @Post('merchants/:merchantId/enable')
  enableMerchant(@CurrentUser() user: AuthUser, @Param('merchantId') merchantId: string) {
    return this.platformDataService.enableMerchant(Number(merchantId), user);
  }

  @Post('merchants/:merchantId/disable')
  disableMerchant(@CurrentUser() user: AuthUser, @Param('merchantId') merchantId: string) {
    return this.platformDataService.disableMerchant(Number(merchantId), user);
  }

  @Put('merchants/:merchantId/commission-rule')
  updateMerchantCommission(
    @CurrentUser() user: AuthUser,
    @Param('merchantId') merchantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateMerchantCommissionRule(Number(merchantId), body, user);
  }

  @Post('products/:productId/audit')
  auditProduct(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.auditProduct(Number(productId), body, user);
  }

  @Get('users')
  listUsers(@Query() query: Record<string, string>) {
    return this.platformDataService.listAdminUsers(query);
  }

  @Get('users/:userId/summary')
  getUserSummary(@Param('userId') userId: string) {
    return this.platformDataService.getUserSummary(Number(userId));
  }

  @Put('users/:userId')
  updateUserProfile(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminUserProfile(Number(userId), body, user);
  }

  @Delete('users/:userId')
  deleteUser(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
  ) {
    return this.platformDataService.deleteAdminUser(Number(userId), user);
  }

  @Patch('users/:userId/status')
  updateUserStatus(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminUserStatus(Number(userId), body, user);
  }

  @Post('points/adjust')
  adjustUserPoints(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.adjustAdminUserPoints(body, user);
  }

  @Get('admin-accounts')
  listAdminAccounts(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listAdminAccounts(query, user);
  }

  @Post('admin-accounts')
  createAdminAccount(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createAdminAccount(body, user);
  }

  @Post('admin-accounts/sync-merchants')
  syncMerchantsAdminAccounts(@CurrentUser() user: AuthUser) {
    return this.platformDataService.syncMerchantsAdminAccounts(user);
  }

  @Put('admin-accounts/:adminUserId')
  updateAdminAccount(
    @CurrentUser() user: AuthUser,
    @Param('adminUserId') adminUserId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminAccount(Number(adminUserId), body, user);
  }

  @Patch('admin-accounts/:adminUserId/status')
  updateAdminAccountStatus(
    @CurrentUser() user: AuthUser,
    @Param('adminUserId') adminUserId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminAccount(Number(adminUserId), body, user);
  }

  @Post('admin-accounts/:adminUserId/reset-password')
  resetAdminPassword(
    @CurrentUser() user: AuthUser,
    @Param('adminUserId') adminUserId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.resetAdminPassword(Number(adminUserId), body, user);
  }

  @Delete('admin-accounts/:adminUserId')
  deleteAdminAccount(
    @CurrentUser() user: AuthUser,
    @Param('adminUserId') adminUserId: string,
  ) {
    return this.platformDataService.deleteAdminAccount(Number(adminUserId), user);
  }

  @Get('admin-roles')
  listAdminRoles(@Query() query: Record<string, string>) {
    return this.platformDataService.listAdminRoles(query);
  }

  @Post('admin-roles')
  createAdminRole(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createAdminRole(body, user);
  }

  @Put('admin-roles/:roleId')
  updateAdminRole(
    @CurrentUser() user: AuthUser,
    @Param('roleId') roleId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminRole(Number(roleId), body, user);
  }

  @Delete('admin-roles/:roleId')
  deleteAdminRole(
    @CurrentUser() user: AuthUser,
    @Param('roleId') roleId: string,
  ) {
    return this.platformDataService.deleteAdminRole(Number(roleId), user);
  }

  @Get('merchants')
  listMerchants(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listAdminMerchants(query, user);
  }

  @Get('merchants/:merchantId/summary')
  getMerchantSummary(@Param('merchantId') merchantId: string) {
    return this.platformDataService.getMerchantSummary(Number(merchantId));
  }

  @Get('merchants/:merchantId')
  getAdminMerchantDetail(@Param('merchantId') merchantId: string) {
    return this.platformDataService.getAdminMerchantDetail(Number(merchantId));
  }

  @Put('merchants/:merchantId')
  updateAdminMerchant(
    @CurrentUser() user: AuthUser,
    @Param('merchantId') merchantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminMerchant(Number(merchantId), body, user);
  }

  @Post('merchants/:merchantId/profile-audit')
  auditMerchantProfile(
    @CurrentUser() user: AuthUser,
    @Param('merchantId') merchantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.auditMerchantProfile(Number(merchantId), body, user);
  }

  @Delete('merchants/:merchantId')
  deleteAdminMerchant(
    @CurrentUser() user: AuthUser,
    @Param('merchantId') merchantId: string,
  ) {
    return this.platformDataService.deleteAdminMerchant(Number(merchantId), user);
  }

  @Get('products')
  listProducts(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listAdminProducts(query, user);
  }

  @Post('products')
  createProduct(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createAdminProduct(body, user);
  }

  @Get('products/:productId')
  getProductDetail(@Param('productId') productId: string) {
    return this.platformDataService.getAdminProductDetail(Number(productId));
  }

  @Put('products/:productId')
  updateProduct(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminProduct(Number(productId), body, user);
  }

  @Delete('products/:productId')
  deleteProduct(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.platformDataService.deleteAdminProduct(Number(productId), user);
  }

  @Post('products/:productId/takedown')
  takedownProduct(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.takedownAdminProduct(Number(productId), user, body);
  }

  @Post('products/:productId/restore')
  restoreProduct(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.platformDataService.restoreAdminProduct(Number(productId), user);
  }

  @Get('activities')
  listActivities() {
    return this.platformDataService.getActivities();
  }

  @Get('activities/:activityId')
  getActivity(@Param('activityId') activityId: string) {
    return this.platformDataService.getAdminActivityDetail(Number(activityId));
  }

  @Put('activities/:activityId')
  updateActivity(
    @CurrentUser() user: AuthUser,
    @Param('activityId') activityId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateActivity(Number(activityId), body, user);
  }

  @Delete('activities/:activityId')
  deleteActivityAdmin(@CurrentUser() user: AuthUser, @Param('activityId') activityId: string) {
    return this.platformDataService.deleteActivity(Number(activityId), user);
  }

  @Post('activities/:activityId/publish')
  publishActivity(@CurrentUser() user: AuthUser, @Param('activityId') activityId: string) {
    return this.platformDataService.publishAdminActivity(user, Number(activityId));
  }

  @Post('activities/:activityId/pause')
  pauseActivity(@CurrentUser() user: AuthUser, @Param('activityId') activityId: string) {
    return this.platformDataService.pauseAdminActivity(user, Number(activityId));
  }

  @Post('activities/:activityId/finish')
  finishActivity(@CurrentUser() user: AuthUser, @Param('activityId') activityId: string) {
    return this.platformDataService.finishAdminActivity(user, Number(activityId));
  }

  @Get('coupons')
  listCoupons(@Query() query: Record<string, string>) {
    return this.platformDataService.listAdminCoupons(query);
  }

  @Get('exchange-items')
  listExchangeItems(@Query() query: Record<string, string>) {
    return this.platformDataService.listAdminExchangeItems(query);
  }

  @Post('coupons')
  createCoupon(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createAdminCoupon(body, user);
  }

  @Post('exchange-items')
  createExchangeItem(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createAdminExchangeItem(body, user);
  }

  @Get('coupons/:couponId')
  getCoupon(@Param('couponId') couponId: string) {
    return this.platformDataService.getAdminCouponDetail(Number(couponId));
  }

  @Get('exchange-items/:couponId')
  getExchangeItem(@Param('couponId') couponId: string) {
    return this.platformDataService.getAdminExchangeItemDetail(Number(couponId));
  }

  @Put('coupons/:couponId')
  updateCoupon(
    @CurrentUser() user: AuthUser,
    @Param('couponId') couponId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminCoupon(Number(couponId), body, user);
  }

  @Put('exchange-items/:couponId')
  updateExchangeItem(
    @CurrentUser() user: AuthUser,
    @Param('couponId') couponId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminExchangeItem(Number(couponId), body, user);
  }

  @Patch('coupons/:couponId/status')
  updateCouponStatus(
    @CurrentUser() user: AuthUser,
    @Param('couponId') couponId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminCouponStatus(Number(couponId), body, user);
  }

  @Patch('exchange-items/:couponId/status')
  updateExchangeItemStatus(
    @CurrentUser() user: AuthUser,
    @Param('couponId') couponId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminExchangeItemStatus(Number(couponId), body, user);
  }

  @Post('coupons/:couponId/issue')
  issueCoupon(
    @CurrentUser() user: AuthUser,
    @Param('couponId') couponId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.issueAdminCoupon(Number(couponId), body, user);
  }

  @Post('exchange-items/:couponId/issue')
  issueExchangeItem(
    @CurrentUser() user: AuthUser,
    @Param('couponId') couponId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.issueAdminCoupon(Number(couponId), body, user);
  }

  @Delete('coupons/:couponId')
  deleteCoupon(
    @CurrentUser() user: AuthUser,
    @Param('couponId') couponId: string,
  ) {
    return this.platformDataService.deleteAdminCoupon(Number(couponId), user);
  }

  @Delete('exchange-items/:couponId')
  deleteExchangeItem(
    @CurrentUser() user: AuthUser,
    @Param('couponId') couponId: string,
  ) {
    return this.platformDataService.deleteAdminExchangeItem(Number(couponId), user);
  }

  @Get('categories')
  listCategories() {
    return this.platformDataService.listAdminCategories();
  }

  @Post('categories')
  createCategory(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createAdminCategory(body, user);
  }

  @Put('categories/:categoryId')
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('categoryId') categoryId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateAdminCategory(Number(categoryId), body, user);
  }

  @Delete('categories/:categoryId')
  deleteCategory(@CurrentUser() user: AuthUser, @Param('categoryId') categoryId: string) {
    return this.platformDataService.deleteAdminCategory(Number(categoryId), user);
  }

  @Get('banners')
  listBanners() {
    return this.platformDataService.getBanners();
  }

  @Post('banners')
  createBanner(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createBanner(body, user);
  }

  @Patch('banners/:bannerId/status')
  updateBannerStatus(
    @CurrentUser() user: AuthUser,
    @Param('bannerId') bannerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateBannerStatus(Number(bannerId), body, user);
  }

  @Put('banners/reorder')
  reorderBanners(
    @CurrentUser() user: AuthUser,
    @Body() body: { bannerIds: number[] },
  ) {
    return this.platformDataService.reorderBanners(body.bannerIds, user);
  }

  @Put('banners/:bannerId')
  updateBanner(
    @CurrentUser() user: AuthUser,
    @Param('bannerId') bannerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateBanner(Number(bannerId), body, user);
  }

  @Delete('banners/:bannerId')
  deleteBanner(
    @CurrentUser() user: AuthUser,
    @Param('bannerId') bannerId: string,
  ) {
    return this.platformDataService.deleteBanner(Number(bannerId), user);
  }

  @Post('activities')
  createActivity(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createActivity(body, user);
  }

  @Get('orders')
  listOrders(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listAdminOrders(query, user);
  }

  @Get('group-buys')
  listGroupBuys(@Query() query: Record<string, string>) {
    return this.platformDataService.listAdminGroupBuys(query);
  }

  @Get('orders/:orderNo')
  getOrder(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string) {
    return this.platformDataService.getAdminOrderDetail(orderNo, user);
  }

  @Post('orders/:orderNo/ship')
  shipOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderNo') orderNo: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.shipAdminOrder(orderNo, body, user);
  }

  @Get('refunds')
  listRefunds(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listAdminRefunds(query, user);
  }

  @Get('logistics')
  listLogisticsRules() {
    return this.platformDataService.getLogisticsRules();
  }

  @Get('logistics/companies')
  listLogisticsCompanies() {
    return this.platformDataService.getLogisticsCompanies();
  }

  @Post('logistics/templates')
  createLogisticsTemplate(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createLogisticsRule(body, user);
  }

  @Put('logistics/templates/:templateId')
  updateLogisticsTemplate(
    @CurrentUser() user: AuthUser,
    @Param('templateId') templateId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateLogisticsRule(Number(templateId), body, user);
  }

  @Delete('logistics/templates/:templateId')
  deleteLogisticsTemplate(@CurrentUser() user: AuthUser, @Param('templateId') templateId: string) {
    return this.platformDataService.deleteLogisticsRule(Number(templateId), user);
  }

  @Get('refunds/:refundNo')
  getRefundDetail(@Param('refundNo') refundNo: string) {
    return this.platformDataService.getAdminRefundDetail(refundNo);
  }

  @Get('withdraws')
  listWithdraws(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listAdminWithdraws(query, user);
  }

  @Get('settings')
  getSettings() {
    return this.platformDataService.getSystemSettings();
  }

  @Get('chat/support-target')
  getChatSupportTarget() {
    return this.platformDataService.getChatSupportTarget();
  }

  @Get('chat/conversations')
  listChatConversations(@Query() query: Record<string, string>) {
    return this.chatService.listAdminConversations(query);
  }

  @Get('chat/conversations/:conversationId')
  getChatConversation(@Param('conversationId') conversationId: string) {
    return this.chatService.getAdminConversation(Number(conversationId));
  }

  @Get('chat/conversations/:conversationId/messages')
  listChatMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: Record<string, string>,
  ) {
    return this.chatService.listAdminMessages(Number(conversationId), Number(query.page ?? 1), Number(query.pageSize ?? 20));
  }

  @Post('chat/conversations/:conversationId/messages')
  sendChatMessage(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.chatService.sendAdminMessage(user, {
      conversationId: Number(conversationId),
      content: typeof body.content === 'string' ? body.content : '',
      contentType: typeof body.contentType === 'string' ? (body.contentType as 'TEXT' | 'IMAGE') : 'TEXT',
      attachments: body.attachments as any,
    });
  }

  @Post('settings')
  saveSettings(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.updateSystemSettings(body, user);
  }

  @Get('logs')
  listLogs(@Query() query: Record<string, string>) {
    return this.platformDataService.getOperationLogs(query);
  }

  @Post('refunds/:refundNo/arbitrate')
  arbitrateRefund(
    @CurrentUser() user: AuthUser,
    @Param('refundNo') refundNo: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.arbitrateRefund(refundNo, body, user);
  }

  @Post('withdraws/:applyNo/audit')
  auditWithdraw(
    @CurrentUser() user: AuthUser,
    @Param('applyNo') applyNo: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.auditWithdraw(user, applyNo, body);
  }

  @Get('dashboard/overview')
  getDashboardOverview(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    const periodDays = query.periodDays ? Number(query.periodDays) : undefined;
    return this.platformDataService.getDashboardOverview(periodDays, user);
  }

  @Get('dashboard/sales')
  getDashboardSales(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    const periodDays = query.periodDays ? Number(query.periodDays) : undefined;
    return this.platformDataService.getDashboardSales(periodDays, user);
  }

  @Get('dashboard/hot-products')
  getHotProducts(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getHotProducts(user);
  }

  @Get('dashboard/origin-sales')
  getOriginSales(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getOriginSales(user);
  }

  @Get('leaders')
  listLeaders(@Query() query: Record<string, string>) {
    return this.leaderService.listAdminLeaders(query);
  }

  @Get('leaders/:leaderId')
  getLeader(@Param('leaderId') leaderId: string) {
    return this.leaderService.getAdminLeader(Number(leaderId));
  }

  @Post('leaders/:leaderId/audit')
  auditLeader(
    @CurrentUser() user: AuthUser,
    @Param('leaderId') leaderId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.leaderService.auditAdminLeader(Number(leaderId), body, user);
  }

  @Put('leaders/:leaderId')
  updateLeader(@Param('leaderId') leaderId: string, @Body() body: Record<string, unknown>) {
    return this.leaderService.updateAdminLeader(Number(leaderId), body);
  }

  @Delete('leaders/:leaderId')
  deleteLeader(@Param('leaderId') leaderId: string) {
    return this.leaderService.deleteAdminLeader(Number(leaderId));
  }

  @Get('pickup-points')
  listPickupPoints(@Query() query: Record<string, string>) {
    return this.leaderService.listAdminPickupPoints(query);
  }

  @Post('pickup-points')
  createPickupPoint(@Body() body: Record<string, unknown>) {
    return this.leaderService.createAdminPickupPoint(body);
  }

  @Put('pickup-points/:pickupPointId')
  updatePickupPoint(
    @Param('pickupPointId') pickupPointId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.leaderService.updateAdminPickupPoint(Number(pickupPointId), body);
  }

  @Patch('pickup-points/:pickupPointId/status')
  updatePickupPointStatus(
    @Param('pickupPointId') pickupPointId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.leaderService.updateAdminPickupPointStatus(Number(pickupPointId), body);
  }

  @Delete('pickup-points/:pickupPointId')
  deletePickupPoint(@Param('pickupPointId') pickupPointId: string) {
    return this.leaderService.deleteAdminPickupPoint(Number(pickupPointId));
  }

  @Get('leader-commissions')
  listLeaderCommissions(@Query() query: Record<string, string>) {
    return this.leaderService.listAdminCommissions(query);
  }

  @Post('leader-commissions/:commissionId/settle')
  settleLeaderCommission(@Param('commissionId') commissionId: string) {
    return this.leaderService.settleAdminCommission(Number(commissionId));
  }

  @Post('leader-commissions/batch-settle')
  batchSettleLeaderCommissions(@Body() body: Record<string, unknown>) {
    const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)).filter((id) => id > 0) : [];
    return this.leaderService.batchSettleAdminCommissions(ids);
  }
}
