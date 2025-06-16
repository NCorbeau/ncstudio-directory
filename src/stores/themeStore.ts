import { createStore } from 'solid-js/store';

// Theme store interface
interface ThemeState {
  isDarkMode: boolean;
  initialized: boolean;
}

// Initialize with system preference or localStorage
function getInitialTheme(): boolean {
  if (typeof window === 'undefined') {
    return false; // Default to light mode on server
  }

  // Check localStorage first
  const saved = localStorage.getItem('darkMode');
  if (saved !== null) {
    return saved === 'true';
  }

  // Fall back to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const initialState: ThemeState = {
  isDarkMode: false, // Will be updated after hydration
  initialized: false
};

// Create the store
const [themeState, setThemeState] = createStore<ThemeState>(initialState);

// Actions for the theme store
const themeActions = {
  // Initialize theme from localStorage and system preference
  initialize() {
    if (themeState.initialized) return;

    const isDark = getInitialTheme();
    setThemeState('isDarkMode', isDark);
    setThemeState('initialized', true);
    
    // Apply theme to document
    this.applyTheme(isDark);
  },

  // Toggle dark mode
  toggle() {
    const newMode = !themeState.isDarkMode;
    setThemeState('isDarkMode', newMode);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', newMode.toString());
    }
    
    // Apply theme to document
    this.applyTheme(newMode);
  },

  // Set dark mode explicitly
  setDarkMode(isDark: boolean) {
    if (themeState.isDarkMode === isDark) return;
    
    setThemeState('isDarkMode', isDark);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', isDark.toString());
    }
    
    // Apply theme to document
    this.applyTheme(isDark);
  },

  // Apply theme to document
  applyTheme(isDark: boolean) {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Update meta theme-color for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDark ? '#1a1a1a' : '#ffffff');
    }
  }
};

// Export both state and actions
export { themeState, themeActions }; 