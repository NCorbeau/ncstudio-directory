// src/scripts/layoutSwitcher.js

/**
 * Client-side layout switching functionality
 * @param {Array} availableLayouts - Available layout options
 * @param {string} defaultLayout - Default layout to use
 * @param {string} initialLayout - Initially selected layout
 * @param {string} directoryId - Current directory ID
 */
export function initLayoutSwitcher(availableLayouts, defaultLayout, initialLayout, directoryId) {
    // Function to switch layouts without page reload
    function switchToLayout(layout) {
      if (!availableLayouts.includes(layout)) {
        console.error(`Invalid layout: ${layout}`);
        return;
      }
      
      console.log(`Switching to layout: ${layout}`);
      
      // Hide all layouts
      document.querySelectorAll('.layout-content').forEach(el => {
        el.style.display = 'none';
      });
      
      // Show the selected layout
      const layoutElement = document.getElementById(`${layout.toLowerCase()}-layout`);
      if (layoutElement) {
        layoutElement.style.display = '';
      }
      
      // Update layout switcher active state
      document.querySelectorAll('.layout-option').forEach(option => {
        option.classList.toggle('active', option.dataset.layout === layout);
      });
      
      // Update URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.set('layout', layout);
      window.history.pushState({}, '', url);
      
      // Store current layout to avoid unnecessary switches
      window.currentLayout = layout;
    }
    
    // When page loads, check URL for layout parameter
    document.addEventListener('DOMContentLoaded', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const layoutParam = urlParams.get('layout');
      
      // If URL has a valid layout parameter and it's different from what's shown
      if (layoutParam && availableLayouts.includes(layoutParam) && layoutParam !== initialLayout) {
        // Switch to that layout
        switchToLayout(layoutParam);
      }
    });
    
    // Listen for layout change events from LayoutSwitcher
    document.addEventListener('layoutchange', (e) => {
      const newLayout = e.detail.layout;
      
      // Only switch if it's different from the current layout
      if (newLayout && newLayout !== window.currentLayout) {
        switchToLayout(newLayout);
      }
    });
    
    // Make the function available globally
    window.switchToLayout = switchToLayout;
    
    // Initialize current layout
    window.currentLayout = initialLayout;
  }