// Vercel serverless function — proxy hacia football-data.org
// Requiere la variable de entorno FOOTBALL_DATA_API_KEY en Vercel.
//
// Cómo obtener la API key (gratis):
//   1. Regístrate en https://www.football-data.org/client/register
//   2. Confirma tu email y copia tu API key
//   3. En Vercel → tu proyecto → Settings → Environment Variables
//      Agrega: FOOTBALL_DATA_API_KEY = <tu key>
//   4. Re-deploya el proyecto

export default async function handler(req, res) {
  const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

  if (!API_KEY) {
    return res.status(503).json({
      error: 'API key no configurada. Agrega FOOTBALL_DATA_API_KEY en las variables de entorno de Vercel.'
    });
  }

  try {
    // Solo partidos del Mundial 2026 que ya terminaron
    const url = 'https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED';

    const upstream = await fetch(url, {
      headers: { 'X-Auth-Token': API_KEY }
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      throw new Error(`football-data.org respondió ${upstream.status}: ${text.slice(0, 120)}`);
    }

    const data = await upstream.json();

    const matches = (data.matches || [])
      .filter(m =>
        m.status === 'FINISHED' &&
        m.score?.fullTime?.home !== null &&
        m.score?.fullTime?.away !== null
      )
      .map(m => ({
        home:  m.homeTeam.name,
        away:  m.awayTeam.name,
        r1:    m.score.fullTime.home,
        r2:    m.score.fullTime.away,
        date:  m.utcDate.slice(0, 10)
      }));

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(200).json({ matches, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[scores] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
