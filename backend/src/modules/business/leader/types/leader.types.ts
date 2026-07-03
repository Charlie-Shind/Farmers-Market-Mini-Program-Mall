import { DeliveryType, PickupStatus } from '../../../../common/enums/delivery-type.enum';

export { DeliveryType, PickupStatus };

export enum LeaderStatus {
  PENDING_AUDIT = 'PENDING_AUDIT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISABLED = 'DISABLED',
}

export enum PickupPointStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export enum PickupPointSource {
  ADMIN = 'ADMIN',
  LEADER = 'LEADER',
}

export enum CommissionStatus {
  PENDING_SETTLEMENT = 'PENDING_SETTLEMENT',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}
