import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { buildImportPreview, type MappingOverride } from "@/lib/journal-import";

export const runtime = "nodejs";
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

    const mappingRaw = form.get("mapping");
    let mapping: MappingOverride = null;
    if (typeof mappingRaw === "string" && mappingRaw.trim()) {
      try {
        mapping = JSON.parse(mappingRaw);
      } catch {
        return NextResponse.json({ code: 400, message: "列映射 JSON 格式错误" }, { status: 400 });
      }
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const preview = await buildImportPreview(buffer, file.name, mapping);

    return NextResponse.json({ code: 200, data: preview });
  } catch (error: unknown) {
    console.error("Journal import preview error:", error);
    const { message, status, code, field, detail } = friendlyError(error, "文件解析失败，请检查文件格式");
    return NextResponse.json(
      { code: status, message, ...(code ? { errorCode: code } : {}), ...(field ? { field } : {}), ...(detail ? { detail } : {}) },
      { status }
    );
  }
}
