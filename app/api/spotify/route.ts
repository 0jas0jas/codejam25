import { NextRequest, NextResponse } from 'next/server';

interface SpotifyTrackInfo {
  name: string;
  artist: string;
  genre: string;
}

// Extract track ID from Spotify URL
function extractTrackId(url: string): string | null {
  // Handle different Spotify URL formats:
  // https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
  // https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=...
  // spotify:track:4cOdK2wGLETKBW3PvgPWqT
  const patterns = [
    /spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /spotify:track:([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Get Spotify access token using Client Credentials flow
async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    return null;
  }
}

// Fetch track info from Spotify API
async function fetchTrackInfo(trackId: string, accessToken: string): Promise<SpotifyTrackInfo | null> {
  try {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const track = await response.json();

    // Get artist name
    const artist = track.artists?.[0]?.name || 'Unknown Artist';

    // Get genre from artist (requires another API call)
    let genre = 'Unknown';
    if (track.artists?.[0]?.id) {
      try {
        const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${track.artists[0].id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (artistResponse.ok) {
          const artistData = await artistResponse.json();
          // Spotify provides genres as an array, take the first one or use a default
          genre = artistData.genres?.[0] || 'Unknown';
        }
      } catch (error) {
        console.error('Error fetching artist genre:', error);
      }
    }

    return {
      name: track.name || 'Unknown Track',
      artist,
      genre: genre || 'Unknown',
    };
  } catch (error) {
    console.error('Error fetching track info:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Spotify URL is required' },
        { status: 400 }
      );
    }

    // Extract track ID from URL
    const trackId = extractTrackId(url);
    if (!trackId) {
      return NextResponse.json(
        { error: 'Invalid Spotify URL format' },
        { status: 400 }
      );
    }

    // Get access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to authenticate with Spotify. Please check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.' },
        { status: 500 }
      );
    }

    // Fetch track info
    const trackInfo = await fetchTrackInfo(trackId, accessToken);
    if (!trackInfo) {
      return NextResponse.json(
        { error: 'Failed to fetch track information' },
        { status: 500 }
      );
    }

    return NextResponse.json(trackInfo);
  } catch (error) {
    console.error('Error in Spotify API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

