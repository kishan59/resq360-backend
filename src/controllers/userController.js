import { prisma } from '../config/db.js'; // Import your global database connection

// We export this specific function so the route can use it
export const createUser = async (req, res) => {
  try {
    // 1. Grab the data sent from the mobile app/postman
    const { name, role } = req.body;

    // 2. Simple validation: Make sure they actually sent a name
    if (!name) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Name is required to create a user.' 
      });
    }

    // 3. Tell Prisma to insert a new row into the User table
    const newUser = await prisma.user.create({
      data: {
        name: name,
        role: role || 'RESCUER' // If no role is sent, default to RESCUER
      }
    });

    // 4. Send the newly created user back to the screen
    res.status(201).json({
      status: 'success',
      message: 'User created successfully!',
      data: newUser
    });

  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to create user in the database.',
      error: error.message
    });
  }
};