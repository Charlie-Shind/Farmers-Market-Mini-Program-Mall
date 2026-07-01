import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';

import { CurrentUser, Roles } from '../../../common/decorators';
import { RoleCode } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Roles(RoleCode.MERCHANT)
@Controller('merchant')
export class MerchantController {
  constructor(private readonly platformDataService: PlatformDataService) {}

  @Roles(RoleCode.USER)
  @Post('apply')
  apply(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.applyMerchant(user, body);
  }

  @Post('products')
  createProduct(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createMerchantProduct(user, body);
  }

  @Get('products')
  listProducts(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listMerchantProducts(user, query);
  }

  @Get('products/:productId')
  getProductDetail(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.platformDataService.getMerchantProductDetail(user, Number(productId));
  }

  @Put('products/:productId')
  updateProduct(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateMerchantProduct(user, Number(productId), body);
  }

  @Get('activities')
  listActivities(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listMerchantActivities(user, query);
  }

  @Post('activities')
  createActivity(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createActivity(body, user);
  }

  @Patch('activities/:activityId')
  updateActivity(
    @CurrentUser() user: AuthUser,
    @Param('activityId') activityId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateActivity(Number(activityId), body, user);
  }

  @Delete('activities/:activityId')
  deleteActivity(@CurrentUser() user: AuthUser, @Param('activityId') activityId: string) {
    return this.platformDataService.deleteActivity(Number(activityId), user);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getMerchantProfile(user);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getMerchantDashboard(user);
  }

  @Patch('products/:productId/status')
  updateProductStatus(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateProductStatus(Number(productId), body, user);
  }

  @Patch('skus/:skuId/stock')
  updateStock(@CurrentUser() user: AuthUser, @Param('skuId') skuId: string, @Body() body: Record<string, unknown>) {
    return this.platformDataService.updateSkuStock(Number(skuId), body, user);
  }

  @Get('orders')
  listOrders(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listMerchantOrders(user, query);
  }

  @Get('orders/:orderNo')
  getOrder(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string) {
    return this.platformDataService.getMerchantOrderDetail(user, orderNo);
  }

  @Post('orders/:orderNo/accept')
  acceptOrder(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string) {
    return this.platformDataService.acceptOrder(user, orderNo);
  }

  @Post('orders/:orderNo/ship')
  shipOrder(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string, @Body() body: Record<string, unknown>) {
    return this.platformDataService.shipOrder(user, orderNo, body);
  }

  @Get('refunds')
  listRefunds(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listMerchantRefunds(user, query);
  }

  @Get('refunds/:refundNo')
  getRefund(@CurrentUser() user: AuthUser, @Param('refundNo') refundNo: string) {
    return this.platformDataService.getMerchantRefundDetail(user, refundNo);
  }

  @Post('refunds/:refundNo/process')
  processRefund(@CurrentUser() user: AuthUser, @Param('refundNo') refundNo: string, @Body() body: Record<string, unknown>) {
    return this.platformDataService.processRefund(user, refundNo, body);
  }

  @Get('wallet')
  getWallet(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getWallet(user);
  }

  @Get('finance/records')
  getFinanceRecords(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getMerchantFinanceRecords(user);
  }

  @Post('withdraws')
  createWithdraw(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createWithdraw(user, body);
  }

  @Get('withdraws')
  listWithdraws(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listMerchantWithdraws(user, query);
  }

  // ----- 评价 -----

  @Get('reviews')
  listReviews(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listMerchantReviews(user, query);
  }

  @Get('reviews/summary')
  reviewSummary(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getMerchantReviewSummary(user);
  }

  @Post('reviews/:reviewId/reply')
  replyReview(@CurrentUser() user: AuthUser, @Param('reviewId') reviewId: string, @Body() body: Record<string, unknown>) {
    return this.platformDataService.replyMerchantReview(user, Number(reviewId), body);
  }

  // ----- 工作台/统计 -----

