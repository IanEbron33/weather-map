import { NextResponse } from 'next/server';

// Cache live data for 15 minutes on Vercel's edge network
export const revalidate = 900;

// Western North Pacific basin monitoring area
// Covers 0°N-40°N, 100°E-180°E
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

  try {
    const geoUrl = `https://www.gdacs.org/contentdata/resources/TC/${eventId}/geojson_${eventId}_${episodeId}.geojson`;
    const res = await fetch(geoUrl, { 
      next: { revalidate: 1800 },
      signal: controller.signal
    });
    if (!res.ok) return [];

    const geoJson = await res.json();
    let trackPoints = [];
    const now = Date.now();
    const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

    for (const feature of geoJson.features || []) {
      const geom = feature.geometry;
      if (!geom || geom.type !== 'Point') continue;

      const props = feature.properties || {};
      const [lon, lat] = geom.coordinates;
      
      // Filter by source to avoid "braiding" multiple models
      // We prioritize JTWC or the first major source found
      const source = (props.source || props.model || '').toUpperCase();
      if (source && source !== 'JTWC' && source !== 'GDACS') {
        // If we have JTWC data, skip other sources like 'ENSEMBLE' or 'ECM'
        // to keep the line single and clean.
        if (geoJson.features.some(f => (f.properties.source||'').toUpperCase() === 'JTWC')) {
           continue;
        }
      }

      let timeStr = props.trackdate || props.datetime || props.validity || '';
      if (!timeStr) continue;

      if (timeStr.includes('/') && timeStr.split('/').length === 3) {
        const parts = timeStr.split(' ');
        const dateParts = parts[0].split('/');
        timeStr = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}${parts[1] ? 'T' + parts[1] : ''}`;
      }

      const timestamp = new Date(timeStr).getTime();
      if (isNaN(timestamp)) continue;
      if (Math.abs(now - timestamp) > TEN_DAYS_MS) continue;

      trackPoints.push({
        lat,
        lon,
        time: timeStr,
        timestamp,
        source,
        isForecast: props.isforecast === 'true' || props.isforecast === true || !!props.validity
      });
    }

    // Sort chronologically
    trackPoints.sort((a, b) => a.timestamp - b.timestamp);

    // Final "Single Path" Filter: 
    // 1. Group by hour to ensure no two points are within 1 hour of each other
    // 2. Remove duplicate coordinates
    const cleanPath = [];
    const seenHours = new Set();

    for (const pt of trackPoints) {
      const hourKey = Math.floor(pt.timestamp / (3600 * 1000));
      
      if (!seenHours.has(hourKey)) {
        // Also ensure we don't have exact coordinate duplicates
        const isDuplicateCoord = cleanPath.some(cp => cp.lat === pt.lat && cp.lon === pt.lon);
        
        if (!isDuplicateCoord) {
          cleanPath.push(pt);
          seenHours.add(hourKey);
        }
      }
    }

    return cleanPath;
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s total limit

  try {
    const rssUrl = 'https://www.gdacs.org/xml/rss.xml';
    const rssRes = await fetch(rssUrl, { 
      next: { revalidate: 1800 },
      signal: controller.signal 
    });
    
    if (!rssRes.ok) throw new Error(`GDACS fetch failed: ${rssRes.status}`);
    const rssText = await rssRes.text();

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const activeCyclones = [];
    let match;

    while ((match = itemRegex.exec(rssText)) !== null) {
      const itemXml = match[1];

      const eventType = (itemXml.match(/<gdacs:eventtype>(.*?)<\/gdacs:eventtype>/) || [])[1];
      if (eventType !== 'TC') continue;

      const isCurrent = (itemXml.match(/<gdacs:iscurrent>(.*?)<\/gdacs:iscurrent>/) || [])[1];
      if (isCurrent !== 'true') continue;

      const lat = parseFloat((itemXml.match(/<geo:lat>(.*?)<\/geo:lat>/) || [])[1] || '0');
      const lon = parseFloat((itemXml.match(/<geo:long>(.*?)<\/geo:long>/) || [])[1] || '0');

      if (!isInWesternPacific(lat, lon)) continue;

      const eventName = (itemXml.match(/<gdacs:eventname>(.*?)<\/gdacs:eventname>/) || [])[1] || 'Unknown';
      const eventId   = (itemXml.match(/<gdacs:eventid>(.*?)<\/gdacs:eventid>/) || [])[1] || '';
      const episodeId = (itemXml.match(/<gdacs:episodeid>(.*?)<\/gdacs:episodeid>/) || [])[1] || '1';
      const severityVal = parseFloat((itemXml.match(/<gdacs:severity[^>]*value="([^"]*)"/) || [])[1] || '0');
      const alertLevel = (itemXml.match(/<gdacs:alertlevel>(.*?)<\/gdacs:alertlevel>/) || [])[1] || 'Green';

      const category = mapSeverityToCategory(severityVal);
      let projectedPath = await fetchGdacsTrack(eventId, episodeId);

      // Find the point in the track closest to 'Now' (RSS time)
      // or simply add the RSS point to the track if it's missing.
      const nowPoint = { 
        lat, 
        lon, 
        time: 'Now', 
        timestamp: Date.now(), 
        isCurrent: true 
      };

      // Merge: Keep historical points before now, add now, then forecast points
      const history = projectedPath.filter(p => !p.isForecast);
      const forecast = projectedPath.filter(p => p.isForecast);
      
      const finalPath = [...history, nowPoint, ...forecast];

      activeCyclones.push({
        name: eventName.replace(/-\d+$/, ''),
        internationalName: eventName,
        category,
        alertLevel,
        currentLocation: { lat, lon },
        windSpeedKmh: Math.round(severityVal),
        projectedPath: finalPath,
        gdacsEventId: eventId,
        sourceUrl: `https://www.gdacs.org/report.aspx?eventtype=TC&eventid=${eventId}`,
      });
    }

    return NextResponse.json({ activeCyclones });
  } catch (err) {
    console.error('[Typhoon API Error]:', err.message);
    return NextResponse.json({ activeCyclones: [], error: err.message }, { status: 200 });
  } finally {
    clearTimeout(timeoutId);
  }
}
