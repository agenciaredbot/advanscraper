/**
 * CSS selectors for Google Maps scraping
 * These may need updating as Google changes their DOM
 */
export const GOOGLE_MAPS_SELECTORS = {
  // Search
  searchBox: "#searchboxinput",
  searchButton: "#searchbox-searchbutton",

  // Results feed
  feedContainer: 'div[role="feed"]',
  resultItem: 'div[role="feed"] > div > div > a',
  resultItemAlt: 'div[role="article"]',

  // Business details panel
  businessName: "h1.DUwDvf",
  businessNameAlt: 'h1[data-attrid="title"]',
  rating: 'span[role="img"]',
  ratingValue: "span.ceNzKf",
  reviewCount: 'span[aria-label*="review"]',
  category: 'button[jsaction*="category"]',
  categoryAlt: "button.DkEaL",
  address: 'button[data-item-id="address"]',
  addressAlt: 'div[data-attrid="kc:/location/location:address"]',
  phone: 'button[data-item-id^="phone"]',
  phoneAlt: 'button[data-tooltip="Copy phone number"]',
  website: 'a[data-item-id="authority"]',
  websiteAlt: 'a[aria-label*="Website"]',

  // Hours & extra info
  hours: 'div[aria-label*="hours"]',

  // Back button from detail to list
  backButton: 'button[aria-label="Back"]',

  // "More places" / pagination
  nextPage: 'button[aria-label="Next page"]',
  endOfList: "p.fontBodyMedium span",
} as const;
