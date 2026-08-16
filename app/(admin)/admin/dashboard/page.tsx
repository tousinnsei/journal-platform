import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Link from "next/link";
import {
  BookOpen,
  FileCheck,
  Building2,
  FolderTree,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
} from "lucide-react";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const user = await getAuthUser();

  const [
    totalJournals,
    publishedJournals,
    pendingJournals,
    draftJournals,
    totalPublishers,
    totalCategories,
    pricedJournals,
    recentJournals,
    recentAuditLogs,
  ] = await Promise.all([
    db.journal.count(),
    db.journal.count({ where: { status: "PUBLISHED" } }),
    db.journal.count({ where: { status: "PENDING" } }),
    db.journal.count({ where: { status: "DRAFT" } }),
    db.publisher.count(),
    db.category.count(),
    db.journal.count({ where: { minSalePrice: { not: null } } }),
    db.journal.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: { publisher: true },
    }),
    db.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, role: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/30 via-slate-900 to-indigo-900/20 border border-blue-800/40 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            欢迎回来，{user?.name || "管理员"} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            当前身份：<span className="text-blue-400 font-medium">{user?.role === "SUPER_ADMIN" ? "超级管理员 (Super Admin)" : "平台编辑 (Editor)"}</span> · 控制台概览数据正常运行中。
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/journals/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>录入新期刊</span>
          </Link>
          <Link
            href="/admin/journals/audit"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium transition-all"
          >
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>审核工作流 ({pendingJournals})</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">期刊总数</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">{totalJournals}</span>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              <span className="text-emerald-400">已发布 {publishedJournals}</span>
              <span>·</span>
              <span className="text-amber-400">草稿 {draftJournals}</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
              <span className="text-slate-500">代理价格</span>
              <span className="text-emerald-400">已设置 {pricedJournals}</span>
              <span>·</span>
              <span className="text-slate-500">未设置 {totalJournals - pricedJournals}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">待审核期刊</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">{pendingJournals}</span>
            <div className="mt-2 text-xs text-slate-400">
              {pendingJournals > 0 ? "需尽快完成审定发布" : "目前暂无待处理审核"}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">收录出版社</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">{totalPublishers}</span>
            <div className="mt-2 text-xs text-slate-400">国际/国内学术出版商</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">学科分类节点</span>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">{totalCategories}</span>
            <div className="mt-2 text-xs text-slate-400">多级层级树形学科</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Journals & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Journals Table */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <span>最新更新期刊</span>
            </h2>
            <Link href="/admin/journals" className="text-xs text-blue-400 hover:underline">
              查看全部期刊 →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">期刊名称</th>
                  <th className="px-4 py-3">出版社</th>
                  <th className="px-4 py-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentJournals.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-white max-w-[220px] truncate">
                      {j.title}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{j.publisher.name}</td>
                    <td className="px-4 py-3.5">
                      {j.status === "PUBLISHED" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> 已发布
                        </span>
                      )}
                      {j.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/60 font-medium">
                          <Clock className="w-3 h-3" /> 待审核
                        </span>
                      )}
                      {j.status === "DRAFT" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                          <AlertCircle className="w-3 h-3" /> 草稿
                        </span>
                      )}
                      {j.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/60 font-medium">
                          <XCircle className="w-3 h-3" /> 已驳回
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Audit Log Activity Timeline */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <span>系统操作日志审计</span>
          </h2>

          <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="relative pl-6 space-y-1">
                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-slate-950 border-2 border-blue-500 shrink-0" />
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{log.user.name}</span>
                  <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-xs text-slate-300">
                  动作: <span className="font-mono text-blue-400">{log.action}</span> ({log.targetEntity})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
