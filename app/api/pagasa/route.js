import { NextResponse } from 'next/server';

// Cache live data for 15 minutes on Vercel's edge network
export const revalidate = 900;

// Western North Pacific basin — the full monitoring area PAGASA tracks
// Covers 0°N-40°N, 100°E-180°E (includes all storms that could affect the Philippines)
const WNP_BOUNDS = { minLat: 0, maxLat: 40, minLon: 100, maxLon: 180 };

function isInWesternPacific(lat, lon) {
  return (
    lat >= WNP_BOUNDS.minLat &&
    lat <= WNP_BOUNDS.maxLat &&
    lon >= WNP_BOUNDS.minLon &&
    lon <= WNP_BOUNDS.maxLon
  );
}

function mapSeverityToCategory(severityKmh) {
  if (severityKmh >= 220) return 'Super Typhoon';
  if (severityKmh >= 150) return 'Typhoon';
  if (severityKmh >= 100) return 'Severe Tropical Storm';
  if (severityKmh >= 62)  return 'Tropical Storm';
  return 'Tropical Depression';
}

async function fetchGdacsTrack(eventId, episodeId) {
  try {
    const geoUrl = `https://www.gdacs.org/contentdata/resources/TC/${eventId}/geojson_${eventId}_${episodeId}.geojson`;
    const res = await fetch(geoUrl, { next: { revalidate: 900 } });
    if (!res.ok) return [];

    const geoJson = await res.json();

    // The GeoJSON contains LineString features for the track
    const track = [];
    for (const feature of geoJson.features || []) {
      const geom = feature.geometry;
      if (!geom) continue;

      if (geom.type === 'Point') {
        const [lon, lat] = geom.coordinates;
        const props = feature.properties || {};
        track.push({
          lat,
          lon,
          time: props.trackdate || props.datetime || 'Forecast',
        });
      } else if (geom.type === 'LineString') {
        geom.coordinates.forEach(([lon, lat], i) => {
          track.push({ lat, lon, time: i === 0 ? 'Now' : `+${i * 12}h` });
        });
      }
    }

    // Deduplicate and keep max 6 points for display clarity
    return track.slice(0, 6);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // Step 1: Fetch the live GDACS RSS feed for current tropical cyclones
    const rssUrl = 'https://www.gdacs.org/xml/rss.xml';
    const rssRes = await fetch(rssUrl, { next: { revalidate: 900 } });
    if (!rssRes.ok) throw new Error(`GDACS RSS fetch failed: ${rssRes.status}`);

    const rssText = await rssRes.text();

    // Step 2: Parse TC items from XML using regex (no XML parser needed in edge)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const activeCyclones = [];
    let match;

    while ((match = itemRegex.exec(rssText)) !== null) {
      const itemXml = match[1];

      // Only process Tropical Cyclone events
      const eventType = (itemXml.match(/<gdacs:eventtype>(.*?)<\/gdacs:eventtype>/) || [])[1];
      if (eventType !== 'TC') continue;

      // Only process currently active events
      const isCurrent = (itemXml.match(/<gdacs:iscurrent>(.*?)<\/gdacs:iscurrent>/) || [])[1];
      if (isCurrent !== 'true') continue;

      // Get coordinates
      const lat = parseFloat((itemXml.match(/<geo:lat>(.*?)<\/geo:lat>/) || [])[1] || '0');
      const lon = parseFloat((itemXml.match(/<geo:long>(.*?)<\/geo:long>/) || [])[1] || '0');

      // Filter to Western North Pacific basin (PAGASA monitoring area)
      if (!isInWesternPacific(lat, lon)) continue;

      const eventName = (itemXml.match(/<gdacs:eventname>(.*?)<\/gdacs:eventname>/) || [])[1] || 'Unknown';
      const eventId   = (itemXml.match(/<gdacs:eventid>(.*?)<\/gdacs:eventid>/) || [])[1] || '';
      const episodeId = (itemXml.match(/<gdacs:episodeid>(.*?)<\/gdacs:episodeid>/) || [])[1] || '1';
      const severityVal = parseFloat((itemXml.match(/<gdacs:severity[^>]*value="([^"]*)"/) || [])[1] || '0');
      const severityText = (itemXml.match(/<gdacs:severity[^>]*>(.*?)<\/gdacs:severity>/) || [])[1] || '';
      const alertLevel = (itemXml.match(/<gdacs:alertlevel>(.*?)<\/gdacs:alertlevel>/) || [])[1] || 'Green';

      const category = mapSeverityToCategory(severityVal);

      // Step 3: Fetch the forecast track from the GeoJSON resource
      const projectedPath = await fetchGdacsTrack(eventId, episodeId);

      // If no track from GeoJSON, just use current position
      const finalPath = projectedPath.length > 0
        ? projectedPath
        : [{ lat, lon, time: 'Now' }];

      // Ensure the first point is labelled "Now"
      if (finalPath.length > 0) finalPath[0].time = 'Now';

      activeCyclones.push({
        name: eventName.replace(/-\d+$/, ''), // strip year suffix e.g. "HAGUPIT-26" → "HAGUPIT"
        internationalName: eventName,
        category,
        alertLevel,
        currentLocation: { lat, lon },
        windSpeedKmh: Math.round(severityVal),
        pressureHpa: null, // not provided by GDACS RSS
        projectedPath: finalPath,
        gdacsEventId: eventId,
        sourceUrl: `https://www.gdacs.org/report.aspx?eventtype=TC&eventid=${eventId}`,
        signals: {}, // PAGASA-specific signals not available from GDACS
      });
    }

    return NextResponse.json({
      activeCyclones,
      rainfallAdvisories: [],
      source: 'GDACS / JTWC',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('PAGASA/GDACS API Error:', error);

    // Graceful fallback — empty state triggers the "no active typhoon" toast
    return NextResponse.json({
      activeCyclones: [],
      rainfallAdvisories: [],
      error: 'Failed to fetch live cyclone data from GDACS.',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
