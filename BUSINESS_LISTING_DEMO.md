# 🍜 Business Listing Card Demo - Restaurant Directory

## 🎯 Overview

Your new listing card system now supports rich business data with a modern, flexible approach that maximizes usefulness while maintaining beautiful design. Here's how it handles your restaurant directory data:

## 📊 Sample Data Structure

```json
{
  "title": "Miska Pho & BubbleFly",
  "description": "Authentic Vietnamese restaurant serving pho and bubble tea",
  "directory": "warsaw-restaurants",
  "category": "vietnamese-restaurant",
  "featured": true,
  "images": ["https://example.com/miska-pho-1.jpg"],
  "tags": ["vietnamese", "pho", "bubble-tea"],
  "fields": {
    "businessName": "Miska Pho & BubbleFly",
    "googleMapsrating": 4.7,
    "reviewCount": 683,
    "fullAddress": "Złota 6, 00-019 Warszawa, Poland",
    "neighborhood": "Śródmieście",
    "city": "Warsaw",
    "countryCode": "PL",
    "phone": "+48 532 317 586",
    "website": "https://www.facebook.com/miskapho/",
    "openingHours": "Monday: 11 AM to 9:30 PM, Tuesday: 11 AM to 9:30 PM...",
    "coordinates": "52.2330616,21.0114063",
    "isOpen": true,
    "imageCount": 460,
    "reviewDistribution": {
      "oneStar": 17,
      "twoStar": 12,
      "threeStar": 17,
      "fourStar": 50,
      "fiveStar": 587
    },
    "topReviewTags": "prices (31), service (25), bubble tea (15), broth (9), spring rolls (8)"
  }
}
```

## 🎨 How Data is Displayed

### **🏪 Business Name & Category**
The system automatically uses `fields.businessName` if available, otherwise falls back to `title`:
```astro
<h3 class="card-title">Miska Pho & BubbleFly</h3>
<div class="card-category">vietnamese-restaurant</div>
```

### **⭐ Enhanced Rating System**
Automatically prefers `googleMapsrating` over legacy `rating`:
```astro
<EnhancedRating 
  rating={4.7} 
  reviewCount={683}
  theme="modern" 
  size="medium"
/>
```
**Displays:** ⭐⭐⭐⭐⭐ 4.7 (683)

### **🟢 Business Status**
```astro
<BusinessStatus 
  isOpen={true}
  openingHours="Monday: 11 AM to 9:30 PM..."
  theme="modern"
/>
```
**Displays:** 🟢 Open • 11 AM to 9:30 PM

### **📍 Smart Location Display**
Uses `neighborhood` and `city` from fields, with Google Maps integration via `coordinates`:
```astro
<div class="card-location">
  <a href="https://maps.google.com/?q=52.2330616,21.0114063">
    📍 Śródmieście, Warsaw
  </a>
</div>
```

### **📞 Contact Information**
```astro
<ContactInfo 
  phone="+48 532 317 586"
  website="https://www.facebook.com/miskapho/"
  theme="modern"
/>
```
**Displays:** 📞 +48 532 317 586 • 🌐 facebook.com/miskapho

### **🏷️ Smart Tag System**
Automatically parses `topReviewTags` or uses standard `tags`:
```astro
<CardTags 
  tags={["prices", "service", "bubble tea", "broth", "spring rolls"]} 
  maxTags={3} 
  theme="modern" 
  showMore={true} 
/>
```
**Displays:** prices • service • bubble tea • +2

## 🎨 Theme Variations

### **🌿 Nature Theme - Feature Rich**
```astro
<ListingCard listing={restaurantListing} url="/restaurant/miska-pho" theme="nature" />
```

**Features:**
- 🖼️ Large image (200px) with overlay category
- ⭐ Rating displayed at top with review count
- 🟢 Business status prominently shown
- 📍 Clickable Google Maps location
- 📞 Contact info in horizontal layout
- 🏷️ Up to 3 tags with "show more" indicator
- 🎨 Green accent border that expands on hover

### **🔥 Modern Theme - Clean & Bold**
```astro
<ListingCard listing={restaurantListing} url="/restaurant/miska-pho" theme="modern" />
```

**Features:**
- 🖼️ Extra large image (220px) with rounded corners
- ⭐ Bold rating display at top
- 🟢 Status with strong typography
- 📍 Clean location links
- 📞 Contact with modern icons
- 🏷️ Limited to 2 tags for clean look
- 🎨 Strong hover animations and shadows

### **✨ Elegant Theme - Horizontal Layout**
```astro
<ListingCard listing={restaurantListing} url="/restaurant/miska-pho" theme="elegant" />
```

**Features:**
- 🖼️ Side-by-side image and content
- ⭐ Rating displayed at bottom
- 🟢 Italicized status text
- 📍 Serif typography for elegance
- 📞 Vertical contact layout
- 🏷️ No tags for minimal design
- 🎨 Subtle shadows and serif fonts

## 💻 Usage Examples

