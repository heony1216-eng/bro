'use client';

/**
 * PDF 업로더 컴포넌트
 * 드래그 앤 드롭 및 파일 선택 지원
 */

import React, { useCallback, useState } from 'react';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  progress?: number;
}

export default function PDFUploader({
  onFileSelect,
  isLoading = false,
  progress = 0,
}: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type === 'application/pdf') {
          onFileSelect(file);
        } else {
          alert('PDF 파일만 업로드 가능합니다.');
        }
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
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
              PDF 처리 중...
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              스프레드 감지 및 고해상도 렌더링 진행 중
            </p>

            {/* 프로그레스 바 */}
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-2">
              {Math.round(progress * 100)}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        w-full max-w-md mx-auto
        ${isDragging ? 'scale-105' : 'scale-100'}
        transition-transform duration-200
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <label
        className={`
          block cursor-pointer
          bg-white/5 backdrop-blur-sm rounded-2xl p-8
          border-2 border-dashed
          ${isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-white/20'}
          hover:border-white/40 hover:bg-white/10
          transition-all duration-200
        `}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="text-center">
          <div className="mb-4">
            <svg
              className={`
                w-16 h-16 mx-auto
                ${isDragging ? 'text-blue-400' : 'text-gray-400'}
                transition-colors duration-200
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <h3 className="text-white text-lg font-medium mb-2">
            PDF 파일을 드래그하거나 클릭하여 선택
          </h3>
          <p className="text-gray-400 text-sm">
            스프레드(양면) PDF도 자동으로 분할됩니다
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-xs">
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>300 DPI 고해상도 렌더링</span>
          </div>
        </div>
      </label>
    </div>
  );
}
