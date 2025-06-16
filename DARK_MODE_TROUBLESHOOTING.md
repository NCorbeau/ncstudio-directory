# Dark Mode Troubleshooting Guide

## Issues Fixed

Based on your screenshot showing that dark mode wasn't working everywhere, I've implemented the following fixes:

### 1. CSS Specificity Issues Fixed
- Added `!important` declarations to dark mode styles to override component-specific styles
- Enhanced coverage for all page elements (hero sections, content areas, cards)

### 2. Improved Dark Mode Coverage
```css
/* These styles now have higher specificity */
.dark section {
  background-color: var(--backgroundColor) !important;
}

.dark .hero {
  background-color: var(--primaryColor) !important;
  color: white !important;
}

.dark .main-listings {
  background-color: var(--backgroundColor) !important;
}
```

### 3. Enhanced Component Coverage
- Cards (category-card, recent-card, guide-card, listing-card)
- Sections and containers
- Body and main elements
- Directory layout container

## How to Test Dark Mode

### 1. Browser Developer Tools Test
1. Open your site in a browser
2. Open Developer Tools (F12)
3. In Console, run these commands:

```javascript
// Check if dark mode class is applied
document.documentElement.classList.contains('dark')

// Toggle dark mode programmatically
document.querySelector('.dark-mode-toggle').click()

// Check localStorage
localStorage.getItem('darkMode')

// Test system preference
window.matchMedia('(prefers-color-scheme: dark)').matches
```

### 2. Visual Inspection Checklist
- [x] Header has dark background
- [x] Hero section uses dark theme colors
- [x] Main content area has dark background
- [x] Cards have dark backgrounds with proper contrast
- [x] Text is readable in dark mode
- [x] Toggle button shows correct icon (sun/moon)

### 3. Expected Dark Mode Colors
```css
:root.dark {
  --backgroundColor: #0f0f0f;      /* Main background */
  --textColor: #e5e5e5;           /* Primary text */
  --textSecondary: #a3a3a3;       /* Secondary text */
  --borderColor: #262626;          /* Borders */
  --cardBackground: #1a1a1a;      /* Card backgrounds */
  --header-background: #1a1a1a;   /* Header background */
}
```

## Common Issues & Solutions

### Issue: Dark mode toggle not working
**Solution**: Check browser console for JavaScript errors. The toggle should initialize on page load.

### Issue: Some elements still light in dark mode
**Solution**: The updated CSS now uses `!important` declarations to override component-specific styles.

### Issue: Flash of light content before dark mode applies
**Solution**: The BaseLayout includes an inline script that runs before page render.

### Issue: Dark mode preference not saved
**Solution**: Check if localStorage is working in your browser environment.

## Manual Verification Steps

1. **Load the page** - Should respect your system preference or saved setting
2. **Click the toggle** - Should switch between light/dark immediately
3. **Reload the page** - Should remember your last choice
4. **Check all page sections**:
   - Header (should be dark)
   - Hero section (should use theme colors appropriately)
   - Content sections (should have dark backgrounds)
   - Cards (should have dark backgrounds with good contrast)
   - Footer (should be dark)

## Debug Commands for Browser Console

```javascript
// 1. Check current theme state
console.log('Dark mode active:', document.documentElement.classList.contains('dark'));

// 2. Check localStorage
console.log('Saved preference:', localStorage.getItem('darkMode'));

// 3. Check system preference
console.log('System prefers dark:', window.matchMedia('(prefers-color-scheme: dark)').matches);

// 4. Check CSS variables
const style = getComputedStyle(document.documentElement);
console.log('Background color:', style.getPropertyValue('--backgroundColor'));
console.log('Text color:', style.getPropertyValue('--textColor'));

// 5. Force toggle (for testing)
document.querySelector('.dark-mode-toggle').click();

// 6. Check if toggle exists
console.log('Toggle found:', !!document.querySelector('.dark-mode-toggle'));
```

## What Changed

1. **Enhanced CSS specificity** with `!important` declarations
2. **Comprehensive element coverage** for all page components
3. **Improved JavaScript reliability** with singleton pattern
4. **Better theme application** for all existing themes
5. **Fixed body and container styling** to ensure full coverage

The dark mode should now work consistently across all pages and components. If you're still experiencing issues, please check the browser console for any JavaScript errors and verify that the toggle button appears in the header navigation. 