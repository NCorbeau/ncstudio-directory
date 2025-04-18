// src/components/solid/ListingCard.tsx
import { createSignal, createEffect, Show, For } from 'solid-js';
import type { ListingCardProps } from '../../types';
import { useDirectory } from './providers/AppContext';

export default function ListingCard(props: ListingCardProps) {
  const { listing, url, theme = 'default' } = props;
  
  // Get directory context for category info to avoid API calls
  const directoryContext = useDirectory();
  
  // Local state for category name
  const [categoryName, setCategoryName] = createSignal('');
  
  // Format the first image as the thumbnail
  const thumbnail = listing.images && listing.images.length > 0 
    ? listing.images[0] 
    : '/placeholder-image.jpg';
  
  // Get category name from context instead of API
  createEffect(() => {
    if (listing.category && directoryContext.directory) {
      const category = directoryContext.directory.categories.find(
        cat => cat.id === listing.category
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
            <h3 class="card-title">{listing.title}</h3>
            
            <Show when={categoryName()}>
              <span class="card-category">{categoryName()}</span>
            </Show>
            
            <p class="card-description">{listing.description}</p>
            
            <div class="card-meta">
              <Show when={typeof listing.rating === 'number'}>
                <span class="card-rating" style={`--rating: ${listing.rating}`}>
                  <span class="stars"></span>
                  <span class="rating-value">{listing.rating?.toFixed(1)}</span>
                </span>
              </Show>
              
              <Show when={listing.address}>
                <div class="card-address">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{listing.address?.split(',')[0]}</span>
                </div>
              </Show>
            </div>
          </div>
          
          <div class="card-image">
            <img src={thumbnail} alt={listing.title} loading="lazy" />
            
            <Show when={listing.featured}>
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
            <img src={thumbnail} alt={listing.title} loading="lazy" />
            
            <Show when={listing.featured}>
              <span class="featured-badge">Featured</span>
            </Show>
            
            <Show when={categoryName()}>
              <span class="card-category">{categoryName()}</span>
            </Show>
          </div>
          
          <div class="card-content">
            <h3 class="card-title">{listing.title}</h3>
            
            <Show when={typeof listing.rating === 'number'}>
              <div class="card-rating" style={`--rating: ${listing.rating}`}>
                <span class="stars"></span>
                <span class="rating-value">{listing.rating?.toFixed(1)}</span>
              </div>
            </Show>
            
            <p class="card-description">{listing.description}</p>
            
            <div class="card-meta">
              <Show when={listing.address}>
                <div class="card-address">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{listing.address?.split(',')[0]}</span>
                </div>
              </Show>
              
              <Show when={listing.tags && listing.tags.length > 0}>
                <div class="card-tags">
                  <For each={listing.tags.slice(0, 3)}>
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
            <img src={thumbnail} alt={listing.title} loading="lazy" />
            
            <Show when={listing.featured}>
              <span class="featured-badge">Featured</span>
            </Show>
          </div>
          
          <div class="card-content">
            <div class="card-meta-top">
              <Show when={categoryName()}>
                <span class="card-category">{categoryName()}</span>
              </Show>
              
              <Show when={typeof listing.rating === 'number'}>
                <span class="card-rating" style={`--rating: ${listing.rating}`}>
                  <span class="rating-value">{listing.rating?.toFixed(1)}</span>
                  <span class="stars"></span>
                </span>
              </Show>
            </div>
            
            <h3 class="card-title">{listing.title}</h3>
            <p class="card-description">{listing.description}</p>
            
            <div class="card-footer">
              <Show when={listing.address}>
                <div class="card-address">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{listing.address?.split(',')[0]}</span>
                </div>
              </Show>
              
              <Show when={listing.tags && listing.tags.length > 0}>
                <div class="card-tags">
                  <For each={listing.tags.slice(0, 2)}>
                    {(tag) => <span class="tag">{tag}</span>}
                  </For>
                  
                  <Show when={listing.tags.length > 2}>
                    <span class="tag-more">+{listing.tags.length - 2}</span>
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
          <img src={thumbnail} alt={listing.title} loading="lazy" />
          
          <Show when={listing.featured}>
            <span class="featured-badge">Featured</span>
          </Show>
        </div>
        
        <div class="card-content">
          <h3 class="card-title">{listing.title}</h3>
          <p class="card-description">{listing.description}</p>
          
          <div class="card-meta">
            <Show when={categoryName()}>
              <span class="card-category">{categoryName()}</span>
            </Show>
            
            <Show when={typeof listing.rating === 'number'}>
              <span class="card-rating" style={`--rating: ${listing.rating}`}>
                <span class="stars"></span>
                <span class="rating-value">{listing.rating?.toFixed(1)}</span>
              </span>
            </Show>
          </div>
          
          <Show when={listing.address}>
            <div class="card-address">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{listing.address?.split(',')[0]}</span>
            </div>
          </Show>
          
          <Show when={listing.tags && listing.tags.length > 0}>
            <div class="card-tags">
              <For each={listing.tags.slice(0, 3)}>
                {(tag) => <span class="tag">{tag}</span>}
              </For>
              
              <Show when={listing.tags.length > 3}>
                <span class="tag-more">+{listing.tags.length - 3}</span>
              </Show>
            </div>
          </Show>
        </div>
      </a>
    </div>
  );
}