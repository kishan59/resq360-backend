import { prisma } from '../config/db.js';

// 1. POST: Field Team requests a vet trip for a dog
export const requestVetTrip = async (req, res) => {
  try {
    const { patient_id } = req.body;
    
    // MAGIC: Pull from token
    const requested_by_id = req.user.id; 

    if (!patient_id) {
      return res.status(400).json({ status: 'error', message: 'Patient ID is required.' });
    }

    const newTrip = await prisma.vetTrip.create({
      data: {
        patient_id: patient_id,
        requested_by_id: requested_by_id,
        status: 'PENDING_APPROVAL' // Automatically defaults to pending
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Vet trip requested. Awaiting Command Center approval.',
      data: newTrip
    });

  } catch (error) {
    console.error("Error requesting vet trip:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to request vet trip.',
      error: error.message
    });
  }
};

// 2. PATCH: Command Center Owner approves it and sets a date
export const updateVetTripStatus = async (req, res) => {
  try {
    const { id } = req.params; // The ID of the Vet Trip itself
    const { status, scheduled_date } = req.body;

    // We only allow specific statuses based on our Prisma Enum
    if (!['PENDING_APPROVAL', 'APPROVED', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid status. Must be PENDING_APPROVAL, APPROVED, or COMPLETED.' 
      });
    }

    const updatedTrip = await prisma.vetTrip.update({
      where: { id: id },
      data: { 
        status: status,
        // If they provided a date, format it. Otherwise, leave it alone.
        scheduled_date: scheduled_date ? new Date(scheduled_date) : undefined
      }
    });

    res.status(200).json({
      status: 'success',
      message: `Vet trip marked as ${status}.`,
      data: updatedTrip
    });

  } catch (error) {
    console.error("Error updating vet trip:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to update vet trip.',
      error: error.message
    });
  }
};

// 3. GET: Fetch all Approved trips so the team knows who to take to the hospital today
export const getApprovedTrips = async (req, res) => {
  try {
    const trips = await prisma.vetTrip.findMany({
      where: { 
        status: 'APPROVED' 
      },
      orderBy: { 
        scheduled_date: 'asc' // Sort by date so the soonest trips are at the top
      },
      include: {
        // Pull in the Patient's QR code and Cage Zone so the team can actually find the dog!
        patient: {
          select: { qr_code_id: true, cage_zone: true }
        },
        // Pull in the name of the person who originally requested it
        requester: {
          select: { name: true }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      results: trips.length,
      data: trips
    });

  } catch (error) {
    console.error("Error fetching approved trips:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch the Vet Trip Board.',
      error: error.message
    });
  }
};