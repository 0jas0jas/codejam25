"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PartyResultsProps {
  partySlug: string;
}

interface MovieWithPoster {
  id: string;
  title: string;
  genres: string[];
  elo_rating: number;
  right_swipes: number;
  left_swipes: number;
  poster?: string | null;
}

export function PartyResults({ partySlug }: PartyResultsProps) {
  const [rankings, setRankings] = useState<MovieWithPoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, [partySlug]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/party/${partySlug}/results`);
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const { rankings: rankingsData } = await response.json();
      
      // Limit to top 5
      const top5 = rankingsData.slice(0, 5);
      
      // Fetch poster images for top 5 movies
      const movieNames = top5.map((m: any) => m.title);
      try {
        const posterResponse = await fetch('/api/movie-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: movieNames }),
        });
        
        if (posterResponse.ok) {
          const { movies: movieInfos } = await posterResponse.json();
          const posterMap: Record<string, string | null> = {};
          
          // Normalize titles for matching
          const normalize = (s: string) =>
            s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          
          const normalizedInfos = (movieInfos || []).map((mi: any) => ({
            norm: normalize(mi.title),
            data: mi,
          }));
          
          for (const movie of top5) {
            const normTitle = normalize(movie.title);
            const exact = normalizedInfos.find((x: any) => x.norm === normTitle)?.data;
            const partial = exact
              ? undefined
              : normalizedInfos.find((x: any) => 
                  x.norm.includes(normTitle) || normTitle.includes(x.norm)
                )?.data;
            const chosen = exact ?? partial;
            posterMap[movie.title] = chosen?.poster ?? null;
          }
          
          // Merge poster data into rankings
          const rankingsWithPosters = top5.map((movie: any) => ({
            ...movie,
            poster: posterMap[movie.title] || null,
          }));
          
          setRankings(rankingsWithPosters);
        } else {
          // If poster fetch fails, just use rankings without posters
          setRankings(top5.map((m: any) => ({ ...m, poster: null })));
        }
      } catch (posterError) {
        console.warn('Failed to fetch movie posters:', posterError);
        setRankings(top5.map((m: any) => ({ ...m, poster: null })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>Loading results...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-red-600">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-4xl font-bold">We think you should watch...</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rankings.map((movie, index) => {
            // First movie: horizontal card with background image
            if (index === 0) {
              return (
                <div
                  key={movie.id}
                  className="relative w-full h-48 rounded-lg overflow-hidden shadow-lg"
                  style={{
                    backgroundImage: movie.poster
                      ? `linear-gradient(to right, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.7) 50%, rgba(0, 0, 0, 0.85) 100%), url(${movie.poster})`
                      : 'linear-gradient(to right, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.7))',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-between p-6 text-white">
                    <div className="flex items-center gap-6 flex-1">
                      <div className="text-4xl font-bold text-white/90">
                        #1
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-3xl mb-2">{movie.title}</h3>
                        <div className="flex gap-2 flex-wrap">
                          {movie.genres.map((genre: string) => (
                            <Badge
                              key={genre}
                              variant="outline"
                              className="text-xs bg-white/20 text-white border-white/30"
                            >
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-6">
                      <div className="text-3xl font-bold text-white">
                        {Math.round(movie.elo_rating)}
                      </div>
                      <div className="text-sm text-white/80">ELO Rating</div>
                      <div className="text-xs text-white/70 mt-1">
                        {movie.right_swipes} likes, {movie.left_swipes} passes
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
            // Remaining movies: normal formatting
            return (
              <div
                key={movie.id}
                className="flex items-center justify-between p-4 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-400 w-8">
                    #{index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{movie.title}</h3>
                    <div className="flex gap-2 mt-1">
                      {movie.genres.map((genre: string) => (
                        <Badge key={genre} variant="outline" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {Math.round(movie.elo_rating)}
                  </div>
                  <div className="text-sm text-gray-600">ELO Rating</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {movie.right_swipes} likes, {movie.left_swipes} passes
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

