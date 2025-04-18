// src/components/solid/layouts/MagazineLayout.tsx
import { createSignal, createMemo, createEffect, onMount, For, Show } from 'solid-js';
import type { LayoutProps } from '../../../types';

export default function MagazineLayout(props: LayoutProps) {
  const { listings, directory, categories, directoryId } = props;
  
  // Client-side only signal to track hydration status
  const [isHydrated, setIsHydrated] = createSignal(false);
  
  // Function to truncate text
  const truncateText = (text: string, maxLength = 150): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  // Mark as hydrated when component mounts on client
  onMount(() => {
    setIsHydrated(true);
  });
  
  // Create stable memoized values that don't change between server/client
  // Use empty arrays as stable defaults to prevent hydration mismatches
  const stableListings = () => listings || [];
  
  // Get featured listings - stable for hydration
  const featuredListings = createMemo(() => 
    stableListings().filter(listing => listing.data.featured)
  );
  
  // Get a listing with an image for the featured spot
  // With additional null checks and fallbacks
  const heroListing = createMemo(() => {
    // If no listings at all, return null
    if (!stableListings() || stableListings().length === 0) return null;
    
    const withImage = featuredListings().find(listing => 
      listing.data.images && listing.data.images.length > 0
    );
    
    return withImage || featuredListings()[0] || stableListings()[0];
  });
  
  // Group remaining listings by category - made stable for hydration
  const listingsByCategory = createMemo(() => {
    const result: Record<string, typeof listings> = {};
    
    // Initialize categories
    (categories || []).forEach(category => {
      result[category.id] = [];
    });
    
    // Fill categories with listings
    stableListings().forEach(listing => {
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
    (categories || []).filter(category => 
      listingsByCategory()[category.id] && 
      listingsByCategory()[category.id].length > 0
    )
  );
  
  // Safe method to get the hero URL
  const getHeroUrl = (hero: any) => {
    if (!hero || !hero.slug) return '#'; // Fallback URL
    
    try {
      return `/${directoryId}/${hero.slug.replace(`${directoryId}/`, '')}`;
    } catch (e) {
      console.error('Error creating hero URL:', e);
      return '#';
    }
  };
  
  // Check if we have any listings at all to show
  const hasListings = () => stableListings().length > 0;
  
  // We ensure the component structure is IDENTICAL on both server and client
  // by having a single, consistent return structure with Show conditions inside
  return (
    <div class="magazine-layout">
      {/* Hero Section - Consistent structure for hydration */}
      <Show when={heroListing() !== null}>
        <div class="hero-feature">
          <a href={getHeroUrl(heroListing())} class="hero-card">
            <div class="hero-image">
              <Show 
                when={heroListing()?.data?.images && heroListing()?.data.images.length > 0}
                fallback={
                  <div class="placeholder-image">
                    <span>{heroListing()?.data?.title?.[0] || '?'}</span>
                  </div>
                }
              >
                <img src={heroListing()?.data.images[0]} alt={heroListing()?.data.title} />
              </Show>
              <div class="hero-overlay"></div>
            </div>
            
            <div class="hero-content">
              <Show when={heroListing()?.data?.featured}>
                <span class="featured-badge">Featured</span>
              </Show>
              
              <h2>{heroListing()?.data?.title}</h2>
              <p>{truncateText(heroListing()?.data?.description || '', 200)}</p>
              
              <div class="meta-info">
                <Show when={heroListing()?.data?.rating}>
                  <span class="rating">
                    <span class="stars" style={`--rating: ${heroListing()?.data.rating}`}></span>
                    <span class="rating-text">{heroListing()?.data.rating} out of 5</span>
                  </span>
                </Show>
                
                <Show when={heroListing()?.data?.address}>
                  <span class="address">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {heroListing()?.data.address}
                  </span>
                </Show>
              </div>
              
              <span class="read-more">Read More</span>
            </div>
          </a>
        </div>
      </Show>
      
      {/* No Listings Message - Consistent structure for hydration */}
      <Show when={!hasListings()}>
        <div class="no-listings">
          <h2>No listings available</h2>
          <p>There are currently no listings to display.</p>
        </div>
      </Show>
      
      {/* Category Sections - Consistent structure for hydration */}
      <Show when={populatedCategories().length > 0}>
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
      </Show>
      
      {/* Editor's Picks Section - Consistent structure for hydration */}
      <Show when={featuredListings().length > 0}>
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
      </Show>
      
      {/* Footer - Always present for consistent structure */}
      <div class="magazine-footer">
        <a href={`/${directoryId}/search`} class="view-all-button">View All Listings</a>
      </div>
    </div>
  );
}