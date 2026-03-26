import { NextResponse } from 'next/server';

export async function POST(request) {
    const { sessionId } = await request.json();

    if (!sessionId) {
        return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // For now, just accept any sessionId
    return NextResponse.json({ success: true });
}