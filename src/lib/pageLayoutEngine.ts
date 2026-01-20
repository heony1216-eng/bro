/**
 * 페이지 레이아웃 엔진 - Covers-Facing Layout 핵심 로직
 *
 * 40년 경력의 관록으로 설계한 정교한 페이지 배치 시스템
 *
 * 핵심 개념:
 * - 첫 스프레드: 좌(뒷표지) / 우(앞표지) → 책을 펼쳐놓은 형태
 * - 중간 스프레드: 연속된 페이지 쌍
 * - 마지막 스프레드: 첫 스프레드와 동일 (순환 구조)
 */

import { RenderedPage } from '@/types/pdf';

export interface SpreadPair {
  id: number;
  left: RenderedPage | null;  // 좌측 페이지 (null = 빈 페이지)
  right: RenderedPage | null; // 우측 페이지 (null = 빈 페이지)
  isCoverSpread: boolean;     // 표지 스프레드 여부
  isLastSpread: boolean;      // 마지막 스프레드 여부
}

export interface BookLayout {
  spreads: SpreadPair[];
  totalSpreads: number;
  totalPages: number;
  hasOddPages: boolean; // 홀수 페이지 여부 (빈 페이지 필요)
}

/**
 * 책 레이아웃 생성기
 *
 * 스프레드 PDF에서 분할된 페이지 배치:
 * - 분할 순서: [1페이지(좌), 2페이지(우)], [3페이지(좌), 4페이지(우)]...
 * - 뷰어 배치: [1,2], [3,4], [5,6]... (연속 스프레드)
 */
export function createBookLayout(pages: RenderedPage[]): BookLayout {
  if (pages.length === 0) {
    return {
      spreads: [],
      totalSpreads: 0,
      totalPages: 0,
      hasOddPages: false,
    };
  }

  if (pages.length === 1) {
    return {
      spreads: [
        {
          id: 0,
          left: pages[0],
          right: null,
          isCoverSpread: true,
          isLastSpread: true,
        },
      ],
      totalSpreads: 1,
      totalPages: 1,
      hasOddPages: true,
    };
  }

  const spreads: SpreadPair[] = [];

  // 2개씩 묶어서 스프레드 생성: [1,2], [3,4], [5,6]...
  for (let i = 0; i < pages.length; i += 2) {
    const leftPage = pages[i];
    const rightPage = pages[i + 1] || null;

    spreads.push({
      id: spreads.length,
      left: leftPage,
      right: rightPage,
      isCoverSpread: i === 0,
      isLastSpread: i + 2 >= pages.length,
    });
  }

  return {
    spreads,
    totalSpreads: spreads.length,
    totalPages: pages.length,
    hasOddPages: pages.length % 2 === 1,
  };
}

/**
 * 특정 스프레드 인덱스의 페이지 쌍 반환
 */
export function getSpreadAtIndex(
  layout: BookLayout,
  index: number
): SpreadPair | null {
  if (index < 0 || index >= layout.spreads.length) {
    return null;
  }
  return layout.spreads[index];
}

/**
 * 페이지 번호로 해당 페이지가 속한 스프레드 인덱스 찾기
 */
export function findSpreadByPageNumber(
  layout: BookLayout,
  pageNumber: number
): number {
  for (let i = 0; i < layout.spreads.length; i++) {
    const spread = layout.spreads[i];
    if (
      spread.left?.pageNumber === pageNumber ||
      spread.right?.pageNumber === pageNumber
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * react-pageflip용 플랫 페이지 배열 생성
 *
 * react-pageflip은 연속된 페이지 배열을 기대하므로,
 * 스프레드 배열을 플랫하게 변환
 *
 * 순서: [뒷표지, 앞표지, 2페이지, 3페이지, ..., n-1페이지, 앞표지, 뒷표지]
 */
export function flattenForPageFlip(layout: BookLayout): (RenderedPage | null)[] {
  const flatPages: (RenderedPage | null)[] = [];

  for (const spread of layout.spreads) {
    flatPages.push(spread.left);
    flatPages.push(spread.right);
  }

  return flatPages;
}

/**
 * 단일 페이지 모드용 배열 생성
 * 표지부터 순차적으로 배열
 */
export function createSinglePageArray(pages: RenderedPage[]): RenderedPage[] {
  return [...pages];
}

/**
 * 현재 스프레드에서 다음/이전 스프레드로 이동 시
 * 페이지 플립 방향 계산
 */
export function calculateFlipDirection(
  currentSpread: number,
  targetSpread: number
): 'forward' | 'backward' {
  return targetSpread > currentSpread ? 'forward' : 'backward';
}

/**
 * 페이지 플립 시 애니메이션에 필요한 정보 계산
 */
export interface FlipAnimationInfo {
  fromSpread: SpreadPair;
  toSpread: SpreadPair;
  direction: 'forward' | 'backward';
  flippingPage: RenderedPage | null; // 넘어가는 페이지
}

export function calculateFlipAnimation(
  layout: BookLayout,
  fromIndex: number,
  toIndex: number
): FlipAnimationInfo | null {
  const fromSpread = getSpreadAtIndex(layout, fromIndex);
  const toSpread = getSpreadAtIndex(layout, toIndex);

  if (!fromSpread || !toSpread) {
    return null;
  }

  const direction = calculateFlipDirection(fromIndex, toIndex);

  // 넘어가는 페이지: 앞으로 넘길 때는 오른쪽 페이지, 뒤로 넘길 때는 왼쪽 페이지
  const flippingPage =
    direction === 'forward' ? fromSpread.right : fromSpread.left;

  return {
    fromSpread,
    toSpread,
    direction,
    flippingPage,
  };
}

/**
 * 반응형 페이지 크기 계산
 */
export interface PageDimensions {
  width: number;
  height: number;
  scale: number;
}

export function calculateResponsivePageSize(
  containerWidth: number,
  containerHeight: number,
  originalPageWidth: number,
  originalPageHeight: number,
  isSpreadView: boolean = true,
  padding: number = 40
): PageDimensions {
  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;

  // 스프레드 뷰에서는 두 페이지가 나란히 표시되므로 가로 공간을 반으로
  const pageContainerWidth = isSpreadView ? availableWidth / 2 : availableWidth;

  // 원본 비율 유지하면서 컨테이너에 맞추기
  const widthScale = pageContainerWidth / originalPageWidth;
  const heightScale = availableHeight / originalPageHeight;
  const scale = Math.min(widthScale, heightScale, 1); // 1 이상으로 확대하지 않음

  return {
    width: Math.floor(originalPageWidth * scale),
    height: Math.floor(originalPageHeight * scale),
    scale,
  };
}
