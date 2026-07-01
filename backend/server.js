const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Init Database
require('./database');

const requestRoutes = require('./routes/requests');
const offerRoutes = require('./routes/offers');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/requests', requestRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', database: 'SQLite' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
