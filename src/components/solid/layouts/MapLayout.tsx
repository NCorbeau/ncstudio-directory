// src/components/solid/layouts/MapLayout.tsx
import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import type { LayoutProps } from '../../../types';

// Define a type for the map library
declare global {
  interface Window {
    L: any;
  }
}

export default function MapLayout(props: LayoutProps) {
  const { listings, directory, categories, directoryId } = props;
  
  // State
  const [activeListingIndex, setActiveListingIndex] = createSignal<number | null>(null);
  const [mapInitialized, setMapInitialized] = createSignal(false);
  const [mapInstance, setMapInstance] = createSignal<any>(null);
  const [markers, setMarkers] = createSignal<any[]>([]);
  
  // Get the active listing
  const activeListing = () => {
    if (activeListingIndex() === null) return null;
    return listings[activeListingIndex()];
  };
  
  // Initialize the map
  const initializeMap = async () => {
    // Check if we already have a map
    if (mapInitialized()) return;
    
    // Load Leaflet if it's not already loaded
    await loadLeaflet();
    
    // Make sure we have the L global
    if (!window.L) {
      console.error('Leaflet failed to load');
      return;
    }
    
    // Get map container element
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }
    
    try {
      // Initialize map centered on Warsaw (default location)
      const map = window.L.map('map').setView([52.2297, 21.0122], 12);
      
      // Add tile layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      setMapInstance(map);
      setMapInitialized(true);
      
      // Add markers for listings with addresses
      const newMarkers = [];
      
      for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];
        
        // Skip listings without addresses
        if (!listing.data.fields.fullAddress) continue;
        
        // In a real implementation, we would geocode the address
        // For this example, we'll use random coordinates around Warsaw
        const lat = 52.2297 + (Math.random() - 0.5) * 0.1;
        const lng = 21.0122 + (Math.random() - 0.5) * 0.1;
        
        // Create marker
        const marker = window.L.marker([lat, lng]).addTo(map);
        
        // Create popup with listing info
        const popupContent = `
          <div class="map-popup">
            <h3>${listing.data.title}</h3>
            <p>${listing.data.fields.fullAddress}</p>
                            <a href="${listing.data.fullPath || `/${listing.slug.replace(`${directoryId}/`, '')}` }">View details</a>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // Save the listing index with the marker
        marker.listingIndex = i;
        
        // Add click handler
        marker.on('click', () => {
          setActiveListingIndex(marker.listingIndex);
          
          // Scroll the sidebar item into view
          const listingItem = document.getElementById(`listing-item-${marker.listingIndex}`);
          if (listingItem) {
            listingItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
        
        newMarkers.push(marker);
      }
      
      setMarkers(newMarkers);
      
      // Set active listing to first one with an address
      const firstWithAddress = listings.findIndex(listing => listing.data.fields.fullAddress);
      if (firstWithAddress >= 0) {
        setActiveListingIndex(firstWithAddress);
      }
      
      // Force a resize event after a short delay to ensure the map renders correctly
      setTimeout(() => {
        if (map) {
          map.invalidateSize();
        }
      }, 100);
      
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };
  
  // Load Leaflet CSS and JS
  const loadLeaflet = async () => {
    // Skip if Leaflet is already loaded
    if (window.L) return;
    
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
      document.head.appendChild(link);
    }
    
    // Load JS
    return new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  };
  
  // Handle listing item click
  const handleListingClick = (index: number) => {
    setActiveListingIndex(index);
    
    // Open the corresponding marker popup
    const marker = markers()[index];
    if (marker && mapInstance()) {
      marker.openPopup();
      mapInstance().panTo(marker.getLatLng());
    }
  };
  
  // Initialize map on mount
  onMount(() => {
    // Delay the map initialization to ensure the container exists and has dimensions
    setTimeout(() => {
      initializeMap();
    }, 100);
  });
  
  // Clean up on unmount
  onCleanup(() => {
    if (mapInstance()) {
      mapInstance().remove();
    }
  });
  
  return (
    <div class="map-layout">
      <div class="sidebar">
        <div class="listing-list">
          <For each={listings}>
            {(listing, index) => (
              <Show when={listing.data.fields.fullAddress}>
                <div 
                  id={`listing-item-${index()}`}
                  class={`listing-item ${index() === activeListingIndex() ? 'active' : ''}`}
                  onClick={() => handleListingClick(index())}
                >
                  <h3>{listing.data.title}</h3>
                  <p>{listing.data.description.substring(0, 100)}...</p>
                  
                  <div class="listing-address">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>{listing.data.fields.fullAddress}</span>
                  </div>
                </div>
              </Show>
            )}
          </For>
          
          <Show when={!listings.some(listing => listing.data.fields.fullAddress)}>
            <div class="no-address-message">
              <p>None of the listings have addresses to display on the map.</p>
            </div>
          </Show>
        </div>
      </div>
      
      <div class="map-container">
        <div id="map"></div>
        
        <Show when={!mapInitialized()}>
          <div class="map-loading">
            <div class="spinner"></div>
            <p>Loading map...</p>
          </div>
        </Show>
      </div>
    </div>
  );
}