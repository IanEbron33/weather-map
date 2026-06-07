import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  if (severityKmh >= 62) return 'Tropical Storm';
  if (severityKmh >= 62) return 'Tropical Storm';
  return 'Tropical Depression';
}

/**
 * Calculate distance between two lat/lon points in km (Haversine formula)
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Extract the local name from a PAGASA title like 'Tropical Depression "Caloy"'
 */
function extractLocalName(title) {
  if (!title) return '';
  const match = title.match(/[""\u201C\u201D]([^""\u201C\u201D]+)[""\u201C\u201D]/);
  return match ? match[1] : title;
}

function parseWindKmh(text = '') {
  const match = String(text).match(/(\d+(?:\.\d+)?)\s*km\/h/i);
  return match ? Math.round(Number(match[1])) : null;
}

function inferCategoryFromPagasaBulletin(bulletin = {}) {
  const title = `${bulletin.title || ''} ${bulletin.summary || ''}`.toLowerCase();
  const windKmh = parseWindKmh(bulletin.maxWinds) || 0;

  if (title.includes('super typhoon') || windKmh >= 185) return 'Super Typhoon';
  if (title.includes('typhoon') || windKmh >= 118) return 'Typhoon';
  if (title.includes('severe tropical storm') || windKmh >= 89) return 'Severe Tropical Storm';
  if (title.includes('tropical storm') || windKmh >= 62) return 'Tropical Storm';
  return 'Tropical Depression';
}

function buildPagasaFallbackCyclone(bulletin) {
  if (!bulletin?.coordinates) return null;

  const coords = bulletin.coordinates;
  const localName = extractLocalName(bulletin.title);
  const windKmh = parseWindKmh(bulletin.maxWinds) || 0;

  return {
    name: localName || bulletin.title || 'PAGASA Cyclone',
    internationalName: bulletin.title || localName || 'PAGASA Cyclone',
    category: inferCategoryFromPagasaBulletin(bulletin),
    alertLevel: 'PAGASA',
    currentLocation: { lat: coords.lat, lon: coords.lon },
    windSpeedKmh: windKmh,
    projectedPath: [{
      lat: coords.lat,
      lon: coords.lon,
      time: 'Now',
      timestamp: Date.now(),
      isCurrent: true,
    }],
    gdacsEventId: null,
    sourceUrl: 'https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin',
    pagasa: {
      localName,
      title: bulletin.title || '',
      issuedAt: bulletin.issuedAt || '',
      summary: bulletin.summary || '',
      maxWinds: bulletin.maxWinds || '',
      gustiness: bulletin.gustiness || '',
      movement: bulletin.movement || '',
      currentPosition: bulletin.currentPosition || '',
      trackOutlook: bulletin.trackOutlook || '',
      forecastPositions: bulletin.forecastPositions || [],
      trackImageUrl: bulletin.trackImageUrl || '',
      bulletinPdfs: bulletin.bulletinPdfs || [],
      coordinates: bulletin.coordinates || null,
      matchDistance: 0,
    },
  };
}

function hasVerifiedActivePagasaBulletin(pagasaData) {
  const bulletins = Array.isArray(pagasaData?.bulletins) ? pagasaData.bulletins : [];
  return Boolean(
    pagasaData &&
    !pagasaData.error &&
    !pagasaData.stale &&
    pagasaData.hasActiveCyclone === true &&
    bulletins.length > 0
  );
}

/**
 * Match PAGASA bulletins to GDACS cyclones by coordinate proximity.
 */
function matchPagasaToGdacs(gdacsCyclones, pagasaBulletins) {
  if (!pagasaBulletins || pagasaBulletins.length === 0) return gdacsCyclones;

  return gdacsCyclones.map(cyclone => {
    let bestMatch = null;
    let bestDist = Infinity;

    for (const bulletin of pagasaBulletins) {
      if (!bulletin.coordinates) continue;
      const dist = haversineKm(
        cyclone.currentLocation.lat, cyclone.currentLocation.lon,
        bulletin.coordinates.lat, bulletin.coordinates.lon
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = bulletin;
      }
    }

    if (bestMatch && bestDist < 500) {
      return {
        ...cyclone,
        pagasa: {
          localName: extractLocalName(bestMatch.title),
          title: bestMatch.title,
          issuedAt: bestMatch.issuedAt,
          summary: bestMatch.summary,
          maxWinds: bestMatch.maxWinds,
          gustiness: bestMatch.gustiness,
          movement: bestMatch.movement,
          currentPosition: bestMatch.currentPosition,
          trackOutlook: bestMatch.trackOutlook,
          forecastPositions: bestMatch.forecastPositions || [],
          trackImageUrl: bestMatch.trackImageUrl,
          bulletinPdfs: bestMatch.bulletinPdfs || [],
          coordinates: bestMatch.coordinates,
          matchDistance: Math.round(bestDist),
        },
      };
    }

    return cyclone;
  });
}

async function fetchGdacsTrack(eventId, episodeId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

  try {
    const geoUrl = `https://www.gdacs.org/contentdata/resources/TC/${eventId}/geojson_${eventId}_${episodeId}.geojson`;
    const res = await fetch(geoUrl, {
      cache: 'no-store',
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
        if (geoJson.features.some(f => (f.properties.source || '').toUpperCase() === 'JTWC')) {
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

export async function GET(request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s total limit

  try {
    const rssUrl = 'https://www.gdacs.org/xml/rss.xml';
    
    // Fetch both in parallel
    const [pagasaSettled, gdacsSettled] = await Promise.allSettled([
      fetch(new URL('/api/pagasa-bulletin', request.url), {
        cache: 'no-store',
        signal: controller.signal
      }),
      fetch(rssUrl, {
        cache: 'no-store',
        signal: controller.signal
      })
    ]);

    // Parse PAGASA data
    let pagasaData = { bulletins: [], hasBulletin: false, error: null };
    if (pagasaSettled.status === 'fulfilled' && pagasaSettled.value.ok) {
      try {
        pagasaData = await pagasaSettled.value.json();
      } catch (err) {
        pagasaData.error = `Failed to parse PAGASA: ${err.message}`;
      }
    } else {
      const reason = pagasaSettled.status === 'rejected' ? pagasaSettled.reason?.message : `Status: ${pagasaSettled.value?.status}`;
      pagasaData.error = `PAGASA fetch failed: ${reason}`;
    }

    const pagasaBulletins = pagasaData.bulletins || [];
    const hasActivePagasa = hasVerifiedActivePagasaBulletin(pagasaData);

    // Parse GDACS data
    let activeCyclones = [];
    let gdacsError = null;

    if (gdacsSettled.status === 'fulfilled' && gdacsSettled.value.ok) {
      try {
        const rssText = await gdacsSettled.value.text();

        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
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
          const eventId = (itemXml.match(/<gdacs:eventid>(.*?)<\/gdacs:eventid>/) || [])[1] || '';
          const episodeId = (itemXml.match(/<gdacs:episodeid>(.*?)<\/gdacs:episodeid>/) || [])[1] || '1';
          const severityVal = parseFloat((itemXml.match(/<gdacs:severity[^>]*value="([^"]*)"/) || [])[1] || '0');
          const alertLevel = (itemXml.match(/<gdacs:alertlevel>(.*?)<\/gdacs:alertlevel>/) || [])[1] || 'Green';

          const category = mapSeverityToCategory(severityVal);
          let projectedPath = await fetchGdacsTrack(eventId, episodeId);

          const nowPoint = {
            lat,
            lon,
            time: 'Now',
            timestamp: Date.now(),
            isCurrent: true
          };

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
      } catch (err) {
        gdacsError = `Failed to parse GDACS: ${err.message}`;
      }
    } else {
      const reason = gdacsSettled.status === 'rejected' ? gdacsSettled.reason?.message : `Status: ${gdacsSettled.value?.status}`;
      gdacsError = `GDACS fetch failed: ${reason}`;
    }

    // Merge/Enrichment:
    // 1. Enrich GDACS cyclones with PAGASA bulletins if available
    let enrichedCyclones = activeCyclones;
    if (pagasaBulletins.length > 0) {
      enrichedCyclones = matchPagasaToGdacs(activeCyclones, pagasaBulletins);
    }

    // 2. Generate fallback cyclones for PAGASA bulletins that didn't match any GDACS cyclone
    const pagasaFallbackCyclones = pagasaBulletins
      .map(buildPagasaFallbackCyclone)
      .filter(Boolean);

    const matchedFallbackTitles = new Set(
      enrichedCyclones
        .map(cyclone => cyclone.pagasa?.title)
        .filter(Boolean)
    );

    const supplementalCyclones = pagasaFallbackCyclones.filter(
      cyclone => cyclone.pagasa?.title && !matchedFallbackTitles.has(cyclone.pagasa.title)
    );

    const finalCyclones = [...enrichedCyclones, ...supplementalCyclones];

    // Determine final status
    const hasActiveTyphoon = finalCyclones.length > 0;
    const statusMessage = hasActiveTyphoon ? null : (pagasaData.statusMessage || 'There is no active typhoon');

    return NextResponse.json({
      activeCyclones: finalCyclones,
      hasActiveTyphoon,
      statusMessage,
      pagasaSource: pagasaData.source || null,
      pagasaScrapedAt: pagasaData.scrapedAt || null,
      pagasaError: pagasaData.error || null,
      gdacsError,
      source: hasActivePagasa ? 'PAGASA' : 'GDACS',
    });

  } catch (err) {
    console.error('[Typhoon API Error]:', err.message);
    return NextResponse.json({
      activeCyclones: [],
      hasActiveTyphoon: false,
      statusMessage: 'There is no active typhoon',
      error: err.message,
      source: 'GDACS',
    }, { status: 200 });
  } finally {
    clearTimeout(timeoutId);
  }
}
