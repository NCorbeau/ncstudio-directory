// src/components/solid/ListingCard.tsx
import { createSignal, createEffect, Show, For } from 'solid-js';
import type { ListingCardProps } from '../../types';
import { useDirectory } from './providers/AppContext';
import { normalizeListing, getThumbnailImage } from '../../utils/listing-helpers';

export default function ListingCard(props: ListingCardProps) {
  const { listing, url, theme = 'default' } = props;
  
  // Normalize the listing data
  // const normalizedListing = normalizeListing(listing);
  const normalizedListing = listing;
  
  // Get directory context for category info to avoid API calls
  const directoryContext = useDirectory();
  
  // Local state for category name
  const [categoryName, setCategoryName] = createSignal('');
  
  // Get thumbnail image using helper
  const thumbnail = getThumbnailImage(normalizedListing.images);
  
  // Get category name from context instead of API
  createEffect(() => {
    if (normalizedListing.category && directoryContext.directory) {
      const category = directoryContext.directory.categories.find(
        cat => cat.id === normalizedListing.category
      );
      setCategoryName(category?.name || '');
    }
  });
  
  // Different card layouts based on theme
  if (theme === 'elegant') {
    return (
      <div class="listing-card">
        <a href={url} class="card-link">
          <div class="card-content">
            <h3 class="card-title">{normalizedListing.title}</h3>
            
            <Show when={categoryName()}>
              <span class="card-category">{categoryName()}</span>
            </Show>
            
            <p class="card-description">{normalizedListing.description}</p>
            
            <div class="card-meta">
              <Show when={normalizedListing.rating}>
                <span class="card-rating" style={`--rating: ${normalizedListing.rating}`}>
                  <span class="stars"></span>
                  <span class="rating-value">{normalizedListing.rating?.toFixed(1)}</span>
                </span>
              </Show>
              
              <Show when={normalizedListing.address}>
                <div class="card-address">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{normalizedListing.address?.split(',')[0]}</span>
                </div>
              </Show>
            </div>
          </div>
          
          <div class="card-image">
            <img src={thumbnail} alt={normalizedListing.title} loading="lazy" />
            
            <Show when={normalizedListing.featured}>
              <span class="featured-badge">Featured</span>
            </Show>
          </div>
        </a>
      </div>
    );
  } else if (theme === 'nature') {
    return (
      <div class="listing-card">
        <a href={url} class="card-link">
          <div class="card-image">
            <img src={thumbnail} alt={normalizedListing.title} loading="lazy" />
            
            <Show when={normalizedListing.featured}>
              <span class="featured-badge">Featured</span>
            </Show>
            
            <Show when={categoryName()}>
              <span class="card-category">{categoryName()}</span>
            </Show>
          </div>
          
          <div class="card-content">
            <h3 class="card-title">{normalizedListing.title}</h3>
            
            <Show when={normalizedListing.rating}>
              <div class="card-rating" style={`--rating: ${normalizedListing.rating}`}>
                <span class="stars"></span>
                <span class="rating-value">{normalizedListing.rating?.toFixed(1)}</span>
              </div>
            </Show>
            
            <p class="card-description">{normalizedListing.description}</p>
            
            <div class="card-meta">
              <Show when={normalizedListing.address}>
                <div class="card-address">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{normalizedListing.address?.split(',')[0]}</span>
                </div>
              </Show>
              
              <Show when={normalizedListing.tags && normalizedListing.tags.length > 0}>
                <div class="card-tags">
                  <For each={normalizedListing.tags.slice(0, 3)}>
                    {(tag) => <span class="tag">{tag}</span>}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </a>
      </div>
    );
  } else if (theme === 'modern') {
    return (
      <div class="listing-card">
        <a href={url} class="card-link">
          <div class="card-image">
            <img src={thumbnail} alt={normalizedListing.title} loading="lazy" />
            
            <Show when={normalizedListing.featured}>
              <span class="featured-badge">Featured</span>
            </Show>
          </div>
          
          <div class="card-content">
            <div class="card-meta-top">
              <Show when={categoryName()}>
                <span class="card-category">{categoryName()}</span>
              </Show>
              
              <Show when={normalizedListing.rating}>
                <span class="card-rating" style={`--rating: ${normalizedListing.rating}`}>
                  <span class="rating-value">{normalizedListing.rating?.toFixed(1)}</span>
                  <span class="stars"></span>
                </span>
              </Show>
            </div>
            
            <h3 class="card-title">{normalizedListing.title}</h3>
            <p class="card-description">{normalizedListing.description}</p>
            
            <div class="card-footer">
              <Show when={normalizedListing.address}>
                <div class="card-address">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{normalizedListing.address?.split(',')[0]}</span>
                </div>
              </Show>
              
              <Show when={normalizedListing.tags && normalizedListing.tags.length > 0}>
                <div class="card-tags">
                  <For each={normalizedListing.tags.slice(0, 2)}>
                    {(tag) => <span class="tag">{tag}</span>}
                  </For>
                  
                  <Show when={normalizedListing.tags.length > 2}>
                    <span class="tag-more">+{normalizedListing.tags.length - 2}</span>
                  </Show>
                </div>
              </Show>
            </div>
          </div>
        </a>
      </div>
    );
  }
  
  // Default theme
  return (
    <div class="listing-card">
      <a href={url} class="card-link">
        <div class="card-image">
          <img src={thumbnail} alt={normalizedListing.title} loading="lazy" />
          
          <Show when={normalizedListing.featured}>
            <span class="featured-badge">Featured</span>
          </Show>
        </div>
        
        <div class="card-content">
          <h3 class="card-title">{normalizedListing.title}</h3>
          <p class="card-description">{normalizedListing.description}</p>
          
          <div class="card-meta">
            <Show when={categoryName()}>
              <span class="card-category">{categoryName()}</span>
            </Show>
            
            <Show when={normalizedListing.rating}>
              <span class="card-rating" style={`--rating: ${normalizedListing.rating}`}>
                <span class="stars"></span>
                <span class="rating-value">{normalizedListing.rating?.toFixed(1)}</span>
              </span>
            </Show>
          </div>
          
          <Show when={normalizedListing.address}>
            <div class="card-address">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{normalizedListing.address?.split(',')[0]}</span>
            </div>
          </Show>
          
          <Show when={normalizedListing.tags && normalizedListing.tags.length > 0}>
            <div class="card-tags">
              <For each={normalizedListing.tags.slice(0, 3)}>
                {(tag) => <span class="tag">{tag}</span>}
              </For>
              
              <Show when={normalizedListing.tags.length > 3}>
                <span class="tag-more">+{normalizedListing.tags.length - 3}</span>
              </Show>
            </div>
          </Show>
        </div>
      </a>
    </div>
  );
}