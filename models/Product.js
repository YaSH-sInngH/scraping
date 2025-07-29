import mongoose from 'mongoose';
import { getParentCategory } from '../categoryMapping.js';

const productSchema = new mongoose.Schema({
  title: String,
  price: String,
  rating: String,
  url: String,
  category: String, // Original scraped category (e.g., 'Mobiles', 'Laptops')
  parentCategory: String, // Parent category (e.g., 'Electronics', 'TVs & Appliances')
  scrapedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to automatically set parent category
productSchema.pre('save', function(next) {
  if (this.category && !this.parentCategory) {
    this.parentCategory = getParentCategory(this.category);
  }
  next();
});

export function getProductModel(categoryName) {
  return mongoose.models[categoryName] || mongoose.model(categoryName, productSchema, categoryName);
}

// Function to get aggregated data by parent category
export async function getProductsByParentCategory(parentCategory) {
  const Product = mongoose.models[parentCategory] || mongoose.model(parentCategory, productSchema, parentCategory);
  
  // Get all subcategories for this parent category
  const { getSubcategories } = await import('../categoryMapping.js');
  const subcategories = getSubcategories(parentCategory);
  
  // Aggregate products from all subcategories
  const products = [];
  for (const subcategory of subcategories) {
    try {
      const subcategoryModel = getProductModel(subcategory);
      const subcategoryProducts = await subcategoryModel.find({}).lean();
      products.push(...subcategoryProducts.map(product => ({
        ...product,
        category: subcategory,
        parentCategory: parentCategory
      })));
    } catch (error) {
      console.log(`No data found for subcategory: ${subcategory}`);
    }
  }
  
  return products;
}

// Function to get category statistics
export async function getCategoryStats() {
  const { getAllParentCategories, getSubcategories } = await import('../categoryMapping.js');
  const parentCategories = getAllParentCategories();
  const stats = {};
  
  for (const parentCategory of parentCategories) {
    const subcategories = getSubcategories(parentCategory);
    let totalProducts = 0;
    const subcategoryStats = {};
    
    for (const subcategory of subcategories) {
      try {
        const subcategoryModel = getProductModel(subcategory);
        const count = await subcategoryModel.countDocuments();
        subcategoryStats[subcategory] = count;
        totalProducts += count;
      } catch (error) {
        subcategoryStats[subcategory] = 0;
      }
    }
    
    stats[parentCategory] = {
      totalProducts,
      subcategories: subcategoryStats
    };
  }
  
  return stats;
}