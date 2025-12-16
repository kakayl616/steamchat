// pages/api/steam.ts

import type { NextApiRequest, NextApiResponse } from 'next';

type SteamPlayer = {
  personaname: string;
  avatarfull: string;
  profileurl: string;
  timecreated?: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { steamID } = req.query;
  if (!steamID || typeof steamID !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid steamID' });
  }

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing Steam API key' });
  }

  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamID}`
    );
    if (!response.ok) {
      return res.status(500).json({ error: 'Error fetching Steam data' });
    }
    const data = await response.json();

    if (!data.response?.players || data.response.players.length === 0) {
      return res.status(404).json({ error: 'Steam profile not found' });
    }

    const player: SteamPlayer = data.response.players[0];
    return res.status(200).json({
      displayName: player.personaname,
      avatar: player.avatarfull,
      profileUrl: player.profileurl,
      timeCreated: player.timecreated
        ? new Date(player.timecreated * 1000).toUTCString().replace("GMT", "UTC")
        : null,
    });
  } catch (error) {
    console.error('Error fetching Steam profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
