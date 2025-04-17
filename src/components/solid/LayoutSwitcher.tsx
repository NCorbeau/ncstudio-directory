import { createSignal, onMount } from 'solid-js';
import type { LayoutSwitcherProps } from '../../types';

// Map layout IDs to readable names and icons
const layoutInfo = {
  Map: { name: "Map View", icon: "map" },
  Card: { name: "Card View", icon: "grid" },
  Table: { name: "Table View", icon: "list-table" },
  Magazine: { name: "Magazine", icon: "layout" },
  List: { name: "List View", icon: "list" }
};

export default function LayoutSwitcher(props: LayoutSwitcherProps) {
  const { availableLayouts, currentLayout, directoryId, searchParams = '' } = props;
  
  // State for the active layout
  const [activeLayout, setActiveLayout] = createSignal(currentLayout);

  // Parse search params
  const parseParams = () => {
    if (typeof window === 'undefined') return new URLSearchParams(searchParams);
    return new URLSearchParams(window.location.search);
  };
  
  // Switch layout and update URL
  const switchLayout = (layout: string) => {
    if (!availableLayouts.includes(layout)) return;
    
    setActiveLayout(layout);
    
    // Update URL without page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);
      params.set('layout', layout);
      url.search = params.toString();
      
      // Update URL without full navigation
      window.history.pushState({}, '', url);
      
      // Dispatch custom event for other components to listen to
      const event = new CustomEvent('layoutchange', { 
        detail: { layout } 
      });
      document.dispatchEvent(event);
    }
  };
  
  // Check URL on mount to set initial layout
  onMount(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const layoutParam = urlParams.get('layout');
      
      if (layoutParam && availableLayouts.includes(layoutParam)) {
        setActiveLayout(layoutParam);
      }
    }
  });

  // Build the base URL for switching layouts
  const baseUrl = `/${directoryId}`;
  
  return (
    <div class="layout-switcher">
      <span class="layout-label">View:</span>
      
      <div class="layout-options">
        {availableLayouts.map(layout => {
          // Clone the query params and set the layout
          const layoutParams = parseParams();
          layoutParams.set('layout', layout);
          
          // Build the URL for this layout
          const layoutUrl = `${baseUrl}?${layoutParams.toString()}`;
          
          const isActive = activeLayout() === layout;
          
          return (
            <a 
              href={layoutUrl} 
              class={`layout-option ${isActive ? 'active' : ''}`}
              title={layoutInfo[layout]?.name || layout}
              aria-label={`Switch to ${layoutInfo[layout]?.name || layout}`}
              data-layout={layout}
              onClick={(e) => {
                e.preventDefault();
                switchLayout(layout);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                {layout === 'Map' && (
                  <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zm7-4v16m8-12v16" />
                )}
                {layout === 'Card' && (
                  <path d="M10 3H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zm10 0h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM10 13H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1zm10 0h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1z" />
                )}
                {layout === 'Table' && (
                  <path d="M3 3h18v18H3zm0 9h18M9 3v18" />
                )}
                {layout === 'Magazine' && (
                  <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 8h14M9 21V11" />
                )}
                {layout === 'List' && (
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                )}
              </svg>
              <span class="layout-name">{layoutInfo[layout]?.name || layout}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}