  @Get('workbench')
  workbench(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getMerchantWorkbench(user);
  }

  @Get('statistics/overview')
  statisticsOverview(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.getMerchantStatisticsOverview(user, query);
  }

  @Get('statistics/trend')
  statisticsTrend(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.getMerchantStatisticsTrend(user, query);
  }

  // ----- 商品草稿（MerchantProductDraft）-----

  @Post('products/drafts')
  syncDraft(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.syncMerchantProductDraft(user, body);
  }

  @Get('products/drafts')
  listDrafts(@CurrentUser() user: AuthUser) {
    return this.platformDataService.listMerchantProductDrafts(user);
  }

  @Get('products/drafts/:draftRef')
  getDraft(@CurrentUser() user: AuthUser, @Param('draftRef') draftRef: string) {
    return this.platformDataService.fetchMerchantProductDraft(user, draftRef);
  }

  @Post('products/drafts/:draftRef')
  updateDraft(
    @CurrentUser() user: AuthUser,
    @Param('draftRef') draftRef: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.syncMerchantProductDraft(user, body);
  }

  @Post('products/drafts/:draftRef/delete')
  deleteDraft(@CurrentUser() user: AuthUser, @Param('draftRef') draftRef: string) {
    return this.platformDataService.deleteMerchantProductDraft(user, draftRef);
  }

  // ----- 配送设置 -----

  @Get('delivery/settings')
  getDeliverySettings(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getMerchantDeliverySettings(user);
  }

  @Post('delivery/settings')
  saveDeliverySettings(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.saveMerchantDeliverySettings(user, body);
  }

  @Get('delivery/templates')
  getDeliveryTemplates(@CurrentUser() user: AuthUser) {
    return this.platformDataService.listMerchantFreightTemplates(user);
  }

  @Post('delivery/templates')
  createDeliveryTemplate(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createMerchantFreightTemplate(user, body);
  }

  @Put('delivery/templates/:templateId')
  updateDeliveryTemplate(
    @CurrentUser() user: AuthUser,
    @Param('templateId') templateId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateMerchantFreightTemplate(user, Number(templateId), body);
  }

  @Delete('delivery/templates/:templateId')
  deleteDeliveryTemplate(@CurrentUser() user: AuthUser, @Param('templateId') templateId: string) {
    return this.platformDataService.deleteMerchantFreightTemplate(user, Number(templateId));
  }

  // ----- 通知中心 -----

  @Get('notices')
  listNotices(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listMerchantNotices(user, query);
  }

  @Get('notices/:noticeId')
  getNotice(@CurrentUser() user: AuthUser, @Param('noticeId') noticeId: string) {
    return this.platformDataService.getMerchantNoticeDetail(user, Number(noticeId));
  }

  @Post('notices/:noticeId/read')
  markNoticeRead(@CurrentUser() user: AuthUser, @Param('noticeId') noticeId: string) {
    return this.platformDataService.markMerchantNoticeRead(user, Number(noticeId));
  }

  @Post('notices/read-all')
  markAllNoticesRead(@CurrentUser() user: AuthUser) {
    return this.platformDataService.markAllMerchantNoticesRead(user);
  }

  // ----- 安全设置 -----

  @Get('security')
  getSecurity(@CurrentUser() user: AuthUser) {
    return this.platformDataService.getMerchantSecurity(user);
  }

  @Post('security')
  updateSecurity(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.updateMerchantSecurity(user, body);
  }

  // ----- 资质管理 -----

  @Get('qualifications')
  listQualifications(@CurrentUser() user: AuthUser) {
    return this.platformDataService.listMerchantQualifications(user);
  }

  @Post('qualifications')
  createQualification(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createMerchantQualification(user, body);
  }

  @Put('qualifications/:qualificationId')
  updateQualification(
    @CurrentUser() user: AuthUser,
    @Param('qualificationId') qualificationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.updateMerchantQualification(user, Number(qualificationId), body);
  }

