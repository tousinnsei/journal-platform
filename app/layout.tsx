import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://journal-platform-one.vercel.app"
  ),
  title: {
    default: "学术期刊信息数据库与检索平台",
    template: "%s | 学术期刊信息数据库与检索平台",
  },
  description:
    "学术期刊信息数据库与检索平台：收录国内外期刊目录、核心收录信息与资源渠道，提供期刊检索、筛选与详情浏览，以及软著、专利、商标等知识产权服务信息。",
  keywords: ["期刊", "学术期刊", "期刊目录", "核心期刊", "期刊检索", "软著", "专利", "商标"],
  robots: { index: true, follow: true },
  openGraph: {
    title: "学术期刊信息数据库与检索平台",
    description:
      "学术期刊信息数据库与检索平台：期刊检索、核心收录信息与知识产权服务。",
    url: "/",
    siteName: "学术期刊信息数据库与检索平台",
    locale: "zh_CN",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
