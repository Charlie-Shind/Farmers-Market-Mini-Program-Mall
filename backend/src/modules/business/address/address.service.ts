import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
  ) {}

  async listUserAddresses(authUser: AuthUser) {
    const user = await this.platformDataService.ensureUser(authUser);
    const addresses = await this.prisma.userAddress.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    });

    return addresses.map((address) => this.mapAddress(address));
  }

  async createUserAddress(authUser: AuthUser, body: CreateAddressDto) {
    const user = await this.platformDataService.ensureUser(authUser);
    const receiverName = String(body.receiverName ?? '').trim();
    const receiverMobile = String(body.receiverMobile ?? '').trim();
    const province = String(body.province ?? '').trim();
    const city = String(body.city ?? '').trim();
    const district = String(body.district ?? '').trim();
    const detailAddress = String(body.detailAddress ?? '').trim();
    const isDefault = body.isDefault !== false;

    if (!receiverName || !receiverMobile || !province || !city || !district || !detailAddress) {
      throw new BadRequestException('Address fields are required');
    }

    if (isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.userAddress.create({
      data: {
        userId: user.id,
        receiverName,
        receiverMobile,
        province,
        city,
        district,
        detailAddress,
        isDefault,
      },
    });

    return this.mapAddress(address);
  }

  async updateUserAddress(authUser: AuthUser, addressId: number, body: UpdateAddressDto) {
    const user = await this.platformDataService.ensureUser(authUser);
    const address = await this.prisma.userAddress.findFirst({
      where: { id: BigInt(addressId), userId: user.id, deletedAt: null },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (body.isDefault === true) {
      await this.prisma.userAddress.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.userAddress.update({
      where: { id: address.id },
      data: {
        ...(typeof body.receiverName === 'string' && body.receiverName.trim() ? { receiverName: body.receiverName.trim() } : {}),
        ...(typeof body.receiverMobile === 'string' && body.receiverMobile.trim() ? { receiverMobile: body.receiverMobile.trim() } : {}),
        ...(typeof body.province === 'string' && body.province.trim() ? { province: body.province.trim() } : {}),
        ...(typeof body.city === 'string' && body.city.trim() ? { city: body.city.trim() } : {}),
        ...(typeof body.district === 'string' && body.district.trim() ? { district: body.district.trim() } : {}),
        ...(typeof body.detailAddress === 'string' && body.detailAddress.trim() ? { detailAddress: body.detailAddress.trim() } : {}),
        ...(body.isDefault != null ? { isDefault: Boolean(body.isDefault) } : {}),
      },
    });

    return this.mapAddress(updated);
  }

  async deleteUserAddress(authUser: AuthUser, addressId: number) {
    const user = await this.platformDataService.ensureUser(authUser);
    const result = await this.prisma.userAddress.updateMany({
      where: { id: BigInt(addressId), userId: user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException('Address not found');
    }

    return { addressId, deleted: true };
  }

  private mapAddress(address: {
    id: bigint;
    receiverName: string;
    receiverMobile: string;
    province: string;
    city: string;
    district: string;
    detailAddress: string;
    isDefault: boolean;
  }) {
    return {
      id: Number(address.id),
      receiverName: address.receiverName,
      receiverMobile: address.receiverMobile,
      province: address.province,
      city: address.city,
      district: address.district,
      detailAddress: address.detailAddress,
      isDefault: address.isDefault,
    };
  }
}
