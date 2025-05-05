// src/components/solid/SearchResults.tsx
import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import ListingCard from './ListingCard';
import type { Listing } from '../../types';
import { searchDirectory } from '@/lib/api/client';

interface SearchResultsProps {
  directoryId: string;
  theme?: string;
}

export default function SearchResults(props: SearchResultsProps) {
  const { directoryId, theme = 'default' } = props;
  
  // State for search
  const [isLoading, setIsLoading] = createSignal(false);
  const [results, setResults] = createSignal<Listing[]>([]);
  const [query, setQuery] = createSignal('');
  const [hasSearched, setHasSearched] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  
  // Initialize search parameters from URL when in browser
  const initializeFromUrl = () => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    
    if (queryParam) {
      setQuery(queryParam);
      performSearch(queryParam);
    }
  };
  
  // Perform search
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await searchDirectory(directoryId, searchQuery);
      
      if (!response.success) {
        throw new Error(response.message || 'Search failed');
      }
      
      setResults(response.results || []);
      setHasSearched(true);
      
      // Update URL with query parameter
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('q', searchQuery);
        window.history.replaceState({}, '', url.toString());
        
        // Update document title to reflect search
        document.title = `Search: ${searchQuery} | Directory`;
        
        // Update search title element if it exists
        const searchTitle = document.getElementById('search-title');
        if (searchTitle) {
          searchTitle.textContent = `Search Results for "${searchQuery}"`;
        }
      }
    } catch (error) {
      console.error('Error performing search:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear search results
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setError(null);
    
    // Remove query from URL
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      window.history.replaceState({}, '', url.toString());
      
      // Reset title
      document.title = 'Search | Directory';
      
      // Reset search title element
      const searchTitle = document.getElementById('search-title');
      if (searchTitle) {
        searchTitle.textContent = 'Search Listings';
      }
    }
  };
  
  // Initialize on mount
  onMount(() => {
    initializeFromUrl();
  });

  return (
    <div class="search-results">
      <Show when={hasSearched()}>
        <div class="search-info">
          <p class="results-count">
            {results().length === 0 
              ? 'No results found' 
              : `Found ${results().length} result${results().length !== 1 ? 's' : ''}`}
          </p>
          <button class="clear-search" onClick={clearSearch}>
            Clear search
          </button>
        </div>
      </Show>
      
      <Show when={!hasSearched()}>
        <div class="no-query-message">
          <div class="no-results">
            <div>
              <p>Enter a search term above to find listings.</p>
              <p>You can search by name, description, location, or category.</p>
            </div>
          </div>
        </div>
      </Show>
      
      <Show when={hasSearched() && results().length > 0}>
        <div class="listing-grid">
          <For each={results()}>
            {(listing) => (
              <ListingCard
                listing={listing.data}
                url={`/${directoryId}/${listing.slug.replace(`${directoryId}/`, '')}`}
                theme={theme}
              />
            )}
          </For>
        </div>
      </Show>
      
      <Show when={hasSearched() && results().length === 0 && !isLoading()}>
        <div class="no-results-message">
          <div class="no-results">
            <div>
              <p>No listings found matching your search.</p>
              <p>Try using different keywords or browse by category.</p>
              <a href={`/${directoryId}/`} class="back-link">Back to homepage</a>
            </div>
          </div>
        </div>
      </Show>
      
      <Show when={isLoading()}>
        <div class="loading-indicator">
          <div class="spinner"></div>
          <p>Searching...</p>
        </div>
      </Show>
      
      <Show when={error()}>
        <div class="error-message">
          <p>Error: {error()}</p>
          <button onClick={() => performSearch(query())}>
            Try Again
          </button>
        </div>
      </Show>
    </div>
  );
}