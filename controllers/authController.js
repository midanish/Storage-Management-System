const { User, sequelize } = require('../models');
const { generateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

const register = async (req, res) => {
  try {
    const { id, email, password, role = 'user' } = req.body;

    if (!id || !email || !password) {
      return res.status(400).json({ error: 'ID, email, and password are required' });
    }

    // Check if user already exists by ID or email
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [
          { id: id },
          { email: email }
        ]
      } 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this ID or email already exists' });
    }

    const user = await User.create({
      id,
      email,
      password,
      role,
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, identifier, password } = req.body; // Accept both email and identifier for compatibility
    const userIdentifier = email || identifier;

    if (!userIdentifier || !password) {
      return res.status(400).json({ error: 'User ID/Email and password are required' });
    }

    // Try to find user by ID or email
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { id: userIdentifier },
          { email: userIdentifier }
        ]
      } 
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
};