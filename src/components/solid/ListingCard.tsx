
import { createSignal, onMount } from 'solid-js';
import type { ListingCardProps, Category } from '../../types';

export default function ListingCard(props: ListingCardProps) {
  const { listing, url, theme = 'default' } = props;
  
  const [categoryName, setCategoryName] = createSignal('');
  
  // Format the first image as the thumbnail
  const thumbnail = listing.images && listing.images.length > 0 
    ? listing.images[0] 
    : '/placeholder-image.jpg';
  
  // Fetch category name if needed
  const fetchCategoryName = async () => {
    if (!listing.category) return;
    
    // In a real implementation, we would use a more efficient way to get category names
    // For now, we'll assume the category name is provided elsewhere or fetched separately
    try {
      if (typeof window !== 'undefined') {
        // This is just a placeholder - in a real app, you'd use a store or context
        // Or pass in the categories list directly to avoid additional API calls
        const response = await fetch(`/api/category?id=${listing.category}&directory=${listing.directory}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.category) {
            setCategoryName(data.category.name);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching category info:', error);
    }
  };
  
  // Only run browser-specific code on mount
  onMount(() => {
    if (listing.category) {
      fetchCategoryName();
    }
  });
  
  // Different card layouts based on theme
  if (theme === 'elegant') {
    return (
      <div class="listing-card">
        <a href={url} class="card-link">
          <div class="card-content">
            <h3 class="card-title">{listing.title}</h3>
            
            {categoryName() && (
              <span class="card-category">{categoryName()}</span>
            )}
            
            <p class="card-description">{listing.description}</p>
            
            <div class="card-meta">
              {typeof listing.rating === 'number' && (
                <span class="card-rating" style={`--rating: ${listing.rating}`}>
                  <span class="stars"></span>
                  <span class="rating-value">{listing.rating.toFixed(1)}</span>
                </span>
              )}
              
              {listing.address && (
                <div class="card-address">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{listing.address.split(',')[0]}</span>
                </div>
              )}
            </div>
          </div>
          
          <div class="card-image">
            <img src={thumbnail} alt={listing.title} loading="lazy" />
            
            {listing.featured && (
              <span class="featured-badge">Featured</span>
            )}
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
          
          {listing.featured && (
            <span class="featured-badge">Featured</span>
          )}
        </div>
        
        <div class="card-content">
          <h3 class="card-title">{listing.title}</h3>
          <p class="card-description">{listing.description}</p>
          
          <div class="card-meta">
            {categoryName() && (
              <span class="card-category">{categoryName()}</span>
            )}
            
            {typeof listing.rating === 'number' && (
              <span class="card-rating" style={`--rating: ${listing.rating}`}>
                <span class="stars"></span>
                <span class="rating-value">{listing.rating.toFixed(1)}</span>
              </span>
            )}
          </div>
          
          {listing.address && (
            <div class="card-address">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{listing.address.split(',')[0]}</span>
            </div>
          )}
          
          {listing.tags && listing.tags.length > 0 && (
            <div class="card-tags">
              {listing.tags.slice(0, 3).map(tag => (
                <span class="tag">{tag}</span>
              ))}
              
              {listing.tags.length > 3 && (
                <span class="tag-more">+{listing.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </a>
    </div>
  );
}