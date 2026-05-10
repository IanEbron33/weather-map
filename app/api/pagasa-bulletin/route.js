import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Cache the bulletin for 30 minutes (1800 seconds)
export const revalidate = 1800;

const PAGASA_BULLETIN_URL = 'https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin';
const PAGASA_BASE_URL = 'https://www.pagasa.dost.gov.ph';

// In-memory cache to avoid hammering PAGASA
let cache = { data: null, timestamp: 0 };
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function GET() {
  // Serve from cache if fresh
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < CACHE_DURATION_MS) {
    return NextResponse.json(cache.data);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(PAGASA_BULLETIN_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!res.ok) {
      throw new Error(`PAGASA fetch failed: ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const bulletins = [];

    // PAGASA uses tab panels for each active cyclone bulletin
    // Each bulletin section has an id like "tcwb-1", "tcwb-2", etc.
    // The tabs are links with href="#tcwb-1", etc.

    // First, collect the tab labels (cyclone names with links)
    const tabNames = [];
    $('a[href*="tcwb"]').each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr('href') || '';
      if (name && !tabNames.some(t => t.name === name)) {
        tabNames.push({ name, href });
      }
    });

    // Now parse the bulletin content sections
    // The actual bulletin content is in elements with id "tcwb-1", "tcwb-2", etc.
    // Each section contains the full bulletin text
    const sectionIds = [];
    $('[id^="tcwb"]').each((_, el) => {
      sectionIds.push($(el).attr('id'));
    });

    // If no specific sections found, try to parse the whole page body content
    // The PAGASA bulletin content typically has specific structure:
    // - h5 tags for issued time and summary
    // - ul/li for hazards
    // - img for track map
    // - links to PDF bulletins

    // Strategy: Parse the main content area
    const mainContent = $('[id^="tcwb"]').length > 0 
      ? $('[id^="tcwb"]').first()
      : $('.field-content, .content-bulletin, .bulletin-content, #block-system-main .content').first();

    // If we found specific bulletin sections
    if (sectionIds.length > 0) {
      for (const sectionId of sectionIds) {
        const section = $(`#${sectionId}`);
        const bulletin = parseBulletinSection($, section, tabNames);
        if (bulletin && bulletin.title) {
          bulletins.push(bulletin);
        }
      }
    }
    
    // If no sections found, try parsing the entire page content
    if (bulletins.length === 0) {
      const fallback = parseFallbackBulletin($);
      if (fallback && fallback.title) {
        bulletins.push(fallback);
      }
    }

    const result = {
      bulletins,
      scrapedAt: new Date().toISOString(),
      source: PAGASA_BULLETIN_URL,
      hasBulletin: bulletins.length > 0,
    };

    cache = { data: result, timestamp: now };
    return NextResponse.json(result);

  } catch (err) {
    console.error('[PAGASA Scraper Error]:', err.message);

    // Return cached data if available, even if stale
    if (cache.data) {
      return NextResponse.json({
        ...cache.data,
        stale: true,
        error: err.message,
      });
    }

    return NextResponse.json({
      bulletins: [],
      scrapedAt: new Date().toISOString(),
      source: PAGASA_BULLETIN_URL,
      hasBulletin: false,
      error: err.message,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse a specific bulletin section (when the page has tab-based structure)
 */
function parseBulletinSection($, section, tabNames) {
  const bulletin = {
    title: '',
    issuedAt: '',
    validUntil: '',
    summary: '',
    hazardsLand: [],
    hazardsCoastal: [],
    trackOutlook: '',
    currentPosition: '',
    movement: '',
    maxWinds: '',
    gustiness: '',
    forecastPositions: [],
    trackImageUrl: '',
    bulletinPdfs: [],
    coordinates: null,
  };

  // Title: Look for the cyclone name
  const sectionText = section.text();
  
  // Try to find tab name matching this section
  const sectionId = section.attr('id') || '';
  const matchingTab = tabNames.find(t => t.href?.includes(sectionId));
  if (matchingTab) {
    bulletin.title = matchingTab.name;
  }

  // Find h2/h3/h5 headings within the section
  section.find('h2, h3, h4, h5').each((_, el) => {
    const text = $(el).text().trim();
    
    if (!bulletin.title && (text.includes('Tropical') || text.includes('Typhoon') || text.includes('Storm'))) {
      bulletin.title = text;
    }
    
    if (text.includes('Issued at')) {
      bulletin.issuedAt = text.replace(/^Issued at\s*/i, '').trim();
    }
    
    if (text.includes('Valid for broadcast')) {
      bulletin.validUntil = text.replace(/^\(Valid for broadcast until/i, '').replace(/\)$/, '').trim();
    }

    // The summary headline (e.g., "CALOY CONTINUES TO WEAKEN...")
    const upperText = text.toUpperCase();
    if (upperText.includes('"') && (upperText.includes('WEAKEN') || upperText.includes('MOVES') || 
        upperText.includes('INTENSIF') || upperText.includes('MAKES LANDFALL') ||
        upperText.includes('ENTERS') || upperText.includes('DEVELOP'))) {
      bulletin.summary = text.replace(/^"|"$/g, '').trim();
    }
  });

  // Track image: look for img inside the section
  section.find('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src && (src.includes('track') || src.includes('TC') || src.includes('cyclone') || 
        src.includes('typhoon') || src.includes('.png') || src.includes('.jpg'))) {
      bulletin.trackImageUrl = src.startsWith('http') ? src : PAGASA_BASE_URL + src;
    }
  });

  // PDF bulletins
  section.find('a[href*=".pdf"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const label = $(el).text().trim();
    if (href) {
      bulletin.bulletinPdfs.push({
        label: label || 'Bulletin PDF',
        url: href.startsWith('http') ? href : PAGASA_BASE_URL + href,
      });
    }
  });

  // Parse text content for track info and coordinates
  parseTextContent(sectionText, bulletin);

  return bulletin;
}

/**
 * Fallback parsing when no specific sections are found
 */
function parseFallbackBulletin($) {
  const bulletin = {
    title: '',
    issuedAt: '',
    validUntil: '',
    summary: '',
    hazardsLand: [],
    hazardsCoastal: [],
    trackOutlook: '',
    currentPosition: '',
    movement: '',
    maxWinds: '',
    gustiness: '',
    forecastPositions: [],
    trackImageUrl: '',
    bulletinPdfs: [],
    coordinates: null,
  };

  const body = $('body');
  const fullText = body.text();

  // Try to find the bulletin title from the page
  $('h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('Tropical') || text.includes('Typhoon') || text.includes('Storm')) {
      if (!bulletin.title || text.length < bulletin.title.length) {
        bulletin.title = text;
      }
    }
  });

  // Find "Issued at" text
  $('h5').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('Issued at')) {
      bulletin.issuedAt = text.replace(/^Issued at\s*/i, '').trim();
    }
    if (text.includes('Valid for broadcast')) {
      bulletin.validUntil = text.replace(/^\(Valid for broadcast until/i, '').replace(/\)$/, '').trim();
    }
  });

  // Look for track images
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || '';
    if ((alt.toLowerCase().includes('track') || alt.toLowerCase().includes('forecast') ||
         src.includes('track') || src.includes('TC_') || src.includes('cyclone')) &&
        (src.endsWith('.png') || src.endsWith('.jpg') || src.endsWith('.jpeg') || src.endsWith('.gif'))) {
      bulletin.trackImageUrl = src.startsWith('http') ? src : PAGASA_BASE_URL + src;
    }
  });

  // If no track image found by keyword, look for any large image in the bulletin area
  if (!bulletin.trackImageUrl) {
    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (src && src.includes('pubfiles.pagasa') && !bulletin.trackImageUrl) {
        bulletin.trackImageUrl = src.startsWith('http') ? src : PAGASA_BASE_URL + src;
      }
    });
  }

  // PDF bulletins
  $('a[href*=".pdf"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const label = $(el).text().trim();
    if (href && (href.includes('TCB') || href.includes('bulletin') || href.includes('caloy') || 
        href.includes('typhoon'))) {
      bulletin.bulletinPdfs.push({
        label: label || 'Bulletin PDF',
        url: href.startsWith('http') ? href : PAGASA_BASE_URL + href,
      });
    }
  });

  // Deduplicate PDFs
  const seenPdfs = new Set();
  bulletin.bulletinPdfs = bulletin.bulletinPdfs.filter(pdf => {
    if (seenPdfs.has(pdf.url)) return false;
    seenPdfs.add(pdf.url);
    return true;
  });

  parseTextContent(fullText, bulletin);

  return bulletin;
}

/**
 * Extract structured data from raw text content
 */
function parseTextContent(text, bulletin) {
  // Extract coordinates like "10.1 °N, 131.7 °E" or "(10.1°N, 131.7°E)"
  const coordRegex = /(\d+\.?\d*)\s*°?\s*N\s*,\s*(\d+\.?\d*)\s*°?\s*E/gi;
  const coordMatch = coordRegex.exec(text);
  if (coordMatch) {
    bulletin.coordinates = {
      lat: parseFloat(coordMatch[1]),
      lon: parseFloat(coordMatch[2]),
    };
  }

  // Extract "Moving [direction] at [speed]"
  const moveRegex = /Moving\s+(.+?)\s+at\s+(\d+\s*km\/h)/i;
  const moveMatch = moveRegex.exec(text);
  if (moveMatch) {
    bulletin.movement = `Moving ${moveMatch[1]} at ${moveMatch[2]}`;
  }

  // Extract wind speed
  const windRegex = /Maximum sustained winds of\s+(\d+\s*km\/h)/i;
  const windMatch = windRegex.exec(text);
  if (windMatch) {
    bulletin.maxWinds = windMatch[1];
  }

  // Extract gustiness
  const gustRegex = /gustiness of up to\s+(\d+\s*km\/h)/i;
  const gustMatch = gustRegex.exec(text);
  if (gustMatch) {
    bulletin.gustiness = gustMatch[1];
  }

  // Extract current position description
  const posRegex = /center of .+? was estimated.+?(at|based).+?(\d+ km .+)/i;
  const posMatch = posRegex.exec(text);
  if (posMatch) {
    bulletin.currentPosition = posMatch[2].split(/[(\n]/)[0].trim();
  }

  // Extract summary headline if not already found
  if (!bulletin.summary) {
    // Look for quoted text with common weather verbs
    const summaryRegex = /[""](.+?CONTINUES|.+?WEAKENS?|.+?MOVES?|.+?INTENSIF|.+?LANDFALL|.+?ENTERS?|.+?DEVELOP)/i;
    const summaryMatch = summaryRegex.exec(text);
    if (summaryMatch) {
      // Get the full sentence
      const startIdx = text.indexOf(summaryMatch[0]);
      const endIdx = text.indexOf('.', startIdx);
      if (endIdx > startIdx) {
        bulletin.summary = text.substring(startIdx, endIdx + 1).replace(/[""\u201C\u201D]/g, '').trim();
      }
    }
  }

  // Extract track outlook text
  const trackRegex = /TRACK AND INTENSITY OUTLOOK[\s\S]*?(?=The center of|FORECAST POSITIONS|$)/i;
  const trackMatch = trackRegex.exec(text);
  if (trackMatch) {
    bulletin.trackOutlook = trackMatch[0]
      .replace('TRACK AND INTENSITY OUTLOOK', '')
      .trim()
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 10)
      .join(' ')
      .substring(0, 500);
  }

  // Extract forecast positions (e.g., "May 11, 2026 02:00 AM - 510 km East of Guiuan")
  const forecastRegex = /(\w+ \d{1,2},\s*\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–]\s*(.+?)(?=\n|$)/gi;
  let fcMatch;
  while ((fcMatch = forecastRegex.exec(text)) !== null) {
    bulletin.forecastPositions.push({
      time: fcMatch[1].trim(),
      position: fcMatch[2].trim(),
    });
  }
}
