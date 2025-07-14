import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import formRoutes from './routes/formRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/form', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// API routes
app.use('/api/form', formRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
