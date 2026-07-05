import { User } from '@/modules/users/entities/user.entity';
import { In } from 'typeorm';
import { EntityManager } from 'typeorm';

export async function getUserNameMap(
  entityManager: EntityManager,
  userIds: string[],
): Promise<Map<string, string>> {
  if (!userIds || userIds.length === 0) return new Map();
  const users = await entityManager.find(User, {
    where: { id: In(userIds) },
    select: ['id', 'fullName'],
  });
  return new Map(users.map((u) => [u.id, u.fullName]));
}
