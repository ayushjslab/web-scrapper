import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const origin = request.headers.get('origin')
    const allowedOrigin = 'https://visible-ai-nine.vercel.app'

    // Check if the request is for an API route
    if (request.nextUrl.pathname.startsWith('/api')) {

        // If there's an origin and it doesn't match, block it.
        // NOTE: For local development, you might want to add 'http://localhost:3000' to the check.
        if (origin && origin !== allowedOrigin) {
            return new NextResponse(JSON.stringify({ error: 'CORS Error: Origin not allowed' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': allowedOrigin,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Max-Age': '86400',
                },
            })
        }
    }

    const response = NextResponse.next()

    // Add CORS headers to the response if for an API and origin matches
    if (request.nextUrl.pathname.startsWith('/api') && origin === allowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    return response
}

export const config = {
    matcher: '/api/:path*',
}
