"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Lightbulb,
  Tags,
  Building2,
  FolderTree,
  PlusCircle,
  LogOut,
  ShieldCheck,
  UserCircle,
  ClipboardCheck,
  Upload,
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const navItems = [
    { label: "控制台概览", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "期刊管理列表", href: "/admin/journals", icon: BookOpen },
    { label: "新增期刊录入", href: "/admin/journals/create", icon: PlusCircle },
    { label: "期刊审核专区", href: "/admin/journals/audit", icon: ClipboardCheck, adminOnly: true },
    { label: "期刊批量导入", href: "/admin/journals/import", icon: Upload },
    { label: "软著管理列表", href: "/admin/software-copyrights", icon: FileText },
    { label: "新增软著录入", href: "/admin/software-copyrights/create", icon: PlusCircle },
    { label: "专利管理列表", href: "/admin/patents", icon: Lightbulb },
    { label: "新增专利录入", href: "/admin/patents/create", icon: PlusCircle },
    { label: "商标服务列表", href: "/admin/trademarks", icon: Tags },
    { label: "新增商标服务", href: "/admin/trademarks/create", icon: PlusCircle },
    { label: "出版社字典", href: "/admin/publishers", icon: Building2, adminOnly: true },
    { label: "学科分类树", href: "/admin/categories", icon: FolderTree, adminOnly: true },
    { label: "期刊属性字典", href: "/admin/journals/dictionaries", icon: Tags, adminOnly: true },
  ].filter((item) => !item.adminOnly || isSuperAdmin);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white">Journal Platform</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60 font-medium">
              管理后台
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">{isSuperAdmin ? "超级管理员" : "编辑员"}</span>
          </div>

          {user && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
              <UserCircle className="w-4 h-4 text-blue-400" />
              <span className="max-w-[120px] truncate">{user.name}</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-xl hover:bg-red-950/30 border border-transparent hover:border-red-900/40 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </header>

      {/* Main Grid: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-900/40 p-4 space-y-1 shrink-0 hidden md:block">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            核心管理导航
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
