import { Injectable } from '@nestjs/common';

import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';
import { ExchangePointsDto } from './dto/marketing.dto';

@Injectable()
export class MarketingService {
  constructor(private readonly platformDataService: PlatformDataService) {}

  listActivities(query: Record<string, string>) {
    return this.platformDataService.getPublicActivities(query);
  }

  getActivityDetail(activityId: number) {
    return this.platformDataService.getPublicActivityDetail(activityId);
  }

  getActivityProducts(activityId: number, query: Record<string, string>) {
    return this.platformDataService.getPublicActivityProducts(activityId, query);
  }

  listCoupons(user: AuthUser | undefined) {
    return this.platformDataService.getCoupons(user);
  }

  recommendedCoupons(user: AuthUser | undefined, scene: string, cartAmount: number, merchantId?: number, limit = 6) {
    return this.platformDataService.getRecommendedCoupons(user, scene, cartAmount, merchantId, limit);
  }

  availableCoupons(user: AuthUser, cartAmount: number, merchantId?: number) {
    return this.platformDataService.getAvailableCoupons(user, cartAmount, merchantId);
  }

  myCoupons(user: AuthUser, status?: string) {
    return this.platformDataService.getUserCoupons(user, status);
  }

  receiveCoupon(user: AuthUser, couponId: number) {
    return this.platformDataService.receiveCoupon(user, couponId);
  }

  getPointsLogs(user: AuthUser) {
    return this.platformDataService.getPointsLogs(user);
  }

  getPointsExchangeItems(user: AuthUser | undefined) {
    return this.platformDataService.getPointExchangeItems(user);
  }

  exchangePoints(user: AuthUser, body: ExchangePointsDto) {
    return this.platformDataService.exchangePointsCoupon(user, Number(body.couponId));
  }

  assetsSummary(user: AuthUser) {
    return this.platformDataService.getAssetsSummary(user);
  }

  applyLeader(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.applyLeader(user, body);
  }

  bindLeader(user: AuthUser, leaderId: number) {
    return this.platformDataService.bindLeader(user, leaderId);
  }

  getCommissions(user: AuthUser) {
    return this.platformDataService.getLeaderCommissions(user);
  }
}
