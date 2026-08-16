import Link from "next/link";
import { BookOpen, FileText, Lightbulb, Tags, ShieldCheck } from "lucide-react";

const entries = [
  {
    href: "/journals",
    icon: BookOpen,
    title: "期刊目录",
    description: "浏览核心与普通学术期刊，查看收录数据库、期刊形式与代理价格。",
  },
  {
    href: "/software-copyrights",
    icon: FileText,
    title: "软著服务",
    description: "软件著作权登记代办，支持普通与加急办理，代理价格透明。",
  },
  {
    href: "/patents",
    icon: Lightbulb,
    title: "专利服务",
    description: "发明专利、实用新型与外观设计的申请代办服务。",
  },
  {
    href: "/trademarks",
    icon: Tags,
    title: "商标服务",
    description: "国内外商标注册、变更与续展等一站式代办服务。",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-slate-950 font-sans">
      <main className="flex flex-1 w-full max-w-5xl flex-col items-center justify-center py-24 px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20 mb-8">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white text-center">
          Journal Platform
        </h1>
        <p className="mt-3 max-w-md text-lg leading-8 text-slate-400 text-center">
          学术期刊、软件著作权、专利与商标的一站式资源目录与代理服务。
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {entries.map((entry) => {
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className="group bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-blue-500/50 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {entry.title}
                </h2>
                <p className="text-sm text-slate-400 leading-6">{entry.description}</p>
              </Link>
            );
          })}
        </div>

        <Link
          href="/admin/login"
          className="mt-8 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition-all text-sm"
        >
          <ShieldCheck className="w-4 h-4" />
          管理后台
        </Link>
      </main>
    </div>
  );
}
