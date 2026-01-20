import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PDF Book Viewer - 인디자인 스프레드 지원',
  description:
    '인디자인 스프레드 PDF를 실감나게 펼쳐보는 북 뷰어. 자동 스프레드 감지, 고해상도 렌더링, 페이지 플립 효과.',
  keywords: ['PDF', '뷰어', '인디자인', '스프레드', '전자책', 'eBook'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
