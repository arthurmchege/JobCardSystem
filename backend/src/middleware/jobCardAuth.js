// JOB CARD AUTHORIZATION MIDDLEWARE

const pool = require('../config/database');

// Verify Job Card Ownership
// This runs AFTER authenticate middleware (so req.user exists)
// This runs BEFORE the controller (so we block unauthorized access early)

const verifyJobCardOwnership = async (req, res, next) => {
    try {
        // Extract job card ID from URL parameter
        const jobCardId = parseInt(req.params.id);

        if (isNaN(jobCardId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid job card ID'
            });
        }

        // Get the logged-in user's info from req.user
        // authenticate middleware already set this
        const { userId, role } = req.user;

        // Supervisors bypass ownership check
        // Supervisors can access ALL job cards, so no need to check ownership
        if (role === 'supervisor') {
            return next(); // Allow access, continue to controller
        }

        // For technicians, verify they own this job card
        // Query: Get the technician_id for this job card
        const result = await pool.query(
            'SELECT technician_id FROM job_cards WHERE id = $1',
            [jobCardId]
        );

        // Job card doesn't exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Job card not found'
            });
        }

        const jobTechnicianId = result.rows[0].technician_id;

        // Check if technician owns this job
        if (jobTechnicianId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: You can only access your own assigned job cards',
                message: `This job is assigned to technician ID ${jobTechnicianId}, but you are user ID ${userId}`
            });
        }

        // Ownership verified - allow access
        next();

    } catch (error) {
        console.error('Job card ownership verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify job card ownership',
            message: error.message
        });
    }
};

// MIDDLEWARE: Filter Job Cards by Role

const filterJobCardsByRole = (req, res, next) => {
    try {
        const { userId, role } = req.user;

        // Technicians: Force filter to only their jobs
        if (role === 'technician') {
            // Override any technician_id from query params
            // This prevents technicians from accessing other technicians' jobs
            // by manipulating the query string
            req.query.technician_id = userId.toString();
        }

        // Supervisors: No automatic filtering

        next();

    } catch (error) {
        console.error('Filter job cards by role error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to apply role-based filtering'
        });
    }
};

module.exports = {
    verifyJobCardOwnership,
    filterJobCardsByRole
};