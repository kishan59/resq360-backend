import { prisma } from '../config/db.js';

// POST: Create a new NGO staff member (Owner or Team Member)
export const createUser = async (req, res) => {
  try {
    const { name, role } = req.body;

    // Strict Validation: Every user must have a name
    if (!name) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Name is strictly required to create a staff profile.' 
      });
    }

    const newUser = await prisma.user.create({
      data: {
        name: name,
        // If they don't specify a role, default them to the field team
        role: role || 'TEAM_MEMBER' 
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Staff profile created successfully!',
      data: newUser
    });

  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to create staff profile.',
      error: error.message
    });
  }
};