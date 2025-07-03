// src/stores/directoryStore.ts
import { createStore } from 'solid-js/store';
import type { Directory, Listing, Category } from '../types';
import { getDirectory, getListings } from '@/lib/nocodb';

// Get the current directory ID from environment variable (single directory mode)
function getCurrentDirectoryId(): string {
  return import.meta.env.CURRENT_DIRECTORY || 'default';
}

// Initialize the directory store
interface DirectoryState {
  id: string;
  data: Directory | null;
  listings: Listing[];
  loading: boolean;
  error: string | null;
  currentLayout: string;
  initialized: boolean;
}

const initialState: DirectoryState = {
  id: getCurrentDirectoryId(),
  data: null,
  listings: [],
  loading: false,
  error: null,
  currentLayout: 'Card',
  initialized: false
};

// Create the store
const [directoryState, setDirectoryState] = createStore<DirectoryState>(initialState);

// Actions for the store
const directoryActions = {
  // Initialize the store with data
  async initialize() {
    if (directoryState.initialized) return;

    setDirectoryState('loading', true);
    setDirectoryState('error', null);
    
    try {
      // Fetch directory data from NocoDB
      const directoryData = await getDirectory(directoryState.id);
      
      if (!directoryData) {
        throw new Error(`Directory not found: ${directoryState.id}`);
      }
      
      // Set directory data
      setDirectoryState('data', directoryData.data);
      
      // Set initial layout
      const defaultLayout = directoryData.data.defaultLayout || 'Card';
      setDirectoryState('currentLayout', defaultLayout);
      
      // Check URL for layout parameter
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const layoutParam = urlParams.get('layout');
        
        if (layoutParam && directoryData.data.availableLayouts.includes(layoutParam)) {
          setDirectoryState('currentLayout', layoutParam);
        }
      }
      
      // Fetch listings from NocoDB
      const listings = await getListings(directoryState.id);
      setDirectoryState('listings', listings);
      
      // Mark as initialized
      setDirectoryState('initialized', true);
    } catch (error) {
      console.error('Error initializing directory store:', error);
      setDirectoryState('error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setDirectoryState('loading', false);
    }
  },
  
  // Change the current layout
  setLayout(layout: string) {
    if (directoryState.data && directoryState.data.availableLayouts.includes(layout)) {
      setDirectoryState('currentLayout', layout);
      
      // Update URL if in browser
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('layout', layout);
        window.history.pushState({}, '', url);
      }
    }
  },
  
  // Get category by ID
  getCategory(id: string): Category | undefined {
    if (!directoryState.data) return undefined;
    return directoryState.data.categories.find(cat => cat.id === id);
  }
};

// Export both state and actions
export { directoryState, directoryActions };