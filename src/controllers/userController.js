import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 1. ADMIN REGISTRATION: Shelter Owner creates a new staff profile
export const createUser = async (req, res) => {
  try {
    const { name, phone_number, password, role } = req.body;

    if (!name || !phone_number || !password) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Name, Phone Number, and Password are strictly required.' 
      });
    }

    // Check if phone number already exists
    const existingUser = await prisma.user.findUnique({ where: { phone_number } });
    if (existingUser) {
      return res.status(400).json({ status: 'error', message: 'This phone number is already registered to a staff member.' });
    }

    // Hash the password securely before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        phone_number,
        password: hashedPassword, // NEVER save plain text passwords!
        role: role || 'TEAM_MEMBER' 
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Staff profile created successfully!',
      data: { id: newUser.id, name: newUser.name, role: newUser.role } // Notice we don't send the password back!
    });

  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ status: 'error', message: 'Failed to create staff profile.' });
  }
};

// 2. STAFF LOGIN: Mobile app requests a secure token
export const loginUser = async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    if (!phone_number || !password) {
      return res.status(400).json({ status: 'error', message: 'Phone number and password are required.' });
    }

    // Find the user by phone number
    const user = await prisma.user.findUnique({ where: { phone_number } });
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    // Compare the typed password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    // Generate the JWT Token (The digital VIP pass)
    // It contains the user's ID and Role, signed with a secret key
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'super_secret_fallback_key', // We will add a real secret to .env soon
      { expiresIn: '30d' } // Token lasts for 30 days so field workers don't have to log in every 5 minutes
    );

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully.',
      token, // <-- The mobile app will save this!
      user: { id: user.id, name: user.name, role: user.role }
    });

  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ status: 'error', message: 'Login failed.' });
  }
};