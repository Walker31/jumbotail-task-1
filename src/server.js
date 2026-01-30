import 'dotenv/config';
import { listen } from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

// Attempt to connect to MongoDB, but do not block server start if connection fails
connectDB(MONGO_URI).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.warn('Could not connect to MongoDB; continuing without DB. Error:', err.message || err);
});

listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
