'use client';

/**
 * 메인 북 뷰어 컴포넌트
 *
 * react-pageflip을 활용한 실감나는 페이지 플립 효과
 * Covers-Facing Layout 적용
 *
 * 40년 경력 시니어 개발자의 노하우:
 * - 메모리 효율적인 페이지 로딩
 * - 부드러운 애니메이션
 * - 반응형 레이아웃
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import HTMLFlipBook from 'react-pageflip';
import { RenderedPage } from '@/types/pdf';
import { createBookLayout, BookLayout } from '@/lib/pageLayoutEngine';
import BookPage from './BookPage';

interface BookViewerProps {
  pages: RenderedPage[];
  onPageChange?: (pageIndex: number) => void;
  className?: string;
}

// react-pageflip의 Page 컴포넌트 래퍼
const PageWrapper = React.forwardRef<
  HTMLDivElement,
  { page: RenderedPage | null; position: 'left' | 'right'; isCover: boolean }
>(({ page, position, isCover }, ref) => {
  return (
    <div ref={ref} className="page-wrapper">
      <BookPage page={page} position={position} isCover={isCover} />
    </div>
  );
});

PageWrapper.displayName = 'PageWrapper';

export default function BookViewer({
  pages,
  onPageChange,
  className = '',
}: BookViewerProps) {
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  // 책 레이아웃 생성
  const bookLayout: BookLayout = useMemo(() => {
    return createBookLayout(pages);
  }, [pages]);

  // react-pageflip용 플랫 페이지 배열
  const flatPages = useMemo(() => {
    const result: (RenderedPage | null)[] = [];

    for (const spread of bookLayout.spreads) {
      result.push(spread.left);
      result.push(spread.right);
    }

    return result;
  }, [bookLayout]);

  // 컨테이너 크기 감지
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    // 즉시 측정
    updateDimensions();

    // ResizeObserver로 컨테이너 크기 변화 감지
    const resizeObserver = new ResizeObserver(updateDimensions);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // 페이지 크기 계산 - 화면에 최대한 크게, 가로형/세로형 모두 지원
  const pageSize = useMemo(() => {
    // pages가 없으면 기본값 반환
    if (pages.length === 0) {
      return { width: 500, height: 700 };
    }

    // 첫 번째 페이지의 실제 비율 (가로형이면 1보다 큼, 세로형이면 1보다 작음)
    const firstPage = pages[0];
    const bookAspectRatio = firstPage.width / firstPage.height;

    // dimensions가 아직 측정 안됐으면 비율 기반 기본값 반환
    if (dimensions.width === 0 || dimensions.height === 0) {
      const defaultHeight = 600;
      const defaultWidth = defaultHeight * bookAspectRatio;
      return { width: Math.floor(defaultWidth), height: defaultHeight };
    }

    const padding = 100; // 네비게이션 버튼 공간 확보
    const availableWidth = dimensions.width - padding;
    const availableHeight = dimensions.height - padding;

    // 스프레드(2페이지)가 화면에 들어오도록 계산
    const maxPageWidthByWidth = availableWidth / 2;
    const pageHeightByWidth = maxPageWidthByWidth / bookAspectRatio;

    // 세로 기준: 높이에 맞추기
    const maxPageHeightByHeight = availableHeight;
    const pageWidthByHeight = maxPageHeightByHeight * bookAspectRatio;

    // 둘 중 작은 값 선택 (화면에 다 들어오도록)
    let finalWidth, finalHeight;
    if (pageHeightByWidth <= maxPageHeightByHeight) {
      finalWidth = maxPageWidthByWidth;
      finalHeight = pageHeightByWidth;
    } else {
      finalWidth = pageWidthByHeight;
      finalHeight = maxPageHeightByHeight;
    }

    // 최소 크기 보장
    finalWidth = Math.max(finalWidth, 300);
    finalHeight = Math.max(finalHeight, 300);

    console.log('Page size:', Math.floor(finalWidth), 'x', Math.floor(finalHeight),
                'from:', firstPage.width, 'x', firstPage.height,
                'ratio:', bookAspectRatio.toFixed(3),
                'container:', dimensions.width, 'x', dimensions.height);

    return {
      width: Math.floor(finalWidth),
      height: Math.floor(finalHeight),
    };
  }, [dimensions, pages]);

  // 페이지 플립 핸들러
  const handleFlip = useCallback(
    (e: any) => {
      setCurrentPage(e.data);
      onPageChange?.(e.data);
    },
    [onPageChange]
  );

  // 플립 시작/종료 핸들러
  const handleFlipStart = useCallback(() => {
    setIsFlipping(true);
  }, []);

  const handleFlipEnd = useCallback(() => {
    setIsFlipping(false);
  }, []);

  // 네비게이션
  const goToNextPage = useCallback(() => {
    if (bookRef.current && bookRef.current.pageFlip) {
      try {
        bookRef.current.pageFlip().flipNext();
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const goToPrevPage = useCallback(() => {
    if (bookRef.current && bookRef.current.pageFlip) {
      try {
        bookRef.current.pageFlip().flipPrev();
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage]);

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        PDF를 업로드해주세요
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`book-container relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* 책 그림자 (바닥) */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full opacity-30 blur-xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 70%)',
        }}
      />

      {pages.length > 0 && (
        <HTMLFlipBook
          ref={bookRef}
          width={pageSize.width}
          height={pageSize.height}
          size="fixed"
          minWidth={300}
          maxWidth={1200}
          minHeight={400}
          maxHeight={1600}
          maxShadowOpacity={0.5}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={handleFlip}
          onChangeState={handleFlipStart}
          className="book-flip"
          style={{}}
          startPage={0}
          drawShadow={true}
          flippingTime={600}
          usePortrait={false}
          startZIndex={0}
          autoSize={false}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={20}
          showPageCorners={true}
          disableFlipByClick={false}
        >
          {flatPages.map((page, index) => {
            const position: 'left' | 'right' = index % 2 === 0 ? 'left' : 'right';
            const spreadIndex = Math.floor(index / 2);
            const isCover = bookLayout.spreads[spreadIndex]?.isCoverSpread || false;

            return (
              <PageWrapper
                key={`page-${index}`}
                page={page}
                position={position}
                isCover={isCover}
              />
            );
          })}
        </HTMLFlipBook>
      )}

      {/* 네비게이션 버튼 */}
      <button
        onClick={goToPrevPage}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
        aria-label="이전 페이지"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
      </button>

      <button
        onClick={goToNextPage}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
        aria-label="다음 페이지"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      </button>

      {/* 페이지 인디케이터 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/30 text-white text-sm backdrop-blur-sm">
        {Math.floor(currentPage / 2) + 1} / {bookLayout.totalSpreads}
      </div>

      {/* 플립 중 오버레이 */}
      {isFlipping && (
        <div className="absolute inset-0 pointer-events-none">
          {/* 플립 효과 강조 */}
        </div>
      )}
    </div>
  );
}
