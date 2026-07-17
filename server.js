const express = require('express');
require('dotenv').config();

const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', orderRoutes);
app.use('/api', userRoutes);

// simple 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
