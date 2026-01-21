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

import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const currentFileRef = useRef<File | null>(null);

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
    setShareUrl('');
    currentFileRef.current = file;

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
    setShareUrl('');
    currentFileRef.current = null;
  }, [pages]);

  // 공유 링크 생성
  const handleShare = useCallback(async () => {
    if (!currentFileRef.current) {
      alert('공유할 PDF 파일이 없습니다.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', currentFileRef.current);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
      setShowShareModal(true);
    } catch (error) {
      console.error('공유 오류:', error);
      alert('PDF 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 클립보드 복사
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    alert('링크가 복사되었습니다!');
  }, [shareUrl]);

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

      {/* 공유 버튼 (PDF 로드 시) */}
      {pages.length > 0 && (
        <button
          onClick={handleShare}
          disabled={isUploading}
          className="fixed bottom-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              업로드 중...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              공유 링크 생성
            </>
          )}
        </button>
      )}

      {/* 공유 모달 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white text-lg font-semibold mb-2">공유 링크 생성됨</h3>
            <p className="text-yellow-400 text-sm mb-4">이 링크는 3시간 후 만료됩니다.</p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                복사
              </button>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
