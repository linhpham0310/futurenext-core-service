export interface INotification {
  id: string;
  userId: string;
  title: string;
  description: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
