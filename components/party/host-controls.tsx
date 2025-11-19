"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Lottie from 'lottie-react';

interface HostControlsProps {
  partySlug: string;
  members: Array<{
    has_submitted_preferences: boolean;
  }>;
  onStatusChange: () => void;
}

export function HostControls({ partySlug, members, onStatusChange }: HostControlsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    // Load movie animation
    fetch('/movie-animation.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Error loading animation:', err));
  }, []);

  const allMembersSubmitted = members.length > 0 && members.every(m => m.has_submitted_preferences);
  const submittedCount = members.filter(m => m.has_submitted_preferences).length;

  const handleStartSwiping = async () => {
    

    setLoading(true);
    setError(null);

    try {
      // Get user ID
      const { getUserId } = await import('@/lib/party/session');
      const userId = await getUserId();
      console.log('[HOST CONTROLS] Starting swiping - userId:', userId, 'slug:', partySlug);
      
      // Generate movies
      const response = await fetch(`/api/party/${partySlug}/movies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      console.log('[HOST CONTROLS] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[HOST CONTROLS] Error response:', errorText);
        try {
          const data = JSON.parse(errorText);
          throw new Error(data.error || 'Failed to generate movies');
        } catch (e) {
          throw new Error(errorText || 'Failed to generate movies');
        }
      }

      const result = await response.json();
      console.log('[HOST CONTROLS] Movies generated successfully:', result);
      
      // Status will be updated automatically by the API
      onStatusChange();
    } catch (err) {
      console.error('[HOST CONTROLS] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start swiping');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4 bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Host Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-300 mb-2">
              Preferences submitted: {submittedCount} / {members.length}
            </p>
            {!allMembersSubmitted && (
              <p className="text-sm text-yellow-400">
                Waiting for all members to submit preferences...
              </p>
            )}
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          {loading && animationData && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-32 h-32">
                <Lottie
                  animationData={animationData}
                  loop={true}
                  autoplay={true}
                  className="w-full h-full"
                />
              </div>
              <p className="text-white text-lg font-semibold">Generating Movies...</p>
              <p className="text-gray-400 text-sm">This may take a moment</p>
            </div>
          )}

          {!loading && (
            <Button
              onClick={handleStartSwiping}
              disabled={!allMembersSubmitted || loading}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white"
            >
              {allMembersSubmitted
                ? 'Start Swiping!'
                : 'Waiting for Members...'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

