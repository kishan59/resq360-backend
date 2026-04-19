import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/auth.js';

export const createUser = async (req, res) => {
  try {
    const { name, phone_number, password, role } = req.body;

    if (!name || !phone_number || !password) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Name, Phone Number, and Password are strictly required.' 
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { phone_number } });
    if (existingUser) {
      return res.status(400).json({ status: 'error', message: 'This phone number is already registered to a staff member.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        phone_number,
        password: hashedPassword,
        role: role || 'TEAM_MEMBER' 
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Staff profile created successfully!',
      data: { id: newUser.id, name: newUser.name, role: newUser.role }
    });

  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ status: 'error', message: 'Failed to create staff profile.' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    if (!phone_number || !password) {
      return res.status(400).json({ status: 'error', message: 'Phone number and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { phone_number } });
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    const jwtSecret = getJwtSecret();

    const token = jwt.sign(
      { id: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '12h' }
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

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        phone_number: true,
        role: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    res.status(200).json({ status: 'success', data: user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user profile.' });
  }
};