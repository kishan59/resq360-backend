import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/auth.js';

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
      token,
      user: { id: user.id, name: user.name, role: user.role }
    });

  } catch (error) {
    console.error('Error logging in:', error);
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