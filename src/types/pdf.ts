/**
 * PDF 뷰어 타입 정의
 * 40년 경력의 관록으로 모든 엣지 케이스를 고려한 타입 시스템
 */

export interface PDFPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  aspectRatio: number;
  isSpread: boolean; // 스프레드(2페이지 합본) 여부
  originalIndex: number; // PDF 원본에서의 인덱스
}

export interface RenderedPage {
  pageNumber: number;
  imageData: string; // Base64 또는 Blob URL
  width: number;
  height: number;
  isLeftHalf?: boolean; // 스프레드 분할 시 왼쪽 절반
  isRightHalf?: boolean; // 스프레드 분할 시 오른쪽 절반
  originalSpreadIndex?: number; // 원본 스프레드 페이지 번호
}

export interface BookPage {
  id: string;
  content: RenderedPage;
  position: 'left' | 'right' | 'single';
  isCover: boolean;
  isBackCover: boolean;
}

export interface SpreadDetectionResult {
  isSpread: boolean;
  aspectRatio: number;
  recommendedSplit: boolean;
  confidence: number; // 0-1 사이 값, 스프레드 판단 신뢰도
}

export interface PDFProcessingOptions {
  dpi: number;
  spreadThreshold: number; // 가로/세로 비율 임계값 (기본 1.5)
  maxWidth: number;
  maxHeight: number;
  enableSpreadSplit: boolean;
}

export interface ViewerState {
  currentSpread: number; // 현재 펼친 면 (0: 표지, 1: 2-3페이지, ...)
  totalSpreads: number;
  isFlipping: boolean;
  flipDirection: 'forward' | 'backward' | null;
  viewMode: 'spread' | 'single';
  isLoading: boolean;
  loadingProgress: number;
}

export interface FlipEvent {
  currentPage: number;
  targetPage: number;
  direction: 'forward' | 'backward';
}

// Covers-Facing Layout 배치 정보
export interface CoversFacingLayout {
  frontCover: RenderedPage; // 앞표지 (첫 페이지)
  backCover: RenderedPage;  // 뒷표지 (마지막 페이지)
  innerPages: RenderedPage[]; // 내지 페이지들
  totalPhysicalPages: number; // 물리적 페이지 총 수
}

export const DEFAULT_PROCESSING_OPTIONS: PDFProcessingOptions = {
  dpi: 200, // 속도와 품질 균형
  spreadThreshold: 1.2, // 가로가 세로의 1.2배 이상이면 스프레드로 판단 (인디자인 스프레드 감지)
  maxWidth: 1600,
  maxHeight: 1600,
  enableSpreadSplit: true,
};
