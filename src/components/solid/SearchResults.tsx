import ListingCard from './ListingCard';
import { searchState, searchActions } from '../../stores/searchStore';
import { createSignal, onMount, For } from 'solid-js';

interface SearchResultsProps {
  directoryId: string;
  theme?: string;
}

export default function SearchResults(props: SearchResultsProps) {
  const { directoryId, theme = 'default' } = props;
  
  // Local state
  const [isLoading, setIsLoading] = createSignal(false);
  const [results, setResults] = createSignal([]);
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
      // In a real implementation, we'd use the searchActions from the store
      // For simplicity, we'll simulate the API call here
      const response = await fetch(`/api/search?directory=${directoryId}&q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setResults(data.results || []);
      setHasSearched(true);
      
      // Update URL with query parameter
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('q', searchQuery);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (err) {
      console.error('Error performing search:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
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
    }
  };
  
  // Initialize on mount
  onMount(() => {
    initializeFromUrl();
  });

  return (
    <div class="search-results">
      {hasSearched() && (
        <div class="search-info">
          <p class="results-count">
            {results().length === 0 
              ? 'No results found' 
              : `Found ${results().length} result${results().length !== 1 ? 's' : ''}`}
          </p>
          <a href={`/${directoryId}/search`} class="clear-search" onClick={(e) => {
            e.preventDefault();
            clearSearch();
          }}>Clear search</a>
        </div>
      )}
      
      {!hasSearched() && (
        <div class="no-query-message">
          <div class="no-results">
            <div>
              <p>Enter a search term above to find listings.</p>
              <p>You can search by name, description, location, or category.</p>
            </div>
          </div>
        </div>
      )}
      
      {hasSearched() && results().length > 0 && (
        <div class="listing-grid">
          <For each={results()}>
            {(listing: any) => (
              <ListingCard
                listing={listing.data}
                url={`/${directoryId}/${listing.slug.replace(`${directoryId}/`, '')}`}
                theme={theme}
              />
            )}
          </For>
        </div>
      )}
      
      {hasSearched() && results().length === 0 && (
        <div class="no-results-message">
          <div class="no-results">
            <div>
              <p>No listings found matching your search.</p>
              <p>Try using different keywords or browse by category.</p>
              <a href={`/${directoryId}/`} class="back-link">Back to homepage</a>
            </div>
          </div>
        </div>
      )}
      
      {isLoading() && (
        <div class="loading-indicator">
          <div class="spinner"></div>
          <p>Searching...</p>
        </div>
      )}
      
      {error() && (
        <div class="error-message">
          <p>Error: {error()}</p>
          <button onClick={() => performSearch(query())}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}