import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { LeaderCommissionService } from './leader-commission.service';

const SETTLEMENT_SCAN_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_SETTLEMENT_DELAY_DAYS = 7;

@Injectable()
export class LeaderCommissionSettlementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaderCommissionSettlementService.name);
  private timer: NodeJS.Timeout | null = null;
  private scanning = false;

  constructor(private readonly leaderCommissionService: LeaderCommissionService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.scanOnce().catch((err) => {
        this.logger.error('Scheduled leader commission settlement failed', err as Error);
      });
    }, SETTLEMENT_SCAN_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async scanOnce() {
    if (this.scanning) {
      return { settledCount: 0 };
    }
    this.scanning = true;
    try {
      const beforeDate = new Date();
      beforeDate.setDate(beforeDate.getDate() - DEFAULT_SETTLEMENT_DELAY_DAYS);

      const result = await this.leaderCommissionService.autoSettleBeforeDate(beforeDate);
      if (result.settledCount > 0) {
        this.logger.log(`Auto settled ${result.settledCount} leader commission(s)`);
      }
      return result;
    } catch (err) {
      this.logger.error('scanOnce error', err as Error);
      return { settledCount: 0 };
    } finally {
      this.scanning = false;
    }
  }
}
