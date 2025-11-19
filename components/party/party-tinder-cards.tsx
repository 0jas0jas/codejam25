"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { TinderCards } from '@/components/tinder-cards';
import { moviesToCardData } from '@/lib/elo_rating/movieToCardData';
import { subscribeToParty, unsubscribeFromParty } from '@/lib/party/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Lottie from 'lottie-react';

interface PartyTinderCardsProps {
  partySlug: string;
  onComplete: () => void;
}

export function PartyTinderCards({ partySlug, onComplete }: PartyTinderCardsProps) {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swipedMovies, setSwipedMovies] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const swipingInProgress = useRef<Set<string>>(new Set()); // Track swipes currently being processed
  
  // State for poster images and extra info (same as test-recommendations-page)
  const [titleToPoster, setTitleToPoster] = useState<Record<string, string | null>>({});
  const [titleToProduction, setTitleToProduction] = useState<Record<string, string>>({});
  const [titleToDirectors, setTitleToDirectors] = useState<Record<string, string[]>>({});
  const [titleToDescription, setTitleToDescription] = useState<Record<string, string>>({});
  const [titleToRating, setTitleToRating] = useState<Record<string, number | null>>({});
  const [animationData, setAnimationData] = useState<any>(null);

  // Fetch movies
  useEffect(() => {
    fetchMovies();
    // Load movie animation
    fetch('/movie-animation.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Error loading animation:', err));
  }, [partySlug]);

  // Set up realtime for movie updates
  useEffect(() => {
    if (!movies.length) return;

    // Get party ID from first movie
    const partyId = movies[0]?.party_id;
    if (!partyId) return;

    const ch = subscribeToParty(partyId, {
      onMovieUpdate: (updatedMovie) => {
        setMovies((prev) =>
          prev.map((m) =>
            m.movie_id === updatedMovie.movie_id ? updatedMovie : m
          )
        );
      },
    });

    setChannel(ch);

    return () => {
      if (ch) {
        unsubscribeFromParty(ch);
      }
    };
  }, [movies]);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/party/${partySlug}/movies`);
      if (!response.ok) {
        throw new Error('Failed to fetch movies');
      }

      const { movies: moviesData } = await response.json();
      
      // Convert to Movie format for TinderCards
      const convertedMovies = moviesData.map((m: any) => ({
        id: m.movie_id,
        title: m.title,
        genres: m.genres,
        expected_score: Number(m.expected_score),
      }));

      setMovies(convertedMovies);

      // Enrich posters via our TMDB-backed endpoint using only names (same as test-recommendations-page)
      try {
        const names = convertedMovies.map((m: any) => m.title);
        const infoRes = await fetch('/api/movie-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names }),
        });
        if (infoRes.ok) {
          const infoJson: { movies?: any[] } = await infoRes.json();
          const infos = infoJson.movies ?? [];
          // Helper to normalize titles for resilient matching
          const normalize = (s: string) =>
            s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          const posterMap: Record<string, string | null> = {};
          const productionMap: Record<string, string> = {};
          const directorsMap: Record<string, string[]> = {};
          const descriptionMap: Record<string, string> = {};
          const ratingMap: Record<string, number | null> = {};
          const normalizedInfos = infos.map((mi) => ({
            norm: normalize(mi.title),
            data: mi,
          }));
          for (const m of convertedMovies) {
            const normTitle = normalize(m.title);
            const exact = normalizedInfos.find((x) => x.norm === normTitle)?.data;
            const partial = exact
              ? undefined
              : normalizedInfos.find((x) => x.norm.includes(normTitle) || normTitle.includes(x.norm))?.data;
            const chosen = exact ?? partial;
            posterMap[m.title] = chosen?.poster ?? null;
            productionMap[m.title] = (chosen?.production ?? [])[0] ?? '';
            directorsMap[m.title] = chosen?.directors ?? [];
            descriptionMap[m.title] = chosen?.description ?? '';
            ratingMap[m.title] = chosen?.rating ?? null;
          }
          setTitleToPoster(posterMap);
          setTitleToProduction(productionMap);
          setTitleToDirectors(directorsMap);
          setTitleToDescription(descriptionMap);
          setTitleToRating(ratingMap);
        } else {
          console.warn('Failed to fetch movie posters from /api/movie-info');
        }
      } catch (e) {
        console.warn('Poster enrichment failed', e);
      }

      // Get user's existing swipes
      const { getUserId } = await import('@/lib/party/session');
      const userId = await getUserId();
      
      const swipesRes = await fetch(`/api/party/${partySlug}/swipes?userId=${encodeURIComponent(userId)}`);
      if (swipesRes.ok) {
        const { swipes } = await swipesRes.json();
        setSwipedMovies(new Set(swipes.map((s: any) => s.movie_id)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (cardId: string | undefined, direction: 'right' | 'left') => {
    if (!cardId) return;

    // Don't swipe if already swiped OR if currently being processed
    if (swipedMovies.has(cardId) || swipingInProgress.current.has(cardId)) {
      console.log('[SWIPE] Skipping - already swiped or in progress:', cardId);
      return;
    }

    // Mark as in progress to prevent duplicate calls
    swipingInProgress.current.add(cardId);

    // Optimistically update UI to prevent double swipes
    const newSwipedSet = new Set([...swipedMovies, cardId]);
    setSwipedMovies(newSwipedSet);

    try {
      const { getUserId } = await import('@/lib/party/session');
      const userId = await getUserId();
      
      const response = await fetch(`/api/party/${partySlug}/swipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId: cardId,
          direction,
          userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        // If swipe already exists, that's okay - just log it
        if (data.error && data.error.includes('already recorded')) {
          console.log('Swipe already recorded (this is fine)');
          // Check if all movies swiped (using the new set)
          if (newSwipedSet.size >= movies.length) {
            onComplete();
          }
          // Remove from in-progress set
          swipingInProgress.current.delete(cardId);
          return;
        }
        // Revert optimistic update on other errors
        setSwipedMovies(swipedMovies);
        // Remove from in-progress set
        swipingInProgress.current.delete(cardId);
        throw new Error(data.error || 'Failed to record swipe');
      }

      // Check if all movies swiped (using the new set)
      if (newSwipedSet.size >= movies.length) {
        onComplete();
      }

      // Remove from in-progress set after successful swipe
      swipingInProgress.current.delete(cardId);
    } catch (err) {
      console.error('Error recording swipe:', err);
      // Revert optimistic update on error
      setSwipedMovies((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      // Remove from in-progress set
      swipingInProgress.current.delete(cardId);
    }
  };

  // Convert movies to CardData format, supplying poster and details from TMDB info (same as test-recommendations-page)
  const cardsData = useMemo(() => {
    if (movies.length === 0) return [];
    
    // Filter out already swiped movies
    const unswipedMovies = movies.filter(m => !swipedMovies.has(m.id));
    
    return moviesToCardData(
      unswipedMovies,
      (movie) => {
        const poster = titleToPoster[movie.title];
        return poster ?? `https://via.placeholder.com/300x400?text=${encodeURIComponent(movie.title)}`;
      },
      (movie) => ({
        production: titleToProduction[movie.title],
        directors: titleToDirectors[movie.title],
        description: titleToDescription[movie.title],
        rating: titleToRating[movie.title],
      })
    );
  }, [movies, swipedMovies, titleToPoster, titleToProduction, titleToDirectors, titleToDescription, titleToRating]);

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          {animationData ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-32 h-32">
                <Lottie
                  animationData={animationData}
                  loop={true}
                  autoplay={true}
                  className="w-full h-full"
                />
              </div>
              <p className="text-white">Loading movies...</p>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 bg-sky-500 rounded-full animate-pulse"></div>
              <div className="w-4 h-4 bg-sky-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
              <div className="w-4 h-4 bg-sky-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center text-red-400">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (movies.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center text-gray-300">
          <p>No movies available. The host needs to generate movies first.</p>
        </CardContent>
      </Card>
    );
  }

  const remainingCount = movies.length - swipedMovies.size;
  const completedCount = swipedMovies.size;
  const progressPercentage = movies.length > 0 ? (completedCount / movies.length) * 100 : 0;

  return (
    <div className="relative min-h-[600px] bg-gray-900 rounded-lg p-4">
      {/* Movie Animation Background - More Visible */}
      {animationData && remainingCount > 0 && (
        <div className="absolute inset-0 pointer-events-none z-0 rounded-lg overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 opacity-10">
            <Lottie
              animationData={animationData}
              loop={true}
              autoplay={true}
              className="w-full h-full"
            />
          </div>
        </div>
      )}
      
      {/* Dark gradient background */}
      {remainingCount > 0 && (
        <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-br from-gray-800/50 via-gray-900/50 to-gray-800/50 rounded-lg"></div>
      )}

      {/* Progress Bar */}
      {remainingCount > 0 && (
        <Card className="mb-4 relative z-10 bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <span>🎬</span>
                <span>Swipe through movies</span>
              </CardTitle>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-300">
                  <span>{completedCount} completed</span>
                  <span>{remainingCount} remaining</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {remainingCount > 0 ? (
        <div className="relative z-10">
          <div className="flex flex-col items-center gap-4">
            <TinderCards
              cardsData={cardsData}
              onSwipe={handleSwipe}
            />
            {/* Swipe instructions */}
            <div className="mt-4 text-center text-sm text-gray-400">
              <p className="mb-2">💡 Swipe right to like, left to pass</p>
              <div className="flex items-center justify-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-red-400">
                  <span>←</span> Pass
                </span>
                <span className="flex items-center gap-1 text-green-400">
                  <span>→</span> Like
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Card className="relative z-10 bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              {animationData && (
                <div className="w-32 h-32 mx-auto mb-4">
                  <Lottie
                    animationData={animationData}
                    loop={true}
                    autoplay={true}
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>
            <p className="text-lg font-semibold mb-2 text-white">All done! 🎉</p>
            <p className="text-gray-400">
              Waiting for other members to finish swiping...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

