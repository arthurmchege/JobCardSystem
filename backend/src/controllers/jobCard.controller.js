const jobCardService = require('../services/jobCard.service');
const pdfGenerator = require('../utils/pdfGenerator');

// GET /api/v1/job-cards

const getAllJobCards = async (req, res) => {
    try {
        // Extract filter parameters from query string
        const filters = {
            status: req.query.status,           // Can be single value or array
            technician_id: req.query.technician_id,
            customer_id: req.query.customer_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            search: req.query.search,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20
        };

        // If technician_id from query is 'me', use logged-in user's ID
        if (filters.technician_id === 'me') {
            filters.technician_id = req.user.userId;
        }

        // Call service function
        const result = await jobCardService.getAllJobCards(filters);

        // Send success response
        res.json({
            success: true,
            data: result.jobCards,
            pagination: result.pagination
        });

    } catch (error) {
        console.error('Get all job cards error:', error);
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to retrieve job cards'
        });
    }
};

// GET SINGLE JOB CARD BY ID
// GET /api/v1/job-cards/:id

const getJobCardById = async (req, res) => {
    try {
        // UUID is kept as string - NO parseInt or isNaN check
        const jobCardId = req.params.id;

        // Call service function
        const jobCard = await jobCardService.getJobCardById(jobCardId);

        // Send success response
        res.json({
            success: true,
            data: { jobCard }
        });

    } catch (error) {
        console.error('Get job card by ID error:', error);
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to retrieve job card'
        });
    }
};

// CREATE NEW JOB CARD
// POST /api/v1/job-cards

const createJobCard = async (req, res) => {
    try {
        // Extract job card data from request body
        // Validation middleware has already validated this data
        const jobCardData = req.body;

        // Call service function
        const newJobCard = await jobCardService.createJobCard(jobCardData);

        // Send success response with 201 Created status
        res.status(201).json({
            success: true,
            message: 'Job card created successfully',
            data: { jobCard: newJobCard }
        });

    } catch (error) {
        console.error('Create job card error:', error);
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to create job card'
        });
    }
};

// UPDATE JOB CARD
// PATCH /api/v1/job-cards/:id

const updateJobCard = async (req, res) => {
    try {
        // UUID is kept as string - NO parseInt or isNaN check
        const jobCardId = req.params.id;

        // Extract update data from request body
        // Validation middleware has already validated this data
        const updateData = req.body;

        // Call service function
        const updatedJobCard = await jobCardService.updateJobCard(jobCardId, updateData);

        // Send success response
        res.json({
            success: true,
            message: 'Job card updated successfully',
            data: { jobCard: updatedJobCard }
        });

    } catch (error) {
        console.error('Update job card error:', error);
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to update job card'
        });
    }
};

// COMPLETE JOB CARD (SPECIAL ENDPOINT)
// POST /api/v1/job-cards/:id/complete

const completeJobCard = async (req, res) => {
    try {
        // UUID is kept as string - NO parseInt or isNaN check
        const jobCardId = req.params.id;

        // Extract completion data from request body
        // Validation middleware has already validated this data
        const completionData = req.body;

        // Call service function
        const completedJobCard = await jobCardService.completeJobCard(jobCardId, completionData);

        // Send success response
        res.json({
            success: true,
            message: 'Job card completed successfully',
            data: { jobCard: completedJobCard }
        });

    } catch (error) {
        console.error('Complete job card error:', error);
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to complete job card'
        });
    }
};

// DELETE JOB CARD
// DELETE /api/v1/job-cards/:id

const deleteJobCard = async (req, res) => {
    try {
        // UUID is kept as string - NO parseInt or isNaN check
        const jobCardId = req.params.id;

        // Call service function
        const result = await jobCardService.deleteJobCard(jobCardId);

        // Send success response
        res.json({
            success: true,
            message: result.message,
            data: { deletedId: result.deletedId }
        });

    } catch (error) {
        console.error('Delete job card error:', error);
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to delete job card'
        });
    }
};

// GET JOB CARD STATISTICS
// GET /api/v1/job-cards/stats

const getJobCardStatistics = async (req, res) => {
    try {
        // Call service function (no parameters needed)
        const statistics = await jobCardService.getJobCardStatistics();

        // Send success response
        res.json({
            success: true,
            data: { stats: statistics }
        });

    } catch (error) {
        console.error('Get job card statistics error:', error);
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to retrieve statistics'
        });
    }
};

const { generateJobCardPDF } = require('../utils/pdfGenerator');

/**
 * Generate PDF report for a job card
 * GET /api/v1/job-cards/:id/pdf
 * Private - Supervisor only
 */
const generateJobCardPDFReport = async (req, res) => {
  try {
    const jobCardId = req.params.id;

    // Get job card with full details
    const jobCard = await jobCardService.getJobCardById(jobCardId);

    if (!jobCard) {
      return res.status(404).json({
        success: false,
        error: 'Job card not found'
      });
    }

    // Only allow PDF generation for completed jobs
    if (jobCard.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'PDF can only be generated for completed jobs'
      });
    }

    // Generate PDF
    const pdfDoc = generateJobCardPDF(jobCard);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=job-card-${jobCardId.substring(0, 8)}.pdf`
    );

    // Pipe the PDF to the response
    pdfDoc.pipe(res);

  } catch (error) {
    console.error('PDF generation error:', error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to generate PDF report'
    });
  }
};

module.exports = {
    getAllJobCards,
    getJobCardById,
    createJobCard,
    updateJobCard,
    completeJobCard,
    deleteJobCard,
    getJobCardStatistics,
    generateJobCardPDFReport
};