  @Delete('qualifications/:qualificationId')
  deleteQualification(@CurrentUser() user: AuthUser, @Param('qualificationId') qualificationId: string) {
    return this.platformDataService.deleteMerchantQualification(user, Number(qualificationId));
  }

  // ----- SKU 管理 -----

  @Get('products/:productId/skus')
  listProductSkus(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.platformDataService.listMerchantProductSkus(user, Number(productId));
  }

  @Post('products/:productId/skus')
  createProductSku(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.createMerchantProductSku(user, Number(productId), body);
  }

  @Put('skus/:skuId')
  updateSku(@CurrentUser() user: AuthUser, @Param('skuId') skuId: string, @Body() body: Record<string, unknown>) {
    return this.platformDataService.updateMerchantSku(user, Number(skuId), body);
  }

  @Post('skus/:skuId/status')
  updateSkuStatus(@CurrentUser() user: AuthUser, @Param('skuId') skuId: string, @Body() body: Record<string, unknown>) {
    return this.platformDataService.updateMerchantSkuStatus(user, Number(skuId), body);
  }

  @Post('skus/:skuId/delete')
  deleteSku(@CurrentUser() user: AuthUser, @Param('skuId') skuId: string) {
    return this.platformDataService.deleteMerchantSku(user, Number(skuId));
  }

  @Post('products/:productId/skus/batch-update')
  batchUpdateSkus(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformDataService.batchUpdateMerchantSkus(user, Number(productId), body);
  }

  // ----- 活动完整操作 -----

  @Get('activities/:activityId/detail')
  getActivityDetail(@CurrentUser() user: AuthUser, @Param('activityId') activityId: string) {
    return this.platformDataService.getMerchantActivityDetail(user, Number(activityId));
  }

  @Post('activities/:activityId/publish')
  publishActivity(@CurrentUser() user: AuthUser, @Param('activityId') activityId: string) {
    return this.platformDataService.publishMerchantActivity(user, Number(activityId));
  }

  @Post('activities/:activityId/pause')
  pauseActivity(@CurrentUser() user: AuthUser, @Param('activityId') activityId: string) {
    return this.platformDataService.pauseMerchantActivity(user, Number(activityId));
  }

  @Post('activities/:activityId/finish')
  finishActivity(@CurrentUser() user: AuthUser, @Param('activityId') activityId: string) {
    return this.platformDataService.finishMerchantActivity(user, Number(activityId));
  }

  @Post('activities/:activityId/copy')
  copyActivity(@CurrentUser() user: AuthUser, @Param('activityId') activityId: string) {
    return this.platformDataService.copyMerchantActivity(user, Number(activityId));
  }

  @Get('activities/:activityId/statistics')
  getActivityStatistics(@CurrentUser() user: AuthUser, @Param('activityId') activityId: string) {
    return this.platformDataService.getMerchantActivityStatistics(user, Number(activityId));
  }

  @Get('activities/product-candidates')
  getActivityProductCandidates(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.getMerchantActivityProductCandidates(user, query);
  }

  @Get('activities/drafts')
  listActivityDrafts(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.platformDataService.listMerchantActivityDrafts(user, query);
  }

  @Post('activities/drafts')
  createActivityDraft(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.platformDataService.createMerchantActivityDraft(user, body);
  }

  @Post('activities/drafts/:draftId/publish')
  publishActivityDraft(@CurrentUser() user: AuthUser, @Param('draftId') draftId: string) {
    return this.platformDataService.publishMerchantActivityDraft(user, draftId);
  }

  @Delete('activities/drafts/:draftId')
  deleteActivityDraft(@CurrentUser() user: AuthUser, @Param('draftId') draftId: string) {
    return this.platformDataService.deleteMerchantActivityDraft(user, Number(draftId));
  }

  // ----- 物流公司 -----

  @Get('logistics/companies')
  listLogisticsCompanies() {
    return this.platformDataService.getLogisticsCompanies();
  }
}
