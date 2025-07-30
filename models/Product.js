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
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: props => `${props.value} is not a valid URL!`,
    }
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true, // Optional: index for filtering
  },
  scrapedAt: {
    type: Date,
    default: Date.now,
    index: true, // Optional: useful for sorting or cleanup
  }
});

export function getProductModel(categoryName) {
  return mongoose.models[categoryName] || mongoose.model(categoryName, productSchema, categoryName);
}