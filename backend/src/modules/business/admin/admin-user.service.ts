import { Injectable } from '@nestjs/common';

import { AuthUser } from '../../../common/types';
import { PlatformDataService } from '../../../common/services/platform-data.service';

@Injectable()
export class AdminUserService {
  constructor(private readonly platformDataService: PlatformDataService) {}

  listUsers(query: Record<string, string>) {
    return this.platformDataService.listAdminUsers(query);
  }

  getUserSummary(userId: number) {
    return this.platformDataService.getUserSummary(userId);
  }

  updateUserProfile(user: AuthUser, userId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateAdminUserProfile(userId, body, user);
  }

  deleteUser(user: AuthUser, userId: number) {
    return this.platformDataService.deleteAdminUser(userId, user);
  }

  updateUserStatus(user: AuthUser, userId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateAdminUserStatus(userId, body, user);
  }

  adjustUserPoints(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.adjustAdminUserPoints(body, user);
  }

  listAdminAccounts(query: Record<string, string>) {
    return this.platformDataService.listAdminAccounts(query);
  }

  createAdminAccount(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.createAdminAccount(body, user);
  }

  updateAdminAccount(user: AuthUser, adminUserId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateAdminAccount(adminUserId, body, user);
  }

  resetAdminPassword(user: AuthUser, adminUserId: number, body: Record<string, unknown>) {
    return this.platformDataService.resetAdminPassword(adminUserId, body, user);
  }

  deleteAdminAccount(user: AuthUser, adminUserId: number) {
    return this.platformDataService.deleteAdminAccount(adminUserId, user);
  }

  listAdminRoles(query: Record<string, string>) {
    return this.platformDataService.listAdminRoles(query);
  }

  createAdminRole(user: AuthUser, body: Record<string, unknown>) {
    return this.platformDataService.createAdminRole(body, user);
  }

  updateAdminRole(user: AuthUser, roleId: number, body: Record<string, unknown>) {
    return this.platformDataService.updateAdminRole(roleId, body, user);
  }

  deleteAdminRole(user: AuthUser, roleId: number) {
    return this.platformDataService.deleteAdminRole(roleId, user);
  }
}
