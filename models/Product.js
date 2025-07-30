import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: String,
    required: true,
    min: 0,
  },
  originalPrice: String,
  rating: {
    type: Number,
    min: 0,
    max: 5,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  scrapeAt: {
    type: Date,
    default: Date.now,
  }
});

export function getProductModel(categoryName) {
  return mongoose.models[categoryName] || mongoose.model(categoryName, productSchema, categoryName);
}