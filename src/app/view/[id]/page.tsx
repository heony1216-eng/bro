'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { RenderedPage } from '@/types/pdf';
import { loadPDFDocument, processPDF } from '@/lib/pdfProcessor';

const BookViewer = dynamic(() => import('@/components/BookViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400 loading-pulse">뷰어 로딩 중...</div>
    </div>
  ),
});

export default function ViewPage() {
  const params = useParams();
  const id = params.id as string;

  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<string>('');

  useEffect(() => {
    async function loadPDF() {
      try {
        // Blob URL 가져오기
        const response = await fetch(`/api/pdf/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('PDF를 찾을 수 없거나 만료되었습니다.');
          } else {
            setError('PDF를 불러오는 중 오류가 발생했습니다.');
          }
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        // 만료 시간 계산
        if (data.expiresAt) {
          const updateExpiry = () => {
            const now = new Date().getTime();
            const expiry = new Date(data.expiresAt).getTime();
            const diff = expiry - now;

            if (diff <= 0) {
              setExpiresIn('만료됨');
              setError('이 PDF는 만료되었습니다.');
              return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setExpiresIn(`${hours}시간 ${minutes}분 후 만료`);
          };

          updateExpiry();
          const interval = setInterval(updateExpiry, 60000);
          return () => clearInterval(interval);
        }

        // PDF 다운로드 및 처리
        const pdfResponse = await fetch(data.url);
        const arrayBuffer = await pdfResponse.arrayBuffer();
        const pdf = await loadPDFDocument(arrayBuffer);

        const renderedPages = await processPDF(
          pdf,
          {
            dpi: 200,
            spreadThreshold: 1.2,
            maxWidth: 1600,
            maxHeight: 1600,
            enableSpreadSplit: true,
          },
          (progress) => {
            setLoadingProgress(progress);
          }
        );

        setPages(renderedPages);
      } catch (err) {
        console.error('PDF 로드 오류:', err);
        setError('PDF를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      loadPDF();
    }
  }, [id]);

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center p-8">
          <svg
            className="w-20 h-20 mx-auto text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="text-white text-xl font-semibold mb-2">
            {error}
          </h1>
          <p className="text-gray-400 mb-6">
            링크가 만료되었거나 잘못된 링크입니다.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            새 PDF 업로드하기
          </a>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="w-full max-w-md mx-auto p-8">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-blue-400 loading-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-white text-lg font-medium mb-2">
              PDF 불러오는 중...
            </h3>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${Math.round(loadingProgress * 100)}%` }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-2">
              {Math.round(loadingProgress * 100)}%
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div>
            <h1 className="text-white text-xl font-semibold">
              PDF Book Viewer
            </h1>
            {expiresIn && (
              <p className="text-yellow-400 text-sm mt-1">
                {expiresIn}
              </p>
            )}
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
          >
            새 PDF 업로드
          </a>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex items-center justify-center p-2 pt-16 pb-8 overflow-hidden">
        <BookViewer
          pages={pages}
          className="w-full h-[calc(100vh-80px)]"
        />
      </div>

      {/* 키보드 단축키 안내 */}
      <div className="fixed bottom-4 left-4 text-gray-500 text-xs">
        <span className="px-2 py-1 bg-white/5 rounded mr-1">←</span>
        <span className="px-2 py-1 bg-white/5 rounded mr-2">→</span>
        또는 스페이스바로 페이지 이동
      </div>
    </main>
  );
}
