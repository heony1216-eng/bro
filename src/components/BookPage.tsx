'use client';

/**
 * 개별 페이지 컴포넌트
 * 종이 질감, 그림자, 이음새 효과를 담당
 */

import React, { forwardRef } from 'react';
import { RenderedPage } from '@/types/pdf';

interface BookPageProps {
  page: RenderedPage | null;
  position: 'left' | 'right';
  isCover?: boolean;
  isFlipping?: boolean;
  className?: string;
}

const BookPage = forwardRef<HTMLDivElement, BookPageProps>(
  ({ page, position, isCover = false, isFlipping = false, className = '' }, ref) => {
    const positionClass = position === 'left' ? 'page-left' : 'page-right';
    const coverClass = isCover ? 'cover-page' : '';
    const flippingClass = isFlipping ? 'flipping-page' : '';

    return (
      <div
        ref={ref}
        className={`
          page relative overflow-hidden
          ${positionClass} ${coverClass} ${flippingClass} ${className}
        `}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        {/* 페이지 콘텐츠 */}
        {page ? (
          <div className="relative w-full h-full">
            <img
              src={page.imageData}
              alt={`페이지 ${page.pageNumber}`}
              className="w-full h-full object-contain"
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
              }}
              draggable={false}
            />

            {/* 페이지 번호 */}
            <div
              className={`
                absolute bottom-4 text-gray-400 text-sm font-light
                ${position === 'left' ? 'left-6' : 'right-6'}
              `}
            >
              {page.pageNumber}
            </div>
          </div>
        ) : (
          // 빈 페이지
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-300 text-opacity-30 text-lg">
              {/* 빈 페이지는 아무것도 표시하지 않음 */}
            </div>
          </div>
        )}

        {/* 중앙 이음새 그림자 - 더 넓고 진하게 */}
        <div
          className={`
            spine-shadow
            ${position === 'left' ? 'spine-shadow-left' : 'spine-shadow-right'}
          `}
        />


        {/* 페이지 모서리 그라데이션 (입체감) */}
        {position === 'left' && (
          <div
            className="absolute inset-y-0 left-0 w-12 pointer-events-none"
            style={{
              background:
                'linear-gradient(to right, rgba(0,0,0,0.05) 0%, transparent 100%)',
            }}
          />
        )}
        {position === 'right' && (
          <div
            className="absolute inset-y-0 right-0 w-12 pointer-events-none"
            style={{
              background:
                'linear-gradient(to left, rgba(0,0,0,0.05) 0%, transparent 100%)',
            }}
          />
        )}

        {/* 상단/하단 미세한 그림자 (종이 두께감) */}
        <div
          className="absolute inset-x-0 top-0 h-1 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, transparent 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.02) 0%, transparent 100%)',
          }}
        />
      </div>
    );
  }
);

BookPage.displayName = 'BookPage';

export default BookPage;
