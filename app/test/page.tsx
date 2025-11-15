"use client";

import { TinderCards } from '@/components/tinder-cards'
import React, { useMemo, useState, useEffect } from 'react'
import { EloRatingSystem, Stack, Movie } from '@/lib/elo_rating/movie_rating'
import { moviesToCardData } from '@/lib/elo_rating/movieToCardData'

const TestPage = () => {
  // Initialize ELO rating system
  const [ratingSystem] = useState(() => new EloRatingSystem());
  const [movieStack] = useState(() => new Stack<Movie>());
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch movies using API route
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the same input format as the example in getMovies.ts
        const response = await fetch('/api/movies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            preferredGenres: ["drama", "romance"],
            spotifyUrls: [
              "https://open.spotify.com/track/0bYg9bo50gSsH3LtXe2SQn?si=a615e44cba56420b",
            ],
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch movies');
        }

        const data = await response.json();
        const movieRecommendations = data.movies;

        // Convert the returned format to Movie format
        // API returns: { title, genre, expectedScore }
        // Movie expects: { id, title, genres, expected_score }
        const convertedMovies: Movie[] = movieRecommendations.map((movie: any, index: number) => ({
          id: `m${index + 1}`,
          title: movie.title,
          genres: movie.genre,
          expected_score: movie.expectedScore,
        }));

        setMovies(convertedMovies);
      } catch (err) {
        console.error("Error fetching movies:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch movies");
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Load movies into ELO system and stack
  useEffect(() => {
    if (movies.length === 0) return;

    ratingSystem.loadMovies(movies);
    
    // Load movies onto the stack in REVERSE order (so first movie is on top)
    for (let i = movies.length - 1; i >= 0; i--) {
      movieStack.push(movies[i]);
    }
  }, [ratingSystem, movieStack, movies]);

  // Convert movies to CardData format
  const cardsData = useMemo(() => {
    if (movies.length === 0) return [];
    return moviesToCardData(movies);
  }, [movies]);

  // Handle swipe callback
  const handleSwipe = React.useCallback((cardId: string | undefined, direction: 'right' | 'left') => {
    if (!cardId) {
      console.warn('Card swiped but no ID provided');
      return;
    }
    
    // Update ELO rating system
    ratingSystem.handleSwipe(cardId, direction);
    
    // You can also get updated rankings if needed
    // const rankings = ratingSystem.getRankings();
    // console.log('Current rankings:', rankings);
  }, [ratingSystem]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading movie recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">No movies found</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TinderCards 
        cardsData={cardsData} 
        onSwipe={handleSwipe}
        getRankings={() => ratingSystem.getRankings()}
      />
    </div>
  )
}

export default TestPage