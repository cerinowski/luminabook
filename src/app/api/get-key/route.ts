import { NextResponse } from 'next/server';

export async function GET() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: 'Key not found' }, { status: 404 });

    return NextResponse.json({ key });
}
