require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const NHL_BASE = 'https://api-web.nhle.com/v1';

app.use(express.json());
app.use(express.static('public'));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

let fallbackFavorites = [
  { id: 1, team_name: 'Washington Capitals', team_abbrev: 'WSH', note: 'Example favorite team' }
];

function teamName(team) {
  return team?.commonName?.default || team?.placeName?.default || team?.name?.default || team?.abbrev || 'Unknown Team';
}

function formatTime(time) {
  if (!time) return 'Time TBD';
  return new Date(time).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

const fallbackScores = [
  { id: 1, away: 'Rangers', home: 'Capitals', awayScore: 3, homeScore: 4, state: 'Demo Final', gameTime: 'Demo data' },
  { id: 2, away: 'Maple Leafs', home: 'Bruins', awayScore: 2, homeScore: 5, state: 'Demo Final', gameTime: 'Demo data' },
  { id: 3, away: 'Avalanche', home: 'Golden Knights', awayScore: 1, homeScore: 2, state: 'Demo Final', gameTime: 'Demo data' }
];

const fallbackSchedule = [
  { id: 1, away: 'Hurricanes', home: 'Panthers', gameTime: 'Tomorrow 7:00 PM', venue: 'Demo Arena' },
  { id: 2, away: 'Oilers', home: 'Stars', gameTime: 'Tomorrow 8:30 PM', venue: 'Demo Arena' },
  { id: 3, away: 'Devils', home: 'Flyers', gameTime: 'Friday 7:00 PM', venue: 'Demo Arena' }
];

const fallbackLeaders = [
  { team: 'Jets', points: 116, wins: 56, losses: 22 },
  { team: 'Capitals', points: 111, wins: 51, losses: 22 },
  { team: 'Golden Knights', points: 110, wins: 50, losses: 22 },
  { team: 'Maple Leafs', points: 108, wins: 52, losses: 26 },
  { team: 'Stars', points: 106, wins: 50, losses: 26 }
];

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'NHL Insight Hub server is running.' });
});

// External API endpoint: gets current NHL scores
app.get('/api/scores', async (req, res) => {
  try {
    const response = await fetch(`${NHL_BASE}/score/now`);
    if (!response.ok) throw new Error('NHL score API failed');
    const data = await response.json();

    const games = (data.games || []).map(game => ({
      id: game.id,
      away: teamName(game.awayTeam),
      home: teamName(game.homeTeam),
      awayScore: game.awayTeam?.score ?? 0,
      homeScore: game.homeTeam?.score ?? 0,
      state: game.gameState || 'Scheduled',
      gameTime: formatTime(game.startTimeUTC)
    }));

    res.json({ source: 'NHL API', games: games.length ? games : fallbackScores });
  } catch (error) {
    res.json({ source: 'Demo fallback', games: fallbackScores });
  }
});

// External API endpoint: gets upcoming NHL schedule
app.get('/api/schedule', async (req, res) => {
  try {
    const response = await fetch(`${NHL_BASE}/schedule/now`);
    if (!response.ok) throw new Error('NHL schedule API failed');
    const data = await response.json();

    const games = (data.gameWeek || []).flatMap(day =>
      (day.games || []).map(game => ({
        id: game.id,
        away: teamName(game.awayTeam),
        home: teamName(game.homeTeam),
        gameTime: formatTime(game.startTimeUTC),
        venue: game.venue?.default || 'Venue TBD'
      }))
    );

    res.json({ source: 'NHL API', games: games.length ? games.slice(0, 9) : fallbackSchedule });
  } catch (error) {
    res.json({ source: 'Demo fallback', games: fallbackSchedule });
  }
});

// External API endpoint: gets NHL standings and turns them into leaders
app.get('/api/leaders', async (req, res) => {
  try {
    const response = await fetch(`${NHL_BASE}/standings/now`);
    if (!response.ok) throw new Error('NHL standings API failed');
    const data = await response.json();

    const leaders = (data.standings || [])
      .map(team => ({
        team: team.teamName?.default || team.teamCommonName?.default || team.teamAbbrev?.default || 'Unknown Team',
        points: team.points || 0,
        wins: team.wins || 0,
        losses: team.losses || 0
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 8);

    res.json({ source: 'NHL API', leaders: leaders.length ? leaders : fallbackLeaders });
  } catch (error) {
    res.json({ source: 'Demo fallback', leaders: fallbackLeaders });
  }
});

// Supabase read endpoint: gets favorite teams
app.get('/api/favorites', async (req, res) => {
  if (!supabase) {
    return res.json({ source: 'Local fallback', favorites: fallbackFavorites });
  }

  const { data, error } = await supabase
    .from('favorites')
    .select('id, team_name, team_abbrev, note, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ source: 'Supabase', favorites: data });
});

// Supabase write endpoint: saves a favorite team
app.post('/api/favorites', async (req, res) => {
  const { team_name, team_abbrev, note } = req.body;

  if (!team_name || !team_abbrev) {
    return res.status(400).json({ error: 'Team name and abbreviation are required.' });
  }

  const favorite = {
    team_name,
    team_abbrev: team_abbrev.toUpperCase(),
    note: note || ''
  };

  if (!supabase) {
    const saved = { id: Date.now(), ...favorite };
    fallbackFavorites.unshift(saved);
    return res.status(201).json({ source: 'Local fallback', favorite: saved });
  }

  const { data, error } = await supabase
    .from('favorites')
    .insert([favorite])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ source: 'Supabase', favorite: data });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

module.exports = app;
