/**
 * Fetch Tool Implementation
 * 
 * This module provides HTTP fetching functionality with support for
 * headers, timeouts, retries, and error handling.
 */

/**
 * Fetch URL content
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Response data
 */
export async function fetch(url, options = {}) {
  const {
    timeout = 30000,
    headers = {},
    method = 'GET',
    body = null,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const fetchOptions = {
    method,
    headers: {
      'User-Agent': 'WasmAgent/1.0',
      ...headers
    }
  };

  if (body) {
    if (typeof body === 'string') {
      fetchOptions.body = body;
    } else if (typeof body === 'object') {
      fetchOptions.body = JSON.stringify(body);
      fetchOptions.headers['Content-Type'] = 'application/json';
    }
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Check for successful response
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse response
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        url,
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries())
      };

    } catch (error) {
      // Network error or timeout
      if (error.name === 'AbortError') {
        console.error(`[FetchTool] Timeout after ${timeout}ms`);
      } else {
        console.error(`[FetchTool] Request error:`, error);
      }

      if (attempt < maxRetries) {
        console.log(`[FetchTool] Retrying attempt ${attempt + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      } else {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
}

/**
 * Fetch with streaming support
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {AsyncGenerator<Object>} - Streaming response chunks
 */
export async function* fetchStream(url, options = {}) {
  const { timeout = 30000, headers = {} } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...headers
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Read chunks from response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let chunks = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks += decoder.decode(value, { stream: true });
      
      // Yield complete SSE events
      const sseEvent = parseSSE(chunks);
      if (sseEvent) {
        yield {
          url,
          event: sseEvent.event || 'data',
          data: sseEvent.data
        };
        chunks = ''; // Reset chunks for next event
      }
    }

  } catch (error) {
    console.error('[FetchStream] Error:', error);
    throw error;
  }
}

/**
 * Parse Server-Sent Events (SSE)
 * @param {string} data - Raw SSE data
 * @returns {Object|null} - Parsed event
 */
function parseSSE(data) {
  const events = [];
  const lines = data.split('\n');

  let currentEvent = null;
  let eventId = 'event';

  lines.forEach((line, index) => {
    if (line.startsWith('data:')) {
      const match = line.match(/^data:(\s*(.*))?$/);
      if (match) {
        currentEvent = { data: match[1]?.trim(), id: eventId };
        eventId = 'event';
      }
    } else if (line.startsWith('event:')) {
      const match = line.match(/^event:(\s*(.*))?$/);
      if (match) {
        eventId = match[1]?.trim() || 'message';
      }
    }
  });

  return currentEvent;
}

/**
 * Fetch HTML content with error handling
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<String>} - HTML content
 */
export async function fetchHTML(url, options = {}) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch HTML: ${response.status}`);
  }

  return await response.text();
}

/**
 * Fetch and parse JSON
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - JSON data
 */
export async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetch binary data (images, files, etc.)
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<ArrayBuffer>} - Binary data
 */
export async function fetchBinary(url, options = {}) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch binary data: ${response.status}`);
  }

  return await response.arrayBuffer();
}

/**
 * Create WASM fetch handler
 * This function creates a function that can be exposed to WASM
 */
export function createFetchHandler() {
  return async (url, options) => {
    try {
      const result = await fetch(url, options);
      
      // Log response (WASM can use this)
      console.log('[WasmFetch] Response received:', { url, status: result.status });
      
      return result;
    } catch (error) {
      console.error('[WasmFetch] Error:', error);
      throw error;
    }
  };
}

/**
 * Export all fetch tools
 */
export {
  fetch,
  fetchStream,
  fetchHTML,
  fetchJSON,
  fetchBinary,
  createFetchHandler,
  parseSSE
};"