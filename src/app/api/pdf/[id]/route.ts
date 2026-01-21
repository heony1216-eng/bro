import { list, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

// PDF 메타데이터 저장 (메모리 - 실제로는 KV나 DB 사용 권장)
// Vercel Blob은 자체적으로 만료 기능이 없어서 업로드 시간 추적 필요
const EXPIRY_HOURS = 3;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const filename = `${id}.pdf`;

    // Blob 리스트에서 파일 찾기
    const { blobs } = await list({ prefix: filename });

    if (blobs.length === 0) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    const blob = blobs[0];

    // 업로드 시간으로부터 만료 여부 확인
    const uploadedAt = new Date(blob.uploadedAt);
    const expiresAt = new Date(uploadedAt.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);
    const now = new Date();

    if (now > expiresAt) {
      // 만료됨 - 파일 삭제
      await del(blob.url);
      return NextResponse.json({ error: 'PDF expired' }, { status: 404 });
    }

    return NextResponse.json({
      id,
      url: blob.url,
      uploadedAt: uploadedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('PDF fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 });
  }
}
