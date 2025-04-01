// src/themes/index.js
// Central registry of available themes

export const availableThemes = {
    default: {
      name: "Default",
      description: "Clean, professional design suitable for any directory type",
      colors: {
        primary: "#3366cc",
        secondary: "#ff9900",
        background: "#ffffff",
        text: "#333333",
        lightText: "#666666",
        accent: "#66aaff"
      },
      typography: {
        headingFont: "system-ui, sans-serif",
        bodyFont: "system-ui, sans-serif",
        baseSize: "16px",
        scale: 1.2
      },
      spacing: {
        base: "1rem",
        scale: 1.5
      },
      borderRadius: "8px",
      shadows: {
        small: "0 2px 4px rgba(0,0,0,0.1)",
        medium: "0 4px 8px rgba(0,0,0,0.1)",
        large: "0 8px 16px rgba(0,0,0,0.1)"
      }
    },
    elegant: {
      name: "Elegant",
      description: "Sophisticated design with serif fonts, ideal for culinary or artistic directories",
      colors: {
        primary: "#9c7c38",
        secondary: "#2c3e50",
        background: "#fcfcfc",
        text: "#2c3e50",
        lightText: "#7f8c8d",
        accent: "#d4af37"
      },
      typography: {
        headingFont: "Georgia, serif",
        bodyFont: "system-ui, sans-serif",
        baseSize: "16px",
        scale: 1.25
      },
      spacing: {
        base: "1.25rem",
        scale: 1.6
      },
      borderRadius: "4px",
      shadows: {
        small: "0 2px 4px rgba(0,0,0,0.05)",
        medium: "0 4px 12px rgba(0,0,0,0.05)",
        large: "0 8px 24px rgba(0,0,0,0.05)"
      }
    },
    nature: {
      name: "Nature",
      description: "Organic design with natural colors, perfect for outdoor or environmental directories",
      colors: {
        primary: "#4b7f52",
        secondary: "#f9a825",
        background: "#f8f9f4",
        text: "#2d3c2e",
        lightText: "#5a6b5b",
        accent: "#8bc34a"
      },
      typography: {
        headingFont: "system-ui, sans-serif",
        bodyFont: "system-ui, sans-serif",
        baseSize: "16px",
        scale: 1.2
      },
      spacing: {
        base: "1rem",
        scale: 1.4
      },
      borderRadius: "12px",
      shadows: {
        small: "0 3px 6px rgba(0,0,0,0.08)",
        medium: "0 6px 12px rgba(0,0,0,0.08)",
        large: "0 12px 24px rgba(0,0,0,0.08)"
      }
    },
    modern: {
      name: "Modern",
      description: "Clean, minimalist design with ample white space and bold accents",
      colors: {
        primary: "#0070f3",
        secondary: "#ff0080",
        background: "#ffffff",
        text: "#111111",
        lightText: "#555555",
        accent: "#7928ca"
      },
      typography: {
        headingFont: "system-ui, sans-serif",
        bodyFont: "system-ui, sans-serif",
        baseSize: "16px",
        scale: 1.3
      },
      spacing: {
        base: "1rem",
        scale: 1.5
      },
      borderRadius: "8px",
      shadows: {
        small: "0 4px 6px rgba(0,0,0,0.04)",
        medium: "0 8px 16px rgba(0,0,0,0.06)",
        large: "0 16px 32px rgba(0,0,0,0.08)"
      }
    }
  };
  
  // Get theme settings or fallback to default
  export function getThemeSettings(themeName) {
    return availableThemes[themeName] || availableThemes.default;
  }
  
  // Generate CSS variables from theme
  export function generateThemeVariables(theme) {
    const themeConfig = getThemeSettings(theme);
    
    return {
      // Colors
      '--primaryColor': themeConfig.colors.primary,
      '--primaryColor-rgb': hexToRgb(themeConfig.colors.primary),
      '--secondaryColor': themeConfig.colors.secondary,
      '--backgroundColor': themeConfig.colors.background,
      '--textColor': themeConfig.colors.text,
      '--textColorLight': themeConfig.colors.lightText,
      '--accentColor': themeConfig.colors.accent,
      
      // Typography
      '--fontHeading': themeConfig.typography.headingFont,
      '--fontBody': themeConfig.typography.bodyFont,
      '--fontSize': themeConfig.typography.baseSize,
      '--scaleRatio': themeConfig.typography.scale,
      
      // Spacing
      '--spacingBase': themeConfig.spacing.base,
      '--spacingRatio': themeConfig.spacing.scale,
      
      // Other
      '--borderRadius': themeConfig.borderRadius,
      '--shadowSmall': themeConfig.shadows.small,
      '--shadowMedium': themeConfig.shadows.medium,
      '--shadowLarge': themeConfig.shadows.large
    };
  }
  
  // Helper function to convert hex to RGB
  function hexToRgb(hex) {
    // Remove the hash if it exists
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Return as RGB string
    return `${r}, ${g}, ${b}`;
  }