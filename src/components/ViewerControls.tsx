'use client';

/**
 * 뷰어 컨트롤 패널
 * 뷰 모드 전환, 페이지 이동, 줌 등
 */

import React from 'react';

interface ViewerControlsProps {
  currentPage: number;
  totalPages: number;
  viewMode: 'spread' | 'single';
  onViewModeChange: (mode: 'spread' | 'single') => void;
  onGoToPage: (page: number) => void;
  onReset: () => void;
}

export default function ViewerControls({
  currentPage,
  totalPages,
  viewMode,
  onViewModeChange,
  onGoToPage,
  onReset,
}: ViewerControlsProps) {
  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
      {/* 뷰 모드 토글 */}
      <div className="flex bg-black/30 backdrop-blur-sm rounded-lg p-1">
        <button
          onClick={() => onViewModeChange('spread')}
          className={`
            px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
            ${
              viewMode === 'spread'
                ? 'bg-white/20 text-white'
                : 'text-gray-400 hover:text-white'
            }
          `}
        >
          <span className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            스프레드
          </span>
        </button>
        <button
          onClick={() => onViewModeChange('single')}
          className={`
            px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
            ${
              viewMode === 'single'
                ? 'bg-white/20 text-white'
                : 'text-gray-400 hover:text-white'
            }
          `}
        >
          <span className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            단일
          </span>
        </button>
      </div>

      {/* 페이지 점프 */}
      <div className="flex items-center bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5">
        <input
          type="number"
          min={1}
          max={totalPages}
          value={currentPage + 1}
          onChange={(e) => {
            const page = parseInt(e.target.value, 10);
            if (page >= 1 && page <= totalPages) {
              onGoToPage(page - 1);
            }
          }}
          className="w-12 bg-transparent text-white text-sm text-center focus:outline-none"
        />
        <span className="text-gray-400 text-sm">/ {totalPages}</span>
      </div>

      {/* 새 PDF 열기 */}
      <button
        onClick={onReset}
        className="p-2 bg-black/30 backdrop-blur-sm rounded-lg text-gray-400 hover:text-white transition-colors duration-200"
        title="새 PDF 열기"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}
