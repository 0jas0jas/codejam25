"use client";

import { TinderCards } from '@/components/tinder-cards'
import React, { useMemo, useState, useEffect, Suspense } from 'react'
import { EloRatingSystem, Stack, Movie } from '@/lib/elo_rating/movie_rating'
import { moviesToCardData } from '@/lib/elo_rating/movieToCardData'
import { useSearchParams } from 'next/navigation'
import { userInputSchema } from '@/components/formcomp'
import { z } from 'zod'

interface ApiMovieResponse {
  title: string;
  genre: string[];
  expectedScore: number;
}

const TestPageContent = () => {
  // Initialize ELO rating system
  const [ratingSystem] = useState(() => new EloRatingSystem());
  const [movieStack] = useState(() => new Stack<Movie>());
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Fetch movies using API route
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get form data from URL query params
        const dataParam = searchParams.get('data');
        let formData: z.infer<typeof userInputSchema>;
        
        if (dataParam) {
          try {
            // Decode and parse the form data from URL
            const decodedData = decodeURIComponent(dataParam);
            const parsedData = JSON.parse(decodedData);
            formData = userInputSchema.parse(parsedData);
          } catch (parseError) {
            console.error("Error parsing form data from URL:", parseError);
            setError("Invalid form data. Please go back and submit the form again.");
            setLoading(false);
            return;
          }
        } else {
          // Fallback to dummy data if no form data is provided
          formData = {
            preferences: {
              preferredGenres: ["drama", "romance"],
              preferredEra: ["2000s"],
            },
            spotifyUrls: [],
          };
        }
        
        // Use the form data (either from URL or fallback)
        const response = await fetch('/api/movies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
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
        const convertedMovies: Movie[] = movieRecommendations.map((movie: ApiMovieResponse, index: number) => ({
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
  }, [searchParams]);

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

const TestPage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <TestPageContent />
    </Suspense>
  )
}

export default TestPage