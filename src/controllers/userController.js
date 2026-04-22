import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';

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
