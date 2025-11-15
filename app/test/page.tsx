"use client";

import { TinderCards } from '@/components/tinder-cards'
import React, { useMemo, useState } from 'react'
import { EloRatingSystem, Stack, Movie } from '@/lib/elo_rating/movie_rating'
import { moviesToCardData } from '@/lib/elo_rating/movieToCardData'

const TestPage = () => {
  // Initialize ELO rating system
  const [ratingSystem] = useState(() => new EloRatingSystem());
  const [movieStack] = useState(() => new Stack<Movie>());
  
  // Example movie data - in a real app, this would come from your AI recommendations
  const exampleMovies: Movie[] = useMemo(() => [
    { id: "m1", title: "Dune: Part Two", genres: ["Sci-Fi", "Action"], expected_score: 0.85 },
    { id: "m2", title: "The Godfather", genres: ["Drama", "Crime"], expected_score: 0.60 },
    { id: "m3", title: "Oppenheimer", genres: ["Biography", "Drama", "History"], expected_score: 0.75 },
    { id: "m4", title: "Little Miss Sunshine", genres: ["Comedy", "Drama"], expected_score: 0.30 },
  ], []);

  // Load movies into ELO system and stack
  React.useEffect(() => {
    ratingSystem.loadMovies(exampleMovies);
    
    // Load movies onto the stack in REVERSE order (so first movie is on top)
    for (let i = exampleMovies.length - 1; i >= 0; i--) {
      movieStack.push(exampleMovies[i]);
    }
  }, [ratingSystem, movieStack, exampleMovies]);

  // Convert movies to CardData format
  const cardsData = useMemo(() => {
    // Get all movies from stack (we'll need to peek/pop them)
    // For display, we'll use the original array
    return moviesToCardData(exampleMovies);
  }, [exampleMovies]);

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