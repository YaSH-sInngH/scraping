// Category mapping configuration
// This maps individual scraped categories to their parent categories for better organization

export const categoryMapping = {
  // Electronics Category
  'Electronics': {
    name: 'Electronics',
    description: 'Electronic devices and gadgets',
    subcategories: [
      'Mobiles',
      'Laptops', 
      'Tablets',
      'Headphones',
      'Smart Watches',
      'Gaming Consoles'
    ]
  },

  // TVs & Appliances Category
  'TVs & Appliances': {
    name: 'TVs & Appliances',
    description: 'Home entertainment and household appliances',
    subcategories: [
      'TVs',
      'Refrigerators',
      'Washing Machines',
      'Air Conditioners',
      'Appliances',
      'Home & Kitchen'
    ]
  },

  // Men Category
  'Men': {
    name: 'Men',
    description: 'Products for men',
    subcategories: [
      'Men Clothing',
      'Shoes',
      'Ethnic Wear'
    ]
  },

  // Women Category
  'Women': {
    name: 'Women',
    description: 'Products for women',
    subcategories: [
      'Women Clothing',
      'Bags',
      'Jewelry'
    ]
  },

  // Baby & Kids Category
  'Baby & Kids': {
    name: 'Baby & Kids',
    description: 'Products for babies and children',
    subcategories: [
      'Toys'
    ]
  },

  // Sports, Books & More Category
  'Sports, Books & More': {
    name: 'Sports, Books & More',
    description: 'Sports equipment, books, and other items',
    subcategories: [
      'Books',
      'Sports'
    ]
  }
};

// Function to get parent category for a given subcategory
export function getParentCategory(subcategory) {
  for (const [parentCategory, config] of Object.entries(categoryMapping)) {
    if (config.subcategories.includes(subcategory)) {
      return parentCategory;
    }
  }
  return 'Other'; // Default category for unmapped items
}

// Function to get all subcategories for a parent category
export function getSubcategories(parentCategory) {
  return categoryMapping[parentCategory]?.subcategories || [];
}

// Function to get all parent categories
export function getAllParentCategories() {
  return Object.keys(categoryMapping);
}

// Function to get category hierarchy
export function getCategoryHierarchy() {
  return categoryMapping;
}

// Function to check if a category is mapped
export function isCategoryMapped(category) {
  for (const config of Object.values(categoryMapping)) {
    if (config.subcategories.includes(category)) {
      return true;
    }
  }
  return false;
} 