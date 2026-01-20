'use client';

/**
 * 메인 페이지
 * PDF 북 뷰어 - 인디자인 스프레드 자동 감지 및 분할
 *
 * Covers-Facing Layout:
 * - 첫 화면: 좌(뒷표지) / 우(앞표지)
 * - 중간: 연속 페이지 쌍
 * - 마지막: 좌(앞표지) / 우(뒷표지)
 */

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RenderedPage } from '@/types/pdf';
import { loadPDFDocument, processPDF, cleanupBlobURLs } from '@/lib/pdfProcessor';
import PDFUploader from '@/components/PDFUploader';
import ViewerControls from '@/components/ViewerControls';

// react-pageflip은 SSR 미지원이므로 동적 임포트
const BookViewer = dynamic(() => import('@/components/BookViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400 loading-pulse">뷰어 로딩 중...</div>
    </div>
  ),
});

type ViewMode = 'spread' | 'single';

export default function Home() {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('spread');
  const [pdfName, setPdfName] = useState<string>('');

  // 메모리 정리
  useEffect(() => {
    return () => {
      if (pages.length > 0) {
        cleanupBlobURLs(pages);
      }
    };
  }, [pages]);

  // PDF 파일 처리
  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setPdfName(file.name);

    try {
      // 이전 페이지 메모리 해제
      if (pages.length > 0) {
        cleanupBlobURLs(pages);
      }

      // PDF 로드
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await loadPDFDocument(arrayBuffer);

      // PDF 처리 (스프레드 감지 및 분할 포함)
      // 인디자인 스프레드 PDF: 가로가 세로보다 길면 자동 분할
      const renderedPages = await processPDF(
        pdf,
        {
          dpi: 200, // 속도와 품질 균형
          spreadThreshold: 1.2, // 1.2 이상이면 스프레드로 판단
          maxWidth: 1600,
          maxHeight: 1600,
          enableSpreadSplit: true,
        },
        (progress) => {
          setLoadingProgress(progress);
        }
      );

      setPages(renderedPages);
      setCurrentPage(0);
    } catch (error) {
      console.error('PDF 처리 오류:', error);
      alert('PDF 파일을 처리하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [pages]);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((pageIndex: number) => {
    setCurrentPage(pageIndex);
  }, []);

  // 뷰 모드 변경
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // 페이지 이동
  const handleGoToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 리셋 (새 PDF 열기)
  const handleReset = useCallback(() => {
    if (pages.length > 0) {
      cleanupBlobURLs(pages);
    }
    setPages([]);
    setCurrentPage(0);
    setPdfName('');
  }, [pages]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div>
            <h1 className="text-white text-xl font-semibold">
              PDF Book Viewer
            </h1>
            {pdfName && (
              <p className="text-gray-400 text-sm mt-1 truncate max-w-md">
                {pdfName}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* 컨트롤 (PDF가 로드된 경우에만) */}
      {pages.length > 0 && (
        <ViewerControls
          currentPage={currentPage}
          totalPages={pages.length}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onGoToPage={handleGoToPage}
          onReset={handleReset}
        />
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex items-center justify-center p-2 pt-16 pb-8 overflow-hidden">
        {pages.length === 0 ? (
          <PDFUploader
            onFileSelect={handleFileSelect}
            isLoading={isLoading}
            progress={loadingProgress}
          />
        ) : (
          <BookViewer
            pages={pages}
            onPageChange={handlePageChange}
            className="w-full h-[calc(100vh-80px)]"
          />
        )}
      </div>

      {/* 푸터 (PDF 미로드 시에만) */}
      {pages.length === 0 && !isLoading && (
        <footer className="text-center py-6 text-gray-500 text-sm">
          <p>인디자인 스프레드 PDF 자동 감지 | 300 DPI 고해상도 렌더링</p>
          <p className="mt-1 text-gray-600">
            Covers-Facing Layout: 첫 화면에서 앞표지와 뒷표지를 함께 확인
          </p>
        </footer>
      )}

      {/* 키보드 단축키 안내 (PDF 로드 시) */}
      {pages.length > 0 && (
        <div className="fixed bottom-4 left-4 text-gray-500 text-xs">
          <span className="px-2 py-1 bg-white/5 rounded mr-1">←</span>
          <span className="px-2 py-1 bg-white/5 rounded mr-2">→</span>
          또는 스페이스바로 페이지 이동
        </div>
      )}
    </main>
  );
}