### **Basic Usage**
```astro
---
import ListingCard from "@/components/core/ListingCard.astro";

const restaurantData = {
  title: "Miska Pho & BubbleFly",
  description: "Authentic Vietnamese restaurant",
  directory: "warsaw-restaurants",
  category: "vietnamese-restaurant",
  featured: true,
  images: ["https://example.com/miska-pho.jpg"],
  tags: ["vietnamese", "pho"],
  fields: {
    businessName: "Miska Pho & BubbleFly",
    googleMapsrating: 4.7,
    reviewCount: 683,
    fullAddress: "Złota 6, 00-019 Warszawa, Poland",
    neighborhood: "Śródmieście",
    city: "Warsaw",
    phone: "+48 532 317 586",
    website: "https://www.facebook.com/miskapho/",
    isOpen: true,
    coordinates: "52.2330616,21.0114063",
    topReviewTags: "prices (31), service (25), bubble tea (15)"
  }
};
---

<ListingCard 
  listing={restaurantData} 
  url="/restaurants/miska-pho" 
  theme="modern" 
/>
```

### **Legacy Support**
Your existing listings still work perfectly:
```astro
---
const legacyListing = {
  title: "Old Restaurant",
  description: "Traditional listing format",
  directory: "restaurants",
  category: "restaurant",
  featured: false,
  images: ["image.jpg"],
  tags: ["food"],
  fields: {
    rating: 4.2,
    address: "123 Main St",
    phone: "555-1234"
  }
};
---

<ListingCard listing={legacyListing} url="/restaurants/old" theme="nature" />
```

### **Grid Layout**
```astro
<div class="listings-grid">
  {restaurants.map(restaurant => (
    <ListingCard 
      listing={restaurant} 
      url={`/restaurants/${restaurant.slug}`} 
      theme="nature" 
    />
  ))}
</div>

<style>
  .listings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }
</style>
```

## 🔧 Data Normalization

The system automatically handles different data formats:

### **Business Listings (New Format)**
```typescript
{
  title: "Restaurant Name",
  fields: {
    businessName: "Restaurant Name",      // Used as title if available
    googleMapsrating: 4.7,              // Used as rating
    fullAddress: "123 Main St",          // Used as address
    neighborhood: "Downtown",            // Used for location
    city: "City",                        // Used for location
    topReviewTags: "prices (31), service (25)"  // Parsed into tags array
  }
}
```

### **Legacy Listings (Existing Format)**
```typescript
{
  title: "Restaurant Name",              // Used as title
  tags: ["tag1", "tag2"],               // Used as tags
  fields: {
    rating: 4.2,                        // Used as rating
    address: "123 Main St"              // Used as address
  }
}
```

## 🚀 Advanced Features

### **Automatic Field Priority**
The normalization system intelligently prioritizes fields:

- **Title:** `fields.businessName` → `title`
- **Rating:** `fields.googleMapsrating` → `fields.rating`
- **Address:** `fields.fullAddress` → `fields.address`
- **Tags:** `parseTopReviewTags(fields.topReviewTags)` → `tags`

### **Smart Location Handling**
```typescript
// Automatically formats best available location
formatLocation(listing) // "Śródmieście, Warsaw"
getGoogleMapsUrl(listing) // Uses coordinates or address
```

### **Review Tag Processing**
```typescript
// Input: "prices (31), service (25), bubble tea (15)"
// Output: ["prices", "service", "bubble tea", "broth", "spring rolls"]
parseTopReviewTags(listing.fields.topReviewTags)
```

## 📱 Responsive Design

As referenced in the [official Astro component documentation](https://docs.astro.build/en/basics/astro-components/), our components follow Astro's best practices for:

- **Server-side rendering** with zero JavaScript by default
- **Component-based design** with reusable, flexible elements
- **Slot-based composition** for maximum flexibility

### **Mobile Optimizations**
- **Images:** Automatically scale to 180px height on mobile
- **Layout:** Horizontal themes stack vertically on mobile
- **Contact:** Phone and website stack on small screens
- **Tags:** Reduce to 2 tags on mobile for space
- **Typography:** Slightly smaller text on mobile

## 🎯 Benefits for Restaurant Directory

### **🔍 SEO Optimized**
- **Rich snippets** ready with structured data
- **Fast loading** with optimized images (following Astro's image optimization patterns)
- **Mobile-first** responsive design
- **Semantic HTML** for accessibility

### **📊 User Experience**
- **Quick scanning** with visual hierarchy
- **Essential info** at a glance (rating, status, location)
- **Easy contact** with click-to-call and website links
- **Visual appeal** with modern card design

### **⚡ Performance**
- **Zero JavaScript** for static content (Astro's strength)
- **Lazy loading** images
- **Shared components** reduce bundle size
- **CSS custom properties** for efficient theming

### **🔧 Maintainability**
- **Single ListingData structure** with flexible fields
- **Type-safe** data handling
- **Backward compatible** with existing listings
- **Easy field addition** without breaking changes

---

**🎉 Your restaurant directory now has a unified, flexible listing card system that seamlessly handles both new business data and existing listings while maintaining excellent design and performance standards!**

*Built following [Astro's component best practices](https://docs.astro.build/en/basics/astro-components/) for optimal performance and maintainability.* 