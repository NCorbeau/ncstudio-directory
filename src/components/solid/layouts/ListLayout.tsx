// src/components/solid/layouts/ListLayout.tsx
import { createSignal, createEffect, For, Show } from 'solid-js';
import type { LayoutProps } from '../../../types';

export default function ListLayout(props: LayoutProps) {
  const { listings, directory, categories, directoryId } = props;
  
  // State
  const [activeListingIndex, setActiveListingIndex] = createSignal(0);
  const [categoryFilter, setCategoryFilter] = createSignal('');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [filteredListings, setFilteredListings] = createSignal(listings);
  
  // Apply filters
  const applyFilters = () => {
    let filtered = [...listings];
    
    // Filter by category
    if (categoryFilter()) {
      filtered = filtered.filter(listing => 
        listing.data.category === categoryFilter()
      );
    }
    
    // Filter by search term
    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      filtered = filtered.filter(listing => 
        listing.data.title.toLowerCase().includes(term) ||
        listing.data.description.toLowerCase().includes(term)
      );
    }
    
    setFilteredListings(filtered);
    
    // Reset active listing if it's now filtered out
    if (filtered.length > 0 && activeListingIndex() >= filtered.length) {
      setActiveListingIndex(0);
    }
  };
  
  // Get category name from ID
  const getCategoryName = (categoryId: string | undefined): string => {
    if (!categoryId) return '';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };
  
  // Truncate text to a certain length
  const truncateText = (text: string, maxLength = 100): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  // Re-apply filters when dependencies change
  createEffect(() => {
    applyFilters();
  });
  
  // Get the active listing
  const activeListing = () => {
    if (filteredListings().length === 0) return null;
    return filteredListings()[activeListingIndex()];
  };
  
  return (
    <div class="list-layout">
      <div class="sidebar">
        <div class="filters">
          <select 
            id="category-filter" 
            class="category-select"
            value={categoryFilter()}
            onChange={(e) => setCategoryFilter(e.currentTarget.value)}
          >
            <option value="">All Categories</option>
            <For each={categories}>
              {(category) => (
                <option value={category.id}>{category.name}</option>
              )}
            </For>
          </select>
          
          <div class="search-box">
            <input 
              type="text" 
              id="listing-search" 
              placeholder="Filter listings..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
            />
          </div>
        </div>
        
        <div class="listing-list">
          <For each={filteredListings()}>
            {(listing, index) => {
              // Get category name
              const categoryName = getCategoryName(listing.data.category);
              
              return (
                <div 
                  class={`listing-item ${index() === activeListingIndex() ? 'active' : ''}`}
                  onClick={() => setActiveListingIndex(index())}
                >
                  <div class="listing-header">
                    <h3>{listing.data.title}</h3>
                    {listing.data.featured && <span class="featured-badge">Featured</span>}
                  </div>
                  <div class="listing-meta">
                    {categoryName && <span class="category-tag">{categoryName}</span>}
                    {listing.data.fields.rating && 
                      <span class="rating">
                        <span class="stars" style={`--rating: ${listing.data.fields.rating}`}></span>
                        <span class="rating-value">{listing.data.fields.rating}</span>
                      </span>
                    }
                  </div>
                  <p class="listing-excerpt">{truncateText(listing.data.fields.description, 80)}</p>
                </div>
              );
            }}
          </For>
          
          <Show when={filteredListings().length === 0}>
            <div class="no-listings-message">
              <p>No listings match your current filters.</p>
              <button 
                onClick={() => {
                  setCategoryFilter('');
                  setSearchTerm('');
                }}
                class="reset-button"
              >
                Reset Filters
              </button>
            </div>
          </Show>
        </div>
      </div>
      
      <div class="main-content" id="listing-content">
        <Show when={activeListing()}>
          {(listing) => (
            <div class="listing-detail">
              <div class="detail-header">
                <h2>{listing().data.title}</h2>
                
                <a 
                  href={`/${directoryId}/${listing().slug.replace(`${directoryId}/`, '')}`} 
                  class="view-full-button"
                >
                  View Full Details
                </a>
              </div>
              
              <Show when={listing().data.images && listing().data.images.length > 0}>
                <div class="detail-image">
                  <img src={listing().data.images[0]} alt={listing().data.title} />
                </div>
              </Show>
              
              <div class="detail-info">
                <div class="detail-meta">
                  <Show when={listing().data.fields.address}>
                    <div class="meta-item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span>{listing().data.fields.address}</span>
                    </div>
                  </Show>
                  
                  <Show when={listing().data.fields.website}>
                    <div class="meta-item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                      </svg>
                      <a href={listing().data.fields.website} target="_blank" rel="noopener noreferrer">
                        Visit Website
                      </a>
                    </div>
                  </Show>
                  
                  <Show when={listing().data.fields.phone}>
                    <div class="meta-item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      <a href={`tel:${listing().data.fields.phone}`}>{listing().data.fields.phone}</a>
                    </div>
                  </Show>
                </div>
                
                <div class="detail-description">
                  <p>{listing().data.description}</p>
                </div>
                
                <Show when={listing().data.tags && listing().data.tags.length > 0}>
                  <div class="detail-tags">
                    <For each={listing().data.tags}>
                      {(tag) => <span class="tag">{tag}</span>}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          )}
        </Show>
        
        <Show when={filteredListings().length === 0}>
          <div class="no-selection-message">
            <p>No listings match your current filters.</p>
          </div>
        </Show>
      </div>
    </div>
  );
}