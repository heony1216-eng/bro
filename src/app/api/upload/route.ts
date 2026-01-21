import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// GET: 디버그용 - 환경변수 상태 확인
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return NextResponse.json({
    tokenExists: !!token,
    tokenLength: token?.length,
    tokenPrefix: token?.substring(0, 15),
    allBlobEnvKeys: Object.keys(process.env).filter(k => k.includes('BLOB')),
  });
}

export async function POST(request: NextRequest) {
  // 환경변수 디버깅
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  console.log('=== UPLOAD DEBUG ===');
  console.log('Token exists:', !!token);
  console.log('Token length:', token?.length);
  console.log('Token prefix:', token?.substring(0, 20));

  if (!token) {
    return NextResponse.json({
      error: 'BLOB_READ_WRITE_TOKEN not configured',
      debug: {
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('BLOB')),
      }
    }, { status: 500 });
  }

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

    console.log('Uploading file:', filename, 'size:', file.size);

    // File을 ArrayBuffer로 변환 후 업로드
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Vercel Blob에 업로드 - 명시적으로 token 전달
    const blob = await put(filename, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/pdf',
      token: token,
    });

    console.log('Upload success:', blob.url);

    // 만료 시간 (3시간 후)
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      id,
      url: blob.url,
      expiresAt,
      shareUrl: `/view/${id}`,
    });
  } catch (error: unknown) {
    console.error('Upload error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json({
      error: 'Upload failed',
      details: errorMessage,
      stack: errorStack,
      tokenExists: !!token,
      tokenLength: token?.length,
    }, { status: 500 });
  }
}
