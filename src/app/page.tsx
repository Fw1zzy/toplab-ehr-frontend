'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root page — client-side redirect to /dashboard.
 * Using client-side navigation avoids the proxy intercepting
 * a server-side redirect before the toplab_auth cookie is set.
 */
export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
