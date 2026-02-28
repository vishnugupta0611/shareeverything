"use client";
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function JoinWithKey() {
  const params = useParams();
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to main join page with the session key as a query parameter
    if (params.sessionKey) {
      router.push(`/join?key=${params.sessionKey}`);
    } else {
      router.push('/join');
    }
  }, [params.sessionKey, router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-400 border-t-transparent mx-auto mb-4"></div>
        <p>Redirecting to join session...</p>
      </div>
    </div>
  );
}