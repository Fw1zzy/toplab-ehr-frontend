import { NextRequest, NextResponse } from 'next/server';

const cmsUrl = (process.env.LIKHA_CMS_URL || 'https://ehr.zyberlab.com').replace(/\/$/, '');

async function proxyRequest(request: NextRequest, path: string[]) {
  const incomingUrl = new URL(request.url);
  const target = `${cmsUrl}/${path.map(encodeURIComponent).join('/')}${incomingUrl.search}`;
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('origin');
  headers.delete('content-length');
  headers.delete('connection');

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
    });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('set-cookie');
    responseHeaders.set('cache-control', 'no-store');

    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
    for (const cookie of upstream.headers.getSetCookie()) {
      response.headers.append(
        'set-cookie',
        cookie.replace(/;\s*Domain=[^;]*/gi, '').replace(/;\s*SameSite=None/gi, '; SameSite=Lax'),
      );
    }
    return response;
  } catch {
    return NextResponse.json({ errors: [{ message: 'Could not reach the Likha EHR API.' }] }, { status: 502 });
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  return proxyRequest(request, (await params).path);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  return proxyRequest(request, (await params).path);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return proxyRequest(request, (await params).path);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return proxyRequest(request, (await params).path);
}
