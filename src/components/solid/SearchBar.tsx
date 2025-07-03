import { createSignal, onMount } from 'solid-js';
import type { SearchBarProps } from '../../types';

export default function SearchBar(props: SearchBarProps) {
  const { directoryId, placeholder = "Search...", initialQuery = "" } = props;
  
  const [searchQuery, setSearchQuery] = createSignal(initialQuery);
  
  // Handle search submission
  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (searchQuery().trim()) {
      // Navigate to search page with query
      const url = new URL(`/search`, window.location.origin);
      url.searchParams.set('q', searchQuery().trim());
      window.location.href = url.toString();
    }
  };
  
  // Handle input change
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setSearchQuery(target.value);
  };
  
  // Initialize query from URL on mount
  onMount(() => {
    if (typeof window !== 'undefined') {
      // Check if we're on the search page
      if (window.location.pathname.includes('/search')) {
        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('q');
        if (queryParam) {
          setSearchQuery(queryParam);
        }
      }
    }
  });
  
  return (
    <div class="search-container">
      <form
        action="/search"
        method="get"
        class="search-form"
        onSubmit={handleSubmit}
      >
        <input 
          type="text" 
          name="q" 
          id="search-input"
          placeholder={placeholder}
          autocomplete="off"
          value={searchQuery()}
          onInput={handleInput}
        />
        <button type="submit" aria-label="Search">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </form>
    </div>
  );
}