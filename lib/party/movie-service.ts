import { createClient } from '@/lib/supabase/server';
import { generateMovieRecommendations, userInputSchema } from '@/lib/getMovies';

export interface PartyMovie {
  id: string;
  party_id: string;
  movie_id: string;
  title: string;
  genres: string[];
  expected_score: number;
  elo_rating: number;
  total_swipes: number;
  right_swipes: number;
  left_swipes: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get all movies for a party
 */
export async function getPartyMovies(partyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('party_movies')
    .select('*')
    .eq('party_id', partyId)
    .order('elo_rating', { ascending: false });

  if (error) {
    throw new Error(`Failed to get party movies: ${error.message}`);
  }

  return data;
}

/**
 * Generate movies for a party based on aggregated preferences
 * This function aggregates preferences FIRST, then generates movies
 */
export async function generatePartyMovies(partyId: string, userId?: string) {
  const supabase = await createClient();
  
  // Get party
  const { data: party, error: partyError } = await supabase
    .from('parties')
    .select('*')
    .eq('id', partyId)
    .single();

  if (partyError || !party) {
    throw new Error('Party not found');
  }

  // AGGREGATE preferences on the host machine (this is the key change!)
  console.log('[MOVIE SERVICE] Aggregating preferences for party:', partyId);
  const { data: aggregated, error: aggError } = await supabase
    .rpc('aggregate_party_preferences', { party_uuid: partyId });

  if (aggError) {
    console.error('[MOVIE SERVICE] Error aggregating preferences:', aggError);
    throw new Error(`Failed to aggregate preferences: ${aggError.message}`);
  }

  if (!aggregated) {
    throw new Error('No preferences found. All members must submit preferences first.');
  }

  // Store aggregated preferences in party
  await supabase
    .from('parties')
    .update({ aggregated_preferences: aggregated })
    .eq('id', partyId);

  console.log('[MOVIE SERVICE] Preferences aggregated successfully:', aggregated);

  // Get all member Spotify URLs
  const { data: members } = await supabase
    .from('party_members')
    .select('spotify_urls')
    .eq('party_id', partyId)
    .eq('status', 'active')
    .eq('has_submitted_preferences', true);

  const allSpotifyUrls: string[] = [];
  members?.forEach(member => {
    if (member.spotify_urls) {
      allSpotifyUrls.push(...member.spotify_urls);
    }
  });

  // Generate movies using the aggregated preferences we just computed
  // Ensure preferences are in the correct format (Record<string, string[]>)
  const aggregatedPrefs = aggregated as Record<string, any>;
  
  // Convert any nested arrays or non-array values to string arrays
  const normalizedPreferences: Record<string, string[]> = {};
  if (aggregatedPrefs) {
    for (const [key, value] of Object.entries(aggregatedPrefs)) {
      if (Array.isArray(value)) {
        // Flatten nested arrays and convert to strings
        normalizedPreferences[key] = value.flatMap((v: any) => 
          Array.isArray(v) ? v.map(String) : [String(v)]
        );
      } else if (value !== null && value !== undefined) {
        normalizedPreferences[key] = [String(value)];
      }
    }
  }
  
  console.log('[MOVIE SERVICE] Normalized preferences:', normalizedPreferences);
  
  const userInput = {
    preferences: normalizedPreferences,
    spotifyUrls: allSpotifyUrls.length > 0 ? allSpotifyUrls : undefined,
  };

  const movies = await generateMovieRecommendations(userInput);

  // Store movies in party - use anonymous version if userId provided
  if (userId) {
    const { storePartyMoviesAnonymous } = await import('./anonymous-service');
    await storePartyMoviesAnonymous(partyId, userId, movies);
  } else {
    const { storePartyMovies } = await import('./party-service');
    await storePartyMovies(partyId, movies);
  }

  return movies;
}

/**
 * Record a swipe on a movie
 */
export async function recordSwipe(
  partyId: string,
  movieId: string,
  direction: 'left' | 'right'
) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Check if swipe already exists
  const { data: existingSwipe } = await supabase
    .from('user_swipes')
    .select('*')
    .eq('party_id', partyId)
    .eq('user_id', user.id)
    .eq('movie_id', movieId)
    .single();

  if (existingSwipe) {
    throw new Error('Swipe already recorded for this movie');
  }

  // Insert swipe (trigger will update movie ELO)
  const { data, error } = await supabase
    .from('user_swipes')
    .insert({
      party_id: partyId,
      user_id: user.id,
      movie_id: movieId,
      direction,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record swipe: ${error.message}`);
  }

  // Update member's swipe progress
  const { data: member } = await supabase
    .from('party_members')
    .select('swipes_completed')
    .eq('party_id', partyId)
    .eq('user_id', user.id)
    .single();

  if (member) {
    const newCount = (member.swipes_completed || 0) + 1;
    await supabase
      .from('party_members')
      .update({ swipes_completed: newCount, has_completed_swiping: newCount >= 10 })
      .eq('party_id', partyId)
      .eq('user_id', user.id);
  }

  return data;
}

/**
 * Get user's swipes for a party
 */
export async function getUserSwipes(partyId: string) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_swipes')
    .select('*')
    .eq('party_id', partyId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to get user swipes: ${error.message}`);
  }

  return data;
}

/**
 * Get final rankings for a party
 */
export async function getPartyRankings(partyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('party_movies')
    .select('*')
    .eq('party_id', partyId)
    .order('elo_rating', { ascending: false });

  if (error) {
    throw new Error(`Failed to get party rankings: ${error.message}`);
  }

  return data;
}

