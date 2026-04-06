/**
 * Search Sub-Agent Implementation
 * 
 * This module provides a search sub-agent that can be instantiated,
 * configured, and used for web search operations via the WASM bridge.
 */

import { search, multiSourceSearch, searchWikipedia } from '../tools/search-tool.js';

/**
 * Search Agent Class
 * 
 * A search sub-agent that can perform web searches using multiple
 * search engines and return consolidated results.
 */
export class SearchAgent {
  /**
   * @param {Object} config - Agent configuration
   * @param {Object} core - WASM core instance
   */
  constructor(config, core) {
    this.config = config || {};
    this.core = core;
    this.state = {
      context: '',
      history: [],
      status: 'idle',
      lastSearch: null,
      resultsCount: 0
    };

    this.tools = {
      search: search,
      multiSourceSearch: multiSourceSearch,
      searchWikipedia: searchWikipedia
    };

    // Set default search engine
    this.searchEngine = config.searchEngine || 'duckduckgo';
    this.maxResults = config.maxResults || 10;
    this.timeout = config.timeout || 15000;
  }

  /**
   * Initialize the search agent
   * @returns {Promise<SearchAgent>} - Initialized agent
   */
  async init() {
    console.log('[SearchAgent] Initializing search agent...');
    
    this.state.status = 'initialized';
    
    // Set up any required resources
    await this.setupResources();
    
    console.log('[SearchAgent] Search agent ready');
    
    return this;
  }

  /**
   * Setup required resources
   */
  async setupResources() {
    // In production, this would:
    // - Setup WebSocket connections
    // - Cache search engines
    // - Initialize search providers
    console.log('[SearchAgent] Resources loaded');
  }

  /**
   * Perform web search
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<SearchResult[]>} - Search results
   */
  async execute(query, options = {}) {
    const {
      maxResults = this.maxResults,
      sources = [],
      safeSearch = 'Moderate',
      useWikipedia = false
    } = options;

    try {
      console.log(`[SearchAgent] Searching for: ${query}`);

      // Update state
      this.state.lastSearch = query;
      this.state.resultsCount = 0;

      let results = [];

      // Add results from main search engine
      if (sources.length > 0) {
        const result = await this.tools[sources[0]](query, {
          maxResults,
          safeSearch,
          timeout: this.timeout
        });

        if (Array.isArray(result)) {
          results.push(...result);
        }

        this.state.resultsCount += results.length;
      } else {
        // Default search
        const result = await search(query, { maxResults, timeout: this.timeout });
        results.push(...result);
        
        this.state.resultsCount += results.length;
      }

      // Add Wikipedia if requested
      if (useWikipedia) {
        const wikiResult = await searchWikipedia(query);
        if (wikiResult) {
          results.push(wikiResult);
          this.state.resultsCount++;
        }
      }

      // Log results
      console.log(`[SearchAgent] Found ${results.length} results`);

      // Send to WASM via bridge
      if (this.core) {
        await this.core.sendToJs({
          type: 'search_results',
          query,
          count: results.length,
          results: results
        });
      }

      return results;

    } catch (error) {
      console.error('[SearchAgent] Search error:', error);
      this.state.status = 'error';
      throw error;
    }
  }

  /**
   * Process search query
   * @param {string} query - Search query
   * @param {Object} context - Context information
   * @returns {Object} - Processing result
   */
  async process(query, context = {}) {
    try {
      console.log('[SearchAgent] Processing query:', query);

      // Analyze query
      const analysis = await this.analyzeQuery(query, context);

      // Execute search
      const results = await this.execute(query, {
        ...analysis.options
      });

      // Format response
      const response = await this.formatResponse(results, analysis, query);

      return {
        query,
        analysis,
        results,
        response
      };

    } catch (error) {
      console.error('[SearchAgent] Process error:', error);
      throw error;
    }
  }

