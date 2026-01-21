import { list, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

const EXPIRY_HOURS = 3;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    const { id } = params;
    const filename = `${id}.pdf`;

    // Blob 리스트에서 파일 찾기
    const { blobs } = await list({ prefix: filename, token });

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
      await del(blob.url, { token });
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
