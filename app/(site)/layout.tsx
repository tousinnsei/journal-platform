import Link from "next/link";
import { BookOpen, ShieldCheck } from "lucide-react";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="h-16 border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white">Journal Platform</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60 font-medium">
              学术期刊目录
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/journals"
            className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            期刊目录
          </Link>
          <Link
            href="/software-copyrights"
            className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            软著服务
          </Link>
          <Link
            href="/patents"
            className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            专利服务
          </Link>
          <Link
            href="/trademarks"
            className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            商标服务
          </Link>
          <Link
            href="/admin/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>管理后台</span>
          </Link>
        </nav>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10">{children}</main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        Journal Platform · 学术期刊检索与代理服务
      </footer>
    </div>
  );
}
