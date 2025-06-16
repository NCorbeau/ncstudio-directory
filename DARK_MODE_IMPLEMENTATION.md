# Dark Mode Implementation

This document outlines the complete dark mode implementation for the Astro directory application.

## Overview

The dark mode system provides:
- ✅ Toggle button in the header navigation
- ✅ Automatic system preference detection
- ✅ Persistent user preference storage
- ✅ No flash of unstyled content (FOUC)
- ✅ Support for all existing themes (nature, modern, elegant, default)
- ✅ Accessible keyboard navigation and ARIA labels
- ✅ Mobile responsive design

## Implementation Details

### 1. Theme Store (SolidJS Alternative)
Instead of using a SolidJS store, the implementation uses vanilla JavaScript for maximum compatibility:

**Location**: `src/components/ui/DarkModeToggle.astro`
- Embedded script handles theme state management
- LocalStorage persistence
- System preference detection
- No external dependencies

### 2. Dark Mode Toggle Component
**File**: `src/components/ui/DarkModeToggle.astro`

Features:
- Animated sun/moon icons
- Smooth toggle animation
- Theme-aware styling
- Accessible ARIA labels
- Mobile-friendly design

```astro
<!-- Usage in header -->
<DarkModeToggle />
```

### 3. Header Integration
**File**: `src/components/core/Header.astro`

The toggle is integrated into the navigation:
```astro
<li class="dark-mode-toggle-container">
  <DarkModeToggle />
</li>
```

### 4. Dark Mode CSS
**File**: `src/styles/themes/dark.css`

Comprehensive dark mode styles including:
- Root CSS variables for dark theme
- Component-specific dark styles
- Theme-specific overrides (nature, modern, elegant)
- Accessibility considerations
- Print styles optimization

### 5. Flash Prevention
**File**: `src/layouts/BaseLayout.astro`

Inline script prevents FOUC:
```javascript
<script is:inline>
  (function() {
    const saved = localStorage.getItem('darkMode');
    const isDark = saved !== null 
      ? saved === 'true' 
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

## CSS Architecture

### Dark Mode Variables
```css
:root.dark {
  --backgroundColor: #0f0f0f;
  --textColor: #e5e5e5;
  --textSecondary: #a3a3a3;
  --borderColor: #262626;
  --cardBackground: #1a1a1a;
  --inputBackground: #262626;
  --inputBorder: #404040;
  --header-background: #1a1a1a;
  --text-on-primary: #e5e5e5;
}
```

### Theme-Specific Overrides
Each theme has customized dark mode colors:

**Nature Theme Dark Mode:**
```css
.dark.theme-nature {
  --backgroundColor: #0a0f0a;
  --cardBackground: #141a14;
  --borderColor: #1f2d1f;
}
```

**Modern Theme Dark Mode:**
```css
.dark.theme-modern {
  --backgroundColor: #0f0f0f;
  --cardBackground: #1a1a1a;
  --borderColor: #2a2a2a;
}
```

**Elegant Theme Dark Mode:**
```css
.dark.theme-elegant {
  --backgroundColor: #0a0a0a;
  --cardBackground: #161616;
  --borderColor: #2d2d2d;
}
```

## JavaScript Functionality

The `ThemeManager` class handles all dark mode logic:

```javascript
class ThemeManager {
  private isDarkMode: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
    this.setupToggle();
  }

  private initialize() {
    // Check localStorage -> system preference -> default light
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      this.isDarkMode = saved === 'true';
    } else {
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyTheme(this.isDarkMode);
  }

  private applyTheme(isDark: boolean) {
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
}
```

## Accessibility Features

- **Keyboard Navigation**: Toggle can be activated with Enter/Space
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **High Contrast**: Dark mode provides better contrast ratios
- **Reduced Motion**: Respects `prefers-reduced-motion` setting
- **Focus Indicators**: Visible focus rings in both themes

## Browser Support

- **Modern Browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **Older Browsers**: Graceful degradation (defaults to light mode)
- **Mobile Browsers**: Full support with theme-color meta tag updates

## File Structure

```
src/
├── components/
│   ├── core/
│   │   └── Header.astro                 # Toggle integration
│   └── ui/
│       └── DarkModeToggle.astro        # Toggle component
├── layouts/
│   ├── BaseLayout.astro                # FOUC prevention
│   └── DirectoryLayout.astro           # Dark CSS import
├── stores/
│   └── themeStore.ts                   # SolidJS store (unused)
└── styles/
    └── themes/
        └── dark.css                    # Dark mode styles
```

## Usage Examples

### Basic Usage
The toggle appears automatically in all headers across the application.

### Programmatic Control
```javascript
// Access the theme manager
const themeManager = new ThemeManager();

// Set dark mode programmatically
themeManager.setDarkMode(true);

// Toggle current mode
themeManager.toggle();

// Check current state
console.log(themeManager.isDarkMode);
```

### Custom Styling
```css
/* Add custom dark mode styles */
.dark .custom-component {
  background-color: var(--cardBackground);
  color: var(--textColor);
  border-color: var(--borderColor);
}
```

## Testing Checklist

- [x] Toggle appears in header navigation
- [x] Click toggles between light/dark modes
- [x] Preference persists across page reloads
- [x] System preference detection works
- [x] No flash of unstyled content
- [x] All themes work in dark mode
- [x] Mobile responsive design
- [x] Keyboard accessibility
- [x] Screen reader compatibility
- [x] Print styles optimization

## Performance Considerations

- **FOUC Prevention**: Inline script runs before page render
- **CSS Loading**: Dark styles loaded with other theme CSS
- **Bundle Size**: ~15KB additional CSS (compressed ~4KB)
- **Runtime Impact**: Minimal JavaScript overhead
- **LocalStorage**: Efficient preference persistence

## Future Enhancements

Potential improvements:
- Auto dark mode based on time of day
- Multiple dark theme variants
- System theme change detection
- Animations for smoother transitions
- Integration with user preferences API

## Troubleshooting

### Common Issues

**Toggle not appearing:**
- Check that `DarkModeToggle.astro` is imported in Header
- Verify CSS is loading correctly

**FOUC occurring:**
- Ensure inline script is in `<head>` section
- Check script execution order

**Styles not applying:**
- Verify `dark.css` is imported in layout
- Check CSS specificity conflicts

**LocalStorage not working:**
- Ensure HTTPS or localhost environment
- Check browser privacy settings

## Browser DevTools Testing

```javascript
// Test in browser console:

// Check current theme
document.documentElement.classList.contains('dark');

// Toggle programmatically
document.querySelector('.dark-mode-toggle').click();

// Check localStorage
localStorage.getItem('darkMode');

// Test system preference
window.matchMedia('(prefers-color-scheme: dark)').matches;
```

This implementation provides a robust, accessible, and performant dark mode system that integrates seamlessly with the existing theme architecture. 