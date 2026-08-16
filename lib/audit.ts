import { db } from "@/lib/db";

export async function logAuditAction(
  userId: string,
  action: string,
  targetEntity: string,
  targetId: string,
  details?: Record<string, unknown>
) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        targetEntity,
        targetId,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