  /**
   * Analyze search query
   * @param {string} query - Query to analyze
   * @param {Object} context - Context
   * @returns {Object} - Analysis
   */
  async analyzeQuery(query, context = {}) {
    // Basic query analysis
    const lowerQuery = query.toLowerCase();
    
    return {
      intent: this.determineIntent(lowerQuery),
      entities: this.extractEntities(query),
      options: this.determineOptions(query)
    };
  }

  /**
   * Determine search intent
   * @param {string} query - Lowercase query
   * @returns {string} - Intent type
   */
  determineIntent(query) {
    // Simple intent detection
    const keywords = {
      definition: ['what', 'define', 'meaning of'],
      information: ['how', 'when', 'where', 'who'],
      news: ['today', 'yesterday', 'last week', 'latest'],
      research: ['best', 'top', 'most', 'review', 'compare']
    };

    for (const [intent, keywords] of Object.entries(keywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return intent;
      }
    }

    return 'general';
  }

  /**
   * Extract entities from query
   * @param {string} query - Query to analyze
   * @returns {Array} - Extracted entities
   */
  extractEntities(query) {
    // Simple entity extraction
    const entities = [];
    
    // Named entities (simplified)
    const patterns = {
      person: /(\b[A-Z][a-z]+\s+[A-Z][a-z]+\b)/g,
      location: /(\b([a-z]+\s+[a-z]+\s+state|city|town|park|road|avenue)\b)/i,
      time: /(\b(today|yesterday|tomorrow|next week|last month|in 202[0-9])\b)/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = query.match(pattern);
      if (matches) {
        entities.push({ type, value: matches[0] });
      }
    }

    return entities;
  }

  /**
   * Determine search options
   * @param {string} query - Query to analyze
   * @returns {Object} - Search options
   */
  determineOptions(query) {
    return {
      maxResults: this.maxResults,
      safeSearch: 'Moderate',
      useWikipedia: query.length > 50
    };
  }

  /**
   * Format search results
   * @param {SearchResult[]} results - Search results
   * @param {Object} analysis - Query analysis
   * @param {string} query - Original query
   * @returns {string} - Formatted response
   */
  async formatResponse(results, analysis, query) {
    if (!results || results.length === 0) {
      return 'No search results found.';
    }

    // Format results as Markdown
    const formatted = results.map((result, index) => {
      let formattedResult = '';
      
      if (result.imageUrl) {
        formattedResult += `![${result.title}](${result.imageUrl})\n\n`;
      }

      formattedResult += `**${index + 1}. ${result.title}**\n`;
      formattedResult += `\n${result.description}\n`;
      formattedResult += `[Read more](${result.url})\n\n`;

      return formattedResult;
    }).join('');

    return formatted;
  }

  /**
   * Update agent configuration
   * @param {Object} config - New configuration
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    
    if (config.maxResults) {
      this.maxResults = config.maxResults;
    }
    
    if (config.timeout) {
      this.timeout = config.timeout;
    }
    
    if (config.searchEngine) {
      this.searchEngine = config.searchEngine;
    }

    console.log('[SearchAgent] Configuration updated');
  }

  /**
   * Clear agent state
   */
  clearState() {
    this.state.history = [];
    this.state.lastSearch = null;
    this.state.resultsCount = 0;
  }

  /**
   * Get agent statistics
   * @returns {Object} - Agent stats
   */
  getStats() {
    return {
      type: 'search',
      status: this.state.status,
      resultsProcessed: this.state.resultsCount,
      lastSearch: this.state.lastSearch,
      config: {
        maxResults: this.maxResults,
        timeout: this.timeout,
        engine: this.searchEngine
      }
    };
  }

  /**
   * Shutdown agent
   */
  async shutdown() {
    console.log('[SearchAgent] Shutting down search agent');
    this.state.status = 'shutdown';
  }
}

/**
 * Factory function to create search agent instance
 * @param {Object} config - Agent configuration
 * @param {Object} core - WASM core instance
 * @returns {Promise<SearchAgent>} - Created agent
 */
export function createSearchAgent(config, core) {
  return new SearchAgent(config, core).init();
}

/**
 * Default export
 */
export default SearchAgent;