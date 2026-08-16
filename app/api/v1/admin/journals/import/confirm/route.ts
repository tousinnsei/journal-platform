import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import {
  confirmJournalImport,
  type ImportDecision,
  type MappingOverride,
} from "@/lib/journal-import";

export const runtime = "nodejs";

const ALLOWED_STATUS = ["DRAFT", "PENDING", "PUBLISHED"];

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ code: 400, message: "请上传文件" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ code: 400, message: "文件不能超过 20MB" }, { status: 400 });
    }

    const status = form.get("status");
    if (typeof status !== "string" || !ALLOWED_STATUS.includes(status)) {
      return NextResponse.json(
        { code: 400, message: "导入后的期刊状态无效，应为 草稿/待审核/已发布" },
        { status: 400 }
      );
    }

    const mappingRaw = form.get("mapping");
    let mapping: MappingOverride = null;
    if (typeof mappingRaw === "string" && mappingRaw.trim()) {
      try {
        mapping = JSON.parse(mappingRaw);
      } catch {
        return NextResponse.json({ code: 400, message: "列映射 JSON 格式错误" }, { status: 400 });
      }
    }

    const decisionsRaw = form.get("decisions");
    let decisions: ImportDecision[] = [];
    if (typeof decisionsRaw === "string" && decisionsRaw.trim()) {
      try {
        decisions = JSON.parse(decisionsRaw);
      } catch {
        return NextResponse.json({ code: 400, message: "导入决策 JSON 格式错误" }, { status: 400 });
      }
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const result = await confirmJournalImport({
      file: buffer,
      fileName: file.name,
      mapping,
      decisions,
      status: status as "DRAFT" | "PENDING" | "PUBLISHED",
      userId: user.id,
    });

    return NextResponse.json({ code: 200, message: "导入完成", data: result });
  } catch (error: unknown) {
    console.error("Journal import confirm error:", error);
    const { message, status, code, field, detail } = friendlyError(error, "导入失败，请稍后重试");
    return NextResponse.json(
      { code: status, message, ...(code ? { errorCode: code } : {}), ...(field ? { field } : {}), ...(detail ? { detail } : {}) },
      { status }
    );
  }
}
