import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { config } from "./config";

export async function ensureDefaultUser() {
  const id = config.defaultUserId;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (existing) return existing;

  try {
    return await prisma.user.create({
      data: { id, name: "You" },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.user.findUniqueOrThrow({ where: { id } });
    }
    throw error;
  }
}
