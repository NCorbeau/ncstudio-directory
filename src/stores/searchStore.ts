// src/stores/searchStore.ts
import { createStore } from 'solid-js/store';
import type { Listing } from '../types';
import { searchListings } from '@/lib/nocodb';

// Initialize the search store
interface SearchState {
  query: string;
  results: Listing[];
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
}

const initialState: SearchState = {
  query: '',
  results: [],
  loading: false,
  error: null,
  hasSearched: false
};

// Create the store
const [searchState, setSearchState] = createStore<SearchState>(initialState);

// Actions for the store
const searchActions = {
  // Initialize with query from URL
  initialize() {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    if (query) {
      setSearchState('query', query);
      this.search(query);
    }
  },
  
  // Set the search query
  setQuery(query: string) {
    setSearchState('query', query);
  },
  
  // Perform search
  async search(query: string, directoryId?: string) {
    if (!query.trim()) {
      setSearchState('results', []);
      setSearchState('hasSearched', false);
      return;
    }
    
    setSearchState('loading', true);
    setSearchState('error', null);
    
    try {
      // Get directory ID from URL if not provided
      let dirId = directoryId;
      if (!dirId && typeof window !== 'undefined') {
        const urlParts = window.location.pathname.split('/');
        dirId = urlParts[1];
      }
      
      if (!dirId) {
        throw new Error('Directory ID is required for search');
      }
      
      // Perform the search using NocoDB
      const response = await searchListings(dirId, query);
      
      if (!response.success) {
        throw new Error(response.error || 'Search failed');
      }
      
      setSearchState('results', response.results || []);
      setSearchState('hasSearched', true);
      
      // Update URL with query parameter
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('q', query);
        window.history.replaceState({}, '', url);
      }
    } catch (error) {
      console.error('Error performing search:', error);
      setSearchState('error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSearchState('loading', false);
    }
  },
  
  // Clear search results
  clearSearch() {
    setSearchState('query', '');
    setSearchState('results', []);
    setSearchState('hasSearched', false);
    setSearchState('error', null);
    
    // Remove query from URL
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      window.history.replaceState({}, '', url);
    }
  }
};

// Export both state and actions
export { searchState, searchActions };