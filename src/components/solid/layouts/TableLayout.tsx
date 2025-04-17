// src/components/solid/layouts/TableLayout.tsx
import { createSignal, createEffect, For, Show } from 'solid-js';
import type { LayoutProps } from '../../../types';
import { formatDate } from '../../../utils/common';

export default function TableLayout(props: LayoutProps) {
  const { listings, directory, categories, directoryId } = props;
  
  // State for filters, search, and sorting
  const [categoryFilter, setCategoryFilter] = createSignal('');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [sortColumn, setSortColumn] = createSignal('name');
  const [sortDirection, setSortDirection] = createSignal<'asc' | 'desc'>('asc');
  const [filteredListings, setFilteredListings] = createSignal(listings);
  
  // Apply filters, search, and sorting
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
        listing.data.description.toLowerCase().includes(term) ||
        (listing.data.address && listing.data.address.toLowerCase().includes(term))
      );
    }
    
    // Sort the listings
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn()) {
        case 'name':
          comparison = a.data.title.localeCompare(b.data.title);
          break;
        case 'category':
          const catA = getCategoryName(a.data.category) || '';
          const catB = getCategoryName(b.data.category) || '';
          comparison = catA.localeCompare(catB);
          break;
        case 'rating':
          const ratingA = a.data.rating || 0;
          const ratingB = b.data.rating || 0;
          comparison = ratingA - ratingB;
          break;
        case 'date':
          const dateA = a.data.updatedAt ? new Date(a.data.updatedAt).getTime() : 0;
          const dateB = b.data.updatedAt ? new Date(b.data.updatedAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      
      // Reverse if descending
      return sortDirection() === 'asc' ? comparison : -comparison;
    });
    
    setFilteredListings(filtered);
  };
  
  // Get category name by ID
  const getCategoryName = (categoryId: string | undefined): string => {
    if (!categoryId) return '';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };
  
  // Toggle sort direction or change sort column
  const handleSort = (column: string) => {
    if (sortColumn() === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Re-apply filters when dependencies change
  createEffect(() => {
    applyFilters();
  });
  
  return (
    <div class="table-layout">
      <div class="filters-bar">
        <div class="filter-section">
          <label for="table-category-filter">Category</label>
          <select 
            id="table-category-filter" 
            class="filter-select"
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
        </div>
        
        <div class="search-box">
          <input 
            type="text" 
            id="table-search" 
            placeholder="Filter items..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
          />
        </div>
      </div>
      
      <div class="table-container">
        <table class="listings-table">
          <thead>
            <tr>
              <th 
                class={`sortable ${sortColumn() === 'name' ? `sort-${sortDirection()}` : ''}`} 
                onClick={() => handleSort('name')}
              >
                Name
              </th>
              <th 
                class={`sortable ${sortColumn() === 'category' ? `sort-${sortDirection()}` : ''}`}
                onClick={() => handleSort('category')}
              >
                Category
              </th>
              <th 
                class={`sortable ${sortColumn() === 'rating' ? `sort-${sortDirection()}` : ''}`}
                onClick={() => handleSort('rating')}
              >
                Rating
              </th>
              <th>Address</th>
              <th 
                class={`sortable ${sortColumn() === 'date' ? `sort-${sortDirection()}` : ''}`}
                onClick={() => handleSort('date')}
              >
                Added Date
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <For each={filteredListings()}>
              {(listing) => (
                <tr>
                  <td class="listing-title">
                    {listing.data.featured && <span class="featured-badge">Featured</span>}
                    {listing.data.title}
                  </td>
                  <td>{getCategoryName(listing.data.category)}</td>
                  <td>
                    <Show when={listing.data.rating} fallback={<span class="no-rating">No rating</span>}>
                      <div class="rating-stars" style={`--rating: ${listing.data.rating}`}>
                        <span class="sr-only">{listing.data.rating} out of 5 stars</span>
                      </div>
                    </Show>
                  </td>
                  <td class="address-cell">{listing.data.address || '-'}</td>
                  <td>{listing.data.updatedAt ? formatDate(listing.data.updatedAt) : '-'}</td>
                  <td>
                    <a 
                      href={`/${directoryId}/${listing.slug.replace(`${directoryId}/`, '')}`} 
                      class="view-button"
                    >
                      View
                    </a>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        
        <Show when={filteredListings().length === 0}>
          <div class="no-results-message">
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
  );
}