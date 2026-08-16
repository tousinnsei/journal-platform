import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import AuditWorkflow from "./audit-workflow";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const user = await getAuthUser();

  if (!user || user.role !== Role.SUPER_ADMIN) {
    redirect("/admin/dashboard");
  }

  return <AuditWorkflow />;
}
