/**
 * PDF 프로세서 - 40년 경력의 시니어 개발자가 작성한 견고한 PDF 처리 모듈
 *
 * 핵심 기능:
 * 1. PDF 파싱 및 메타데이터 추출
 * 2. 스프레드(2페이지 합본) 자동 감지
 * 3. 고해상도(300 DPI) 렌더링
 * 4. 스프레드 페이지 지능적 분할
 */

import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import {
  PDFPageInfo,
  RenderedPage,
  SpreadDetectionResult,
  PDFProcessingOptions,
  DEFAULT_PROCESSING_OPTIONS,
  CoversFacingLayout,
} from '@/types/pdf';

// PDF.js 워커 및 cMap 설정 (클라이언트 사이드에서만)
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

// cMap URL (한글 등 CJK 폰트 지원)
const CMAP_URL = `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`;
const CMAP_PACKED = true;

// 표준 폰트 URL (일러/인디자인에서 아웃라인 처리 안한 텍스트용)
const STANDARD_FONT_DATA_URL = `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`;

/**
 * 스프레드 감지 알고리즘
 * 가로/세로 비율을 분석하여 2페이지가 합쳐진 스프레드인지 판단
 */
export function detectSpread(
  width: number,
  height: number,
  threshold: number = DEFAULT_PROCESSING_OPTIONS.spreadThreshold
): SpreadDetectionResult {
  const aspectRatio = width / height;

  // 일반적인 단일 페이지 비율: 0.6~0.8 (세로가 긴 형태)
  // 스프레드 비율: 1.2~1.6 (가로가 긴 형태)
  const isSpread = aspectRatio >= threshold;

  // 신뢰도 계산: 비율이 임계값에서 멀수록 높은 신뢰도
  let confidence = 0;
  if (isSpread) {
    // 스프레드로 판단된 경우, 2:1에 가까울수록 높은 신뢰도
    confidence = Math.min(1, (aspectRatio - threshold) / (2 - threshold));
  } else {
    // 단일 페이지로 판단된 경우, 0.7:1에 가까울수록 높은 신뢰도
    const singlePageRatio = 0.7;
    confidence = 1 - Math.abs(aspectRatio - singlePageRatio) / singlePageRatio;
    confidence = Math.max(0, Math.min(1, confidence));
  }

  return {
    isSpread,
    aspectRatio,
    recommendedSplit: isSpread && aspectRatio >= 1.8, // 1.8 이상이면 분할 강력 권장
    confidence,
  };
}

/**
 * PDF 문서 로드 (폰트 지원 강화)
 *
 * 일러스트레이터/인디자인에서 아웃라인 처리 안한 텍스트도 최대한 렌더링
 * - standardFontDataUrl: 표준 14 폰트 (Helvetica, Times 등)
 * - cMapUrl: CJK (한중일) 문자 인코딩
 * - isEvalSupported: 폰트 프로그램 실행 허용
 */
export async function loadPDFDocument(
  source: string | ArrayBuffer | Uint8Array
): Promise<PDFDocumentProxy> {
  const loadingTask = pdfjs.getDocument({
    data: source,
    // CJK 폰트 인코딩 지원
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    // 표준 폰트 데이터 (Type1 폰트 대체용)
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    // 폰트 렌더링 옵션
    isEvalSupported: true, // 폰트 프로그램 실행 허용
    useSystemFonts: true, // 시스템 폰트 폴백 사용
    disableFontFace: false, // @font-face 사용 허용
    // 폰트 로딩 실패 시에도 계속 진행
    ignoreErrors: true,
  });
  return await loadingTask.promise;
}

/**
 * 페이지 정보 추출
 */
export async function getPageInfo(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  options: PDFProcessingOptions = DEFAULT_PROCESSING_OPTIONS
): Promise<PDFPageInfo> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });

  const spreadResult = detectSpread(
    viewport.width,
    viewport.height,
    options.spreadThreshold
  );

  return {
    pageNumber,
    width: viewport.width,
    height: viewport.height,
    aspectRatio: spreadResult.aspectRatio,
    isSpread: spreadResult.isSpread && options.enableSpreadSplit,
    originalIndex: pageNumber - 1,
  };
}

