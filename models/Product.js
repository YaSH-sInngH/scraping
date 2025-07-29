import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: String,
  price: String,
  rating: String,
  url: String,
  category: String, // Original scraped category (e.g., 'Mobiles', 'Laptops')
  scrapedAt: {
    type: Date,
    default: Date.now
  }
});

export function getProductModel(categoryName) {
  return mongoose.models[categoryName] || mongoose.model(categoryName, productSchema, categoryName);
}