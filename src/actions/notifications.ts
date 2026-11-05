"use server";

import { prisma } from "@/lib/db";
import { actionUser } from "@/lib/auth";

export async function getUnreadCount(): Promise<number> {
  const me = await actionUser();
  return prisma.notification.count({ where: { userId: me.uid, read: false } });
}

export async function getNotifications() {
  const me = await actionUser();
  const rows = await prisma.notification.findMany({
    where: { userId: me.uid },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map((r) => ({
    id: r.id,
    message: r.message,
    link: r.link,
    read: r.read,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function markAllRead(): Promise<void> {
  const me = await actionUser();
  await prisma.notification.updateMany({ where: { userId: me.uid, read: false }, data: { read: true } });
}
