import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productId: { type: String, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  sales: { type: Number, default: 0 }, // For ranking
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }, // Flexible for diverse electronics
  category: { type: String, default: '' },
  source: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Create a text index for the search functionality
productSchema.index({ title: 'text', description: 'text' });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;