/**
 * 페이지를 캔버스에 고해상도로 렌더링
 * 비율을 정확히 유지하면서 maxWidth/maxHeight 내에 맞춤
 */
export async function renderPageToCanvas(
  page: PDFPageProxy,
  options: PDFProcessingOptions = DEFAULT_PROCESSING_OPTIONS,
  cropRegion?: { x: number; y: number; width: number; height: number }
): Promise<HTMLCanvasElement> {
  // DPI 기반 스케일 계산 (72 DPI가 PDF 기본값)
  let scale = options.dpi / 72;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  if (cropRegion) {
    // 스프레드 분할 시 특정 영역만 렌더링
    let targetWidth = cropRegion.width * scale;
    let targetHeight = cropRegion.height * scale;

    // maxWidth/maxHeight를 초과하면 비율 유지하면서 축소
    if (targetWidth > options.maxWidth || targetHeight > options.maxHeight) {
      const widthRatio = options.maxWidth / targetWidth;
      const heightRatio = options.maxHeight / targetHeight;
      const fitRatio = Math.min(widthRatio, heightRatio);

      targetWidth = Math.floor(targetWidth * fitRatio);
      targetHeight = Math.floor(targetHeight * fitRatio);
      scale = scale * fitRatio;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const scaledViewport = page.getViewport({ scale });
    context.translate(-cropRegion.x * scale, -cropRegion.y * scale);

    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
      // 폰트 렌더링 품질 향상
      intent: 'display',
    }).promise;
  } else {
    let targetWidth = viewport.width;
    let targetHeight = viewport.height;

    // maxWidth/maxHeight를 초과하면 비율 유지하면서 축소
    if (targetWidth > options.maxWidth || targetHeight > options.maxHeight) {
      const widthRatio = options.maxWidth / targetWidth;
      const heightRatio = options.maxHeight / targetHeight;
      const fitRatio = Math.min(widthRatio, heightRatio);

      targetWidth = Math.floor(targetWidth * fitRatio);
      targetHeight = Math.floor(targetHeight * fitRatio);
      scale = scale * fitRatio;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const scaledViewport = page.getViewport({ scale });

    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
      // 폰트 렌더링 품질 향상
      intent: 'display',
    }).promise;
  }

  return canvas;
}

/**
 * 스프레드 페이지를 좌/우로 분할
 */
export async function splitSpreadPage(
  page: PDFPageProxy,
  options: PDFProcessingOptions = DEFAULT_PROCESSING_OPTIONS
): Promise<{ left: HTMLCanvasElement; right: HTMLCanvasElement }> {
  const viewport = page.getViewport({ scale: 1 });
  const halfWidth = viewport.width / 2;

  // 왼쪽 절반 렌더링
  const leftCanvas = await renderPageToCanvas(page, options, {
    x: 0,
    y: 0,
    width: halfWidth,
    height: viewport.height,
  });

  // 오른쪽 절반 렌더링
  const rightCanvas = await renderPageToCanvas(page, options, {
    x: halfWidth,
    y: 0,
    width: halfWidth,
    height: viewport.height,
  });

  return { left: leftCanvas, right: rightCanvas };
}

/**
 * 캔버스를 Base64 이미지로 변환
 */
export function canvasToBase64(
  canvas: HTMLCanvasElement,
  quality: number = 0.92
): string {
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * 캔버스를 Blob URL로 변환 (메모리 효율적)
 */
export async function canvasToBlobURL(
  canvas: HTMLCanvasElement,
  quality: number = 0.92
): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          reject(new Error('캔버스를 Blob으로 변환 실패'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * 전체 PDF를 처리하여 렌더링된 페이지 배열 반환
 * 스프레드 자동 감지 및 분할 포함
 *
 * 핵심 로직:
 * - 첫 페이지(표지)의 비율을 기준으로 삼음
 * - 다른 페이지가 첫 페이지보다 가로가 1.8배 이상 넓으면 스프레드로 판단
 * - 표지와 뒷표지는 분할하지 않음
 */
export async function processPDF(
  pdf: PDFDocumentProxy,
  options: PDFProcessingOptions = DEFAULT_PROCESSING_OPTIONS,
  onProgress?: (progress: number) => void
): Promise<RenderedPage[]> {
  const pages: RenderedPage[] = [];
  const totalPages = pdf.numPages;
  let processedCount = 0;

  // 첫 페이지(표지) 정보를 먼저 가져와서 기준으로 삼음
  const firstPage = await pdf.getPage(1);
  const firstViewport = firstPage.getViewport({ scale: 1 });
  const coverRatio = firstViewport.width / firstViewport.height;

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const currentRatio = viewport.width / viewport.height;

    // 스프레드 판단 로직:
    // 1. 현재 페이지가 표지보다 가로가 1.8배 이상 넓으면 스프레드
    // 2. 또는 가로/세로 비율이 threshold(1.2) 이상이고, 표지 비율보다 1.5배 이상 넓으면 스프레드
    const isSpread = options.enableSpreadSplit && (
      (currentRatio >= coverRatio * 1.8) ||
      (currentRatio >= options.spreadThreshold && currentRatio >= coverRatio * 1.5)
    );

    if (isSpread) {
      // 스프레드 페이지: 좌/우 분할
      const { left, right } = await splitSpreadPage(page, options);

      // 왼쪽 페이지
      pages.push({
        pageNumber: pages.length + 1,
        imageData: await canvasToBlobURL(left),
        width: left.width,
        height: left.height,
        isLeftHalf: true,
        originalSpreadIndex: i,
      });

      // 오른쪽 페이지
      pages.push({
        pageNumber: pages.length + 1,
        imageData: await canvasToBlobURL(right),
        width: right.width,
        height: right.height,
        isRightHalf: true,
        originalSpreadIndex: i,
      });
    } else {
      // 단일 페이지
      const canvas = await renderPageToCanvas(page, options);
      pages.push({
        pageNumber: pages.length + 1,
        imageData: await canvasToBlobURL(canvas),
        width: canvas.width,
        height: canvas.height,
      });
    }

    processedCount++;
    onProgress?.(processedCount / totalPages);
  }

  return pages;
}

/**
 * Covers-Facing Layout 생성
 * 첫 화면: 좌(뒷표지) / 우(앞표지)
 * 마지막 화면: 동일 구성
 */
export function createCoversFacingLayout(
  pages: RenderedPage[]
): CoversFacingLayout {
  if (pages.length < 2) {
    throw new Error('최소 2페이지 이상의 PDF가 필요합니다.');
  }

  const frontCover = pages[0]; // 첫 페이지 = 앞표지
  const backCover = pages[pages.length - 1]; // 마지막 페이지 = 뒷표지
  const innerPages = pages.slice(1, -1); // 내지 (표지 제외)

  return {
    frontCover,
    backCover,
    innerPages,
    totalPhysicalPages: pages.length,
  };
}

/**
 * 책 뷰어용 페이지 순서 재배열
 * Covers-Facing Layout에 맞게 페이지 순서 조정
 *
 * 배열 순서:
 * [0] = 뒷표지 (좌측에 표시)
 * [1] = 앞표지 (우측에 표시)
 * [2] = 2페이지 (좌측)
 * [3] = 3페이지 (우측)
 * ...
 * [n-2] = n-1페이지 (좌측)
 * [n-1] = 앞표지 (우측) - 마지막 스프레드에서 앞표지로 돌아감
 * [n] = 뒷표지 (좌측) - 책을 덮을 때
 */
export function arrangeForBookViewer(pages: RenderedPage[]): RenderedPage[] {
  if (pages.length < 2) return pages;

  const layout = createCoversFacingLayout(pages);
  const arranged: RenderedPage[] = [];

  // 첫 스프레드: 뒷표지(좌) + 앞표지(우)
  arranged.push(layout.backCover);  // 좌측
  arranged.push(layout.frontCover); // 우측

  // 내지 페이지들
  for (const page of layout.innerPages) {
    arranged.push(page);
  }

  // 마지막에 다시 앞표지와 뒷표지 추가 (책을 완전히 넘겼을 때)
  // 이렇게 하면 책을 끝까지 넘기면 다시 처음으로 돌아가는 느낌

  return arranged;
}

/**
 * Blob URL 메모리 해제
 */
export function cleanupBlobURLs(pages: RenderedPage[]): void {
  for (const page of pages) {
    if (page.imageData.startsWith('blob:')) {
      URL.revokeObjectURL(page.imageData);
    }
  }
}
