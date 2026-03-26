import { NextResponse } from 'next/server';

export async function POST() {
    // Generate a unique session ID
    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    return NextResponse.json({ sessionId });
}