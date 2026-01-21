import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files allowed' }, { status: 400 });
    }

    // 고유 ID 생성
    const id = nanoid(10);
    const filename = `${id}.pdf`;

    // File을 ArrayBuffer로 변환 후 업로드
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Vercel Blob에 업로드 (v2에서는 token을 환경변수에서 자동으로 읽음)
    const blob = await put(filename, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/pdf',
    });

    // 만료 시간 (3시간 후)
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      id,
      url: blob.url,
      expiresAt,
      shareUrl: `/view/${id}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed', details: String(error) }, { status: 500 });
  }
}
