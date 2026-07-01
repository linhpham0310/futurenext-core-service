import { PrismaService } from 'prisma/prisma.service';
import { UsersService } from '../users/services/users.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminBroadcastService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async createBroadcast(dto: any) {
    // Lấy userIds dựa trên audience
    let userIds: string[] = [];
    if (dto.audience === 'ALL') {
      const users = await this.usersService.findAll({ page: 1, limit: 99999 });
      userIds = users.items.map((u) => u.id);
    } // ... tương tự

    // Tạo broadcast record
    const broadcast = await this.prisma.announcementBroadcast.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        audience: dto.audience,
        targetUserIds: dto.targetUserIds
          ? JSON.stringify(dto.targetUserIds)
          : null,
        status: 'SENT',
        createdBy: dto.createdBy,
        sentAt: new Date(),
      },
    });

    // Tạo notifications cho từng user (nếu loại IN_APP)
    if (dto.type === 'IN_APP') {
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          title: dto.title,
          description: dto.content,
          link: '/notifications',
        })),
      });
    }
    // Nếu EMAIL, gửi email bất đồng bộ

    return broadcast;
  }

  async getAll() {
    return this.prisma.announcementBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
