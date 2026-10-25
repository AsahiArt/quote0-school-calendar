import type { Metadata } from "next";
import { shanghaiDateKey } from "../lib/school-calendar";
import "./globals.css";
import { BakedTodayProvider } from "./today";

export const metadata: Metadata = {
  metadataBase: new URL("https://asahiart.github.io/quote0-school-calendar/"),
  title: "沪上校历｜Quote/0 上海中小学校历插件",
  description: "为 Quote/0 墨水屏设计的上海中小学校历插件，显示开学多久、距离学期结束还有多久，以及寒暑假进度。",
  openGraph: {
    title: "沪上校历｜Quote/0 上海中小学校历插件",
    description: "把上海中小学的开学、结课和寒暑假进度放进 296 × 152。",
    type: "website",
    locale: "zh_CN",
    images: [
      {
        url: "/og.jpg",
        width: 1536,
        height: 1024,
        alt: "沪上校历 Quote/0 插件",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "沪上校历｜Quote/0 上海中小学校历插件",
    description: "上海中小学开学、结课与寒暑假进度。",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const today = shanghaiDateKey();
  return (
    <html lang="zh-CN" data-today={today}>
      <body>
        <BakedTodayProvider value={today}>{children}</BakedTodayProvider>
      </body>
    </html>
  );
}
