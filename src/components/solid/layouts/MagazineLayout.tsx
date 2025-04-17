// src/components/solid/layouts/MagazineLayout.tsx
import { createMemo, For, Show } from 'solid-js';
import type { LayoutProps } from '../../../types';

export default function MagazineLayout(props: LayoutProps) {
  const { listings, directory, categories, directoryId } = props;
  
  // Function to truncate text
  const truncateText = (text: string, maxLength = 150): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  // Get featured listings
  const featuredListings = createMemo(() => 
    listings.filter(listing => listing.data.featured)
  );
  
  // Get a listing with an image for the featured spot
  const heroListing = createMemo(() => {
    const withImage = featuredListings().find(listing => 
      listing.data.images && listing.data.images.length > 0
    );
    
    return withImage || featuredListings()[0] || listings[0];
  });
  
  // Group remaining listings by category
  const listingsByCategory = createMemo(() => {
    const result: Record<string, typeof listings> = {};
    
    // Initialize categories
    categories.forEach(category => {
      result[category.id] = [];
    });
    
    // Fill categories with listings
    listings.forEach(listing => {
      // Skip the hero listing
      if (heroListing() && listing.slug === heroListing()?.slug) return;
      
      const categoryId = listing.data.category;
      if (categoryId && result[categoryId]) {
        result[categoryId].push(listing);
      }
    });
    
    return result;
  });
  
  // Get categories that have listings
  const populatedCategories = createMemo(() => 
    categories.filter(category => 
      listingsByCategory()[category.id] && 
      listingsByCategory()[category.id].length > 0
    )
  );
  
  return (
    <div class="magazine-layout">
      <Show when={heroListing()}>
        {(hero) => (
          <div class="hero-feature">
            <a href={`/${directoryId}/${hero.slug.replace(`${directoryId}/`, '')}`} class="hero-card">
              <div class="hero-image">
                <Show 
                  when={hero.data.images && hero.data.images.length > 0}
                  fallback={
                    <div class="placeholder-image">
                      <span>{hero.data.title[0]}</span>
                    </div>
                  }
                >
                  <img src={hero.data.images[0]} alt={hero.data.title} />
                </Show>
                <div class="hero-overlay"></div>
              </div>
              
              <div class="hero-content">
                <Show when={hero.data.featured}>
                  <span class="featured-badge">Featured</span>
                </Show>
                
                <h2>{hero.data.title}</h2>
                <p>{truncateText(hero.data.description, 200)}</p>
                
                <div class="meta-info">
                  <Show when={hero.data.rating}>
                    <span class="rating">
                      <span class="stars" style={`--rating: ${hero.data.rating}`}></span>
                      <span class="rating-text">{hero.data.rating} out of 5</span>
                    </span>
                  </Show>
                  
                  <Show when={hero.data.address}>
                    <span class="address">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      {hero.data.address}
                    </span>
                  </Show>
                </div>
                
                <span class="read-more">Read More</span>
              </div>
            </a>
          </div>
        )}
      </Show>
      
      <div class="category-sections">
        <For each={populatedCategories()}>
          {(category) => (
            <section class="category-section">
              <div class="section-header">
                <h3>{category.name}</h3>
                <a href={`/${directoryId}/category/${category.id}`} class="view-all">View All</a>
              </div>
              
              <div class="listing-row">
                <For each={listingsByCategory()[category.id].slice(0, 3)}>
                  {(listing) => (
                    <a href={`/${directoryId}/${listing.slug.replace(`${directoryId}/`, '')}`} class="listing-card">
                      <div class="card-image">
                        <Show 
                          when={listing.data.images && listing.data.images.length > 0}
                          fallback={
                            <div class="placeholder-image">
                              <span>{listing.data.title[0]}</span>
                            </div>
                          }
                        >
                          <img src={listing.data.images[0]} alt={listing.data.title} />
                        </Show>
                        <Show when={listing.data.featured}>
                          <span class="mini-badge">Featured</span>
                        </Show>
                      </div>
                      
                      <div class="card-content">
                        <h4>{listing.data.title}</h4>
                        <p>{truncateText(listing.data.description, 100)}</p>
                        
                        <Show when={listing.data.rating}>
                          <div class="rating-small">
                            <span class="stars-small" style={`--rating: ${listing.data.rating}`}></span>
                          </div>
                        </Show>
                      </div>
                    </a>
                  )}
                </For>
              </div>
            </section>
          )}
        </For>
      </div>
      
      <div class="editor-picks">
        <div class="section-header">
          <h3>Editor's Picks</h3>
        </div>
        
        <div class="picks-grid">
          <For each={featuredListings().slice(0, 6)}>
            {(listing) => (
              <a href={`/${directoryId}/${listing.slug.replace(`${directoryId}/`, '')}`} class="pick-card">
                <div class="pick-image">
                  <Show 
                    when={listing.data.images && listing.data.images.length > 0}
                    fallback={
                      <div class="placeholder-image small">
                        <span>{listing.data.title[0]}</span>
                      </div>
                    }
                  >
                    <img src={listing.data.images[0]} alt={listing.data.title} />
                  </Show>
                </div>
                
                <div class="pick-content">
                  <h4>{listing.data.title}</h4>
                  
                  <Show when={listing.data.tags && listing.data.tags.length > 0}>
                    <div class="pick-tags">
                      <For each={listing.data.tags.slice(0, 2)}>
                        {(tag) => <span class="pick-tag">{tag}</span>}
                      </For>
                    </div>
                  </Show>
                </div>
              </a>
            )}
          </For>
        </div>
      </div>
      
      <div class="magazine-footer">
        <a href={`/${directoryId}/search`} class="view-all-button">View All Listings</a>
      </div>
    </div>
  );
}