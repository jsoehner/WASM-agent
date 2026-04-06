"/**
 * Search Tool Implementation
 * 
 * This module provides web search functionality using DuckDuckGo/Bing APIs.
 * It can be called from WASM module or directly from JavaScript.
 */

/**
 * Search using DuckDuckGo
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<SearchResult[]>} - Search results
 */
export async function search(query, options = {}) {
  const {
    maxResults = 10,
    safeSearch = 'Moderate',
    limit = 10
  } = options;

  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&ko=${limit}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'WasmAgent/1.0'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract search results from HTML
    const results = extractResults(html);
    
    return results.slice(0, maxResults);
  } catch (error) {
    console.error('[SearchTool] DuckDuckGo search error:', error);
    
    // Fallback to Bing if DuckDuckGo fails
    return await searchWithBing(query, maxResults);
  }
}

/**
 * Search using Bing API
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum results to return
 * @returns {Promise<SearchResult[]>} - Search results
 */
async function searchWithBing(query, maxResults) {
  try {
    // Note: Requires Bing API key for production use
    const url = 'https://api.bing.microsoft.com/v7.0/search';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY || '',
        'Accept': 'application/json'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Bing search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.value.map(result => ({
      title: result.name,
      url: result.url,
      description: result.snippet,
      domain: new URL(result.url).hostname
    }));
  } catch (error) {
    console.error('[SearchTool] Bing search error:', error);
    return [];
  }
}

/**
 * Extract search results from HTML
 * @param {string} html - HTML response
 * @returns {SearchResult[]} - Extracted results
 */
function extractResults(html) {
  const results = [];
  
  // Simple regex-based extraction for demo
  // In production, use a proper HTML parser
  const resultRegex = /<a[^>]+>([^<]+)<\/a>.*?href=["']([^"']+)"[\s\S]{100,}([\s\S]{0,300})</g;
  
  let match;
  while ((match = resultRegex.exec(html)) !== null) {
    results.push({
      title: match[1],
      url: match[2],
      description: match[3] || '',
      domain: ''
    });
  }
  
  return results;
}

/**
 * Search with Google Custom Search API (optional)
 * @param {string} query - Search query
 * @param {Object} config - API configuration
 * @returns {Promise<SearchResult[]>} - Search results
 */
export async function searchGoogle(query, config) {
  const { apiKey, cx } = config;
  
  if (!apiKey || !cx) {
    throw new Error('Google Custom Search API not configured');
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WasmAgent/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Google search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.items.map(item => ({
      title: item.title,
      url: item.link,
      description: item.snippet,
      domain: new URL(item.link).hostname
    }));
  } catch (error) {
    console.error('[SearchTool] Google search error:', error);
    return [];
  }
}

/**
 * Search Wikipedia
 * @param {string} query - Search query
 * @returns {Promise<Object>} - Wikipedia result or error
 */
export async function searchWikipedia(query) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WasmAgent/1.0'
      }
    });

    if (!response.ok) {
      throw new Error('Wikipedia page not found');
    }

    const data = await response.json();
    
    return {
      title: data.title,
      url: `https://en.wikipedia.org/wiki/${data.title.replace(/\s+/g, '_')}`,
      description: data.extract || '',
      domain: 'wikipedia.org',
      imageUrl: data.thumbnail?.source || null
    };
  } catch (error) {
    console.error('[SearchTool] Wikipedia search error:', error);
    return null;
  }
}

/**
 * Search multiple sources
 * @param {string} query - Search query
 * @param {Object} options - Options for each source
 * @returns {Promise<SearchResult[]>} - Combined results
 */
export async function multiSourceSearch(query, options = {}) {
  const { useWikipedia = false, useGoogle = false } = options;
  
  const results = [];
  
  // Add DuckDuckGo results
  const ddgResults = await search(query, options);
  results.push(...ddgResults);
  
  // Add Wikipedia if requested
  if (useWikipedia) {
    const wikiResult = await searchWikipedia(query);
    if (wikiResult) {
      results.push(wikiResult);
    }
  }
  
  // Add Google if configured
  if (useGoogle && options.google) {
    const googleResults = await searchGoogle(query, options.google);
    results.push(...googleResults);
  }
  
  // Deduplicate by URL
  const seenUrls = new Set();
  return results.filter(result => {
    if (!seenUrls.has(result.url)) {
      seenUrls.add(result.url);
      return true;
    }
    return false;
  }).slice(0, 20);
}

/**
 * Create WASM search handler
 * This function creates a function that can be exposed to WASM
 */
export function createSearchHandler() {
  return async (query, options) => {
    try {
      const results = await multiSourceSearch(query, options);
      
      // Log results (WASM can send back via bridge)
      console.log('[WasmSearch] Results found:', results.length);
      
      return results.map(r => ({
        title: r.title,
        url: r.url,
        description: r.description,
        domain: r.domain
      }));
    } catch (error) {
      console.error('[WasmSearch] Error:', error);
      return [];
    }
  };
}

/**
 * Export all search tools
 */
export {
  search,
  searchWithBing,
  searchGoogle,
  searchWikipedia,
  multiSourceSearch,
  createSearchHandler
};"