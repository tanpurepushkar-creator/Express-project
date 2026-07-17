const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobileRegex = /^[0-9]{10}$/;

// POST /api/users/validate
// Checks email format, mobile format, duplicates and active status.
router.post('/users/validate', async (req, res) => {
  const { email, mobile } = req.body;

  if (!email || !mobile) {
    return res.status(400).json({ error: 'email and mobile are required' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({ error: 'Mobile number must be exactly 10 digits' });
  }

  try {
    const { rows: users } = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR mobile = $2',
      [email, mobile]
    );

    if (users.length === 0) {
      // no existing user with this email/mobile - so it's free to use
      return res.status(200).json({ valid: true, message: 'Email and mobile are available' });
    }

    const existingUser = users[0];

    if (existingUser.email === email && existingUser.mobile === mobile) {
      // this is literally the same user - just check their status
      if (existingUser.status !== 'Active') {
        return res.status(403).json({ valid: false, error: 'User account is Inactive' });
      }
      return res.status(200).json({ valid: true, message: 'User is valid and active' });
    }

    if (existingUser.email === email) {
      return res.status(409).json({ valid: false, error: 'Email is already in use' });
    }

    return res.status(409).json({ valid: false, error: 'Mobile number is already in use' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong while validating the user' });
  }
});

module.exports = router;
