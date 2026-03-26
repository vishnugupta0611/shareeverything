import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { sessionId } = params;

    if (!sessionId) {
        return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // For now, assume session exists
    return NextResponse.json({ exists: true });
}