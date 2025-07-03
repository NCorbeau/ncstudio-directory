// src/components/solid/layouts/CardLayout.tsx
import type { LayoutProps } from '../../../types';
import { createSignal, createEffect, For } from 'solid-js';
import ListingCard from '../ListingCard';
import { useDirectory } from '../providers/AppContext';

export default function CardLayout(props: LayoutProps) {
  // If AppContext is used, you can get data from context instead of props
  // const directory = useDirectory();
  
  const { listings, directory, categories, directoryId } = props;
  
  // State for filtering and sorting
  const [categoryFilter, setCategoryFilter] = createSignal('');
  const [sortBy, setSortBy] = createSignal('featured');
  const [filteredListings, setFilteredListings] = createSignal(listings);
  
  // Apply filters and sorting
  const applyFilters = () => {
    let filtered = [...listings];
    
    // Filter by category
    if (categoryFilter()) {
      filtered = filtered.filter(listing => 
        listing.data.category === categoryFilter()
      );
    }
    
    // Sort listings
    filtered.sort((a, b) => {
      switch (sortBy()) {
        case 'name':
          return a.data.title.localeCompare(b.data.title);
        case 'rating':
          const ratingA = a.data.rating || 0;
          const ratingB = b.data.rating || 0;
          return ratingB - ratingA;
        case 'newest':
          const dateA = a.data.updatedAt ? new Date(a.data.updatedAt).getTime() : 0;
          const dateB = b.data.updatedAt ? new Date(b.data.updatedAt).getTime() : 0;
          return dateB - dateA;
        case 'featured':
        default:
          // Featured items first, then alphabetical
          if (a.data.featured && !b.data.featured) return -1;
          if (!a.data.featured && b.data.featured) return 1;
          return a.data.title.localeCompare(b.data.title);
      }
    });
    
    setFilteredListings(filtered);
  };
  
  // Apply filters when dependencies change
  createEffect(() => {
    applyFilters();
  });
  
  // Handle category filter change
  const handleCategoryChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    setCategoryFilter(target.value);
  };
  
  // Handle sort change
  const handleSortChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    setSortBy(target.value);
  };
  
  return (
    <div class="card-layout">
      <div class="filters-bar">
        <div class="filter-section">
          <label for="category-filter">Category</label>
          <select 
            id="category-filter" 
            class="filter-select"
            value={categoryFilter()}
            onChange={handleCategoryChange}
          >
            <option value="">All Categories</option>
            <For each={categories}>
              {(category) => (
                <option value={category.id}>{category.name}</option>
              )}
            </For>
          </select>
        </div>
        
        <div class="filter-section">
          <label for="sort-filter">Sort By</label>
          <select 
            id="sort-filter" 
            class="filter-select"
            value={sortBy()}
            onChange={handleSortChange}
          >
            <option value="featured">Featured</option>
            <option value="name">Name A-Z</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>
      
      <div class="listing-grid">
        <For each={filteredListings()}>
          {(listing) => (
            <ListingCard 
              listing={listing.data} 
              url={listing.data.full_path || `/${listing.slug.replace(`${directoryId}/`, '')}`}
              theme={directory.theme}
            />
          )}
        </For>
        
        {filteredListings().length === 0 && (
          <div class="no-results">
            <p>No listings match your current filters.</p>
            <button 
              onClick={() => {
                setCategoryFilter('');
                setSortBy('featured');
              }}
              class="reset-button"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}