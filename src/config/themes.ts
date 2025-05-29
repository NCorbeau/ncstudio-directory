export interface ThemeConfig {
  name: string;
  layout: 'standard' | 'horizontal' | 'minimal' | 'feature-rich';
  elements: {
    showFeaturedBadge: boolean;
    showCategory: boolean;
    showRating: boolean;
    showAddress: boolean;
    showTags: boolean;
    categoryPosition: 'top' | 'bottom' | 'overlay';
    ratingPosition: 'top' | 'bottom' | 'inline';
    maxTags: number;
  };
  styling: {
    borderRadius: string;
    cardPadding: string;
    imageHeight: string;
    hoverTransform: string;
    shadowIntensity: 'light' | 'medium' | 'heavy';
  };
}

export const themeConfigs: Record<string, ThemeConfig> = {
  default: {
    name: 'Default',
    layout: 'standard',
    elements: {
      showFeaturedBadge: true,
      showCategory: true,
      showRating: true,
      showAddress: true,
      showTags: true,
      categoryPosition: 'bottom',
      ratingPosition: 'bottom',
      maxTags: 3,
    },
    styling: {
      borderRadius: '8px',
      cardPadding: '1.5rem',
      imageHeight: '200px',
      hoverTransform: 'translateY(-5px)',
      shadowIntensity: 'medium',
    },
  },

  nature: {
    name: 'Nature',
    layout: 'feature-rich',
    elements: {
      showFeaturedBadge: true,
      showCategory: true,
      showRating: true,
      showAddress: true,
      showTags: true,
      categoryPosition: 'overlay',
      ratingPosition: 'top',
      maxTags: 3,
    },
    styling: {
      borderRadius: '12px',
      cardPadding: '1.5rem',
      imageHeight: '200px',
      hoverTransform: 'translateY(-6px)',
      shadowIntensity: 'heavy',
    },
  },

  modern: {
    name: 'Modern',
    layout: 'standard',
    elements: {
      showFeaturedBadge: true,
      showCategory: true,
      showRating: true,
      showAddress: true,
      showTags: true,
      categoryPosition: 'top',
      ratingPosition: 'top',
      maxTags: 2,
    },
    styling: {
      borderRadius: '16px',
      cardPadding: '1.5rem',
      imageHeight: '220px',
      hoverTransform: 'translateY(-8px)',
      shadowIntensity: 'heavy',
    },
  },

  elegant: {
    name: 'Elegant',
    layout: 'horizontal',
    elements: {
      showFeaturedBadge: true,
      showCategory: true,
      showRating: true,
      showAddress: true,
      showTags: false,
      categoryPosition: 'top',
      ratingPosition: 'bottom',
      maxTags: 0,
    },
    styling: {
      borderRadius: '4px',
      cardPadding: '1.5rem',
      imageHeight: '100%',
      hoverTransform: 'translateY(-3px)',
      shadowIntensity: 'light',
    },
  },
};

export function getThemeConfig(themeName: string): ThemeConfig {
  return themeConfigs[themeName] || themeConfigs.default;
} 