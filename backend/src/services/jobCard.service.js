const pool = require("../config/database");
const emailService = require("./email.service"); // ✅ ADD EMAIL SERVICE

// FUNCTION 1: GET ALL JOB CARDS (WITH DYNAMIC FILTERING)

const getAllJobCards = async (filters = {}) => {
  // Extract filter parameters with defaults
  const {
    status, // Filter by job status (can be array: ['pending', 'in_progress'])
    technician_id, // Filter by assigned technician
    customer_id, // Filter by customer
    start_date, // Date range start
    end_date, // Date range end
    search, // Search in title/description
    page = 1, // Pagination: current page
    limit = 20, // Pagination: items per page
  } = filters;

  let query = `
        SELECT 
            jc.id,
            jc.title,
            jc.description,
            jc.status,
            jc.priority,
            jc.scheduled_date,
            jc.estimated_duration,
            jc.actual_start_time,
            jc.actual_end_time,
            jc.work_performed,
            jc.notes,
            jc.customer_signature,
            jc.created_at,
            jc.updated_at,
            jc.completed_at,
            jc.payment_amount,
            jc.payment_status,
            -- Customer information (JOIN)
            c.id as customer_id,
            c.name as customer_name,
            c.address as customer_address,
            c.phone as customer_phone,
            c.email as customer_email,
            c.contact_person as customer_contact_person,
            -- Technician information (JOIN)
            u.id as technician_id,
            u.name as technician_name,
            u.email as technician_email,
            u.phone as technician_phone
        FROM job_cards jc
        JOIN customers c ON jc.customer_id = c.id
        JOIN users u ON jc.technician_id = u.id
    `;

  // Array to hold WHERE conditions
  const conditions = [];
  // Array to hold query parameters (for parameterized queries)
  const params = [];
  // Counter for parameter placeholders ($1, $2, $3, etc.)
  let paramCounter = 1;

  // ADD FILTERS CONDITIONALLY

  // FILTER 1: Status (can be single value or array)
  if (status) {
    if (Array.isArray(status)) {
      // Multiple statuses: status IN ('pending', 'in_progress')
      // We need placeholders for each status value
      const placeholders = status
        .map((_, index) => `$${paramCounter + index}`)
        .join(", ");
      conditions.push(`jc.status IN (${placeholders})`);
      params.push(...status);
      paramCounter += status.length;
    } else {
      // Single status: status = 'pending'
      conditions.push(`jc.status = $${paramCounter}`);
      params.push(status);
      paramCounter++;
    }
  }

  // FILTER 2: Technician ID
  if (technician_id) {
    conditions.push(`jc.technician_id = $${paramCounter}`);
    params.push(technician_id);
    paramCounter++;
  }

  // FILTER 3: Customer ID
  if (customer_id) {
    conditions.push(`jc.customer_id = $${paramCounter}`);
    params.push(customer_id);
    paramCounter++;
  }

  // FILTER 4: Date Range (scheduled_date BETWEEN start_date AND end_date)
  if (start_date && end_date) {
    conditions.push(
      `jc.scheduled_date BETWEEN $${paramCounter} AND $${paramCounter + 1}`,
    );
    params.push(start_date, end_date);
    paramCounter += 2;
  } else if (start_date) {
    // Only start date: scheduled_date >= start_date
    conditions.push(`jc.scheduled_date >= $${paramCounter}`);
    params.push(start_date);
    paramCounter++;
  } else if (end_date) {
    // Only end date: scheduled_date <= end_date
    conditions.push(`jc.scheduled_date <= $${paramCounter}`);
    params.push(end_date);
    paramCounter++;
  }

  // FILTER 5: Search keyword (in title OR description)
  if (search) {
    // Use ILIKE for case-insensitive search
    // %search% matches any position in the string
    conditions.push(
      `(jc.title ILIKE $${paramCounter} OR jc.description ILIKE $${paramCounter})`,
    );
    params.push(`%${search}%`);
    paramCounter++;
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  // Add ORDER BY (most recent first, then by priority)
  query += " ORDER BY jc.created_at DESC, jc.priority DESC";

  // Calculate offset: page 1 → offset 0, page 2 → offset 20, etc.
  const offset = (page - 1) * limit;
  query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
  params.push(limit, offset);

  // EXECUTE QUERIES
  // Build count query (same WHERE conditions, but just COUNT)
  let countQuery = "SELECT COUNT(*) FROM job_cards jc";
  if (conditions.length > 0) {
    countQuery += " WHERE " + conditions.join(" AND ");
  }

  // Execute both queries
  const [dataResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params.slice(0, -2)), // Exclude LIMIT and OFFSET params
  ]);

  const totalCount = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(totalCount / limit);

  const jobCards = dataResult.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    scheduled_date: row.scheduled_date,
    estimated_duration: row.estimated_duration,
    actual_start_time: row.actual_start_time,
    actual_end_time: row.actual_end_time,
    work_performed: row.work_performed,
    notes: row.notes,
    customer_signature: row.customer_signature,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
    payment_amount: row.payment_amount,
    payment_status: row.payment_status,
    // Nested customer object
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      address: row.customer_address,
      phone: row.customer_phone,
      email: row.customer_email,
      contact_person: row.customer_contact_person,
    },
    // Nested technician object
    technician: {
      id: row.technician_id,
      name: row.technician_name,
      email: row.technician_email,
      phone: row.technician_phone,
    },
  }));

  return {
    jobCards,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
    },
  };
};

// FUNCTION 2: GET SINGLE JOB CARD BY ID

const getJobCardById = async (jobCardId) => {
  const query = `
        SELECT 
            jc.id,
            jc.title,
            jc.description,
            jc.status,
            jc.priority,
            jc.scheduled_date,
            jc.estimated_duration,
            jc.actual_start_time,
            jc.actual_end_time,
            jc.work_performed,
            jc.notes,
            jc.customer_signature,
            jc.created_at,
            jc.updated_at,
            jc.completed_at,
            jc.payment_amount,
            jc.payment_status,
            jc.outstanding_balance,
            jc.fully_paid_at,
            -- Customer information
            c.id as customer_id,
            c.name as customer_name,
            c.address as customer_address,
            c.phone as customer_phone,
            c.email as customer_email,
            c.contact_person as customer_contact_person,
            -- Technician information
            u.id as technician_id,
            u.name as technician_name,
            u.email as technician_email,
            u.phone as technician_phone
        FROM job_cards jc
        JOIN customers c ON jc.customer_id = c.id
        JOIN users u ON jc.technician_id = u.id
        WHERE jc.id = $1
    `;

  const result = await pool.query(query, [jobCardId]);

  if (result.rows.length === 0) {
    const error = new Error("Job card not found");
    error.statusCode = 404;
    throw error;
  }

  const row = result.rows[0];

  // Format response with nested objects
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    scheduled_date: row.scheduled_date,
    estimated_duration: row.estimated_duration,
    actual_start_time: row.actual_start_time,
    actual_end_time: row.actual_end_time,
    work_performed: row.work_performed,
    notes: row.notes,
    customer_signature: row.customer_signature,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
    payment_amount: row.payment_amount,
    payment_status: row.payment_status,
    outstanding_balance: row.outstanding_balance,
    fully_paid_at: row.fully_paid_at,
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      address: row.customer_address,
      phone: row.customer_phone,
      email: row.customer_email,
      contact_person: row.customer_contact_person,
    },
    technician: {
      id: row.technician_id,
      name: row.technician_name,
      email: row.technician_email,
      phone: row.technician_phone,
    },
  };
};

// FUNCTION 3: CREATE NEW JOB CARD (WITH EMAIL NOTIFICATION)

const createJobCard = async (jobCardData) => {
  const {
    customer_id,
    technician_id,
    title,
    description,
    priority = "medium",
    scheduled_date,
    estimated_duration,
    payment_amount,
    notes,
  } = jobCardData;

  // VALIDATION 1: Verify customer exists
  const customerCheck = await pool.query(
    "SELECT id, name, email, phone, address, contact_person FROM customers WHERE id = $1",
    [customer_id],
  );

  if (customerCheck.rows.length === 0) {
    const error = new Error(`Customer with ID ${customer_id} does not exist`);
    error.statusCode = 400;
    throw error;
  }

  // VALIDATION 2: Verify technician exists AND has correct role
  const technicianCheck = await pool.query(
    "SELECT id, name, email, phone, role FROM users WHERE id = $1",
    [technician_id],
  );

  if (technicianCheck.rows.length === 0) {
    const error = new Error(`User with ID ${technician_id} does not exist`);
    error.statusCode = 400;
    throw error;
  }

  if (technicianCheck.rows[0].role !== "technician") {
    const error = new Error(
      `User with ID ${technician_id} is not a technician (role: ${technicianCheck.rows[0].role})`,
    );
    error.statusCode = 400;
    throw error;
  }

  // CREATE JOB CARD
  const query = `
        INSERT INTO job_cards (
            customer_id,
            technician_id,
            title,
            description,
            priority,
            scheduled_date,
            estimated_duration,
            payment_amount,
            notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING 
            id,
            customer_id,
            technician_id,
            title,
            description,
            status,
            priority,
            scheduled_date,
            estimated_duration,
            notes,
            created_at,
            updated_at
    `;

  const values = [
    customer_id,
    technician_id,
    title,
    description || null,
    priority,
    scheduled_date,
    estimated_duration || null,
    payment_amount || null,
    notes || null,
  ];

  const result = await pool.query(query, values);

  // FETCH COMPLETE JOB CARD WITH JOINS
  const newJobCard = await getJobCardById(result.rows[0].id);

  // ✅ SEND EMAIL NOTIFICATION TO TECHNICIAN
  try {
    console.log(
      "📧 Sending job assignment email to:",
      newJobCard.technician.email,
    );
    await emailService.sendJobAssignmentEmail(
      newJobCard,
      newJobCard.technician,
    );
    console.log("✅ Job assignment email sent successfully");
  } catch (emailError) {
    // Log error but don't fail job creation if email fails
    console.error(
      "⚠️  Failed to send job assignment email:",
      emailError.message,
    );
  }

  return newJobCard;
};

// FUNCTION 4: UPDATE JOB CARD

const updateJobCard = async (jobCardId, updateData) => {
  // Fetch current job card state

  const currentJobResult = await pool.query(
    "SELECT status, actual_start_time FROM job_cards WHERE id = $1",
    [jobCardId],
  );

  if (currentJobResult.rows.length === 0) {
    const error = new Error("Job card not found");
    error.statusCode = 404;
    throw error;
  }

  const currentJob = currentJobResult.rows[0];
  const currentStatus = currentJob.status;

  // VALIDATION 1: Prevent modification of completed jobs

  if (currentStatus === "completed") {
    const isOnlyUpdatingPayment = Object.keys(updateData).every(
      (key) => key === "payment_amount",
    );
    if (!isOnlyUpdatingPayment) {
      const error = new Error(
        "Cannot modify completed job cards. Completed jobs are immutable for data integrity.",
      );
      error.statusCode = 403;
      throw error;
    }
  }

  // VALIDATION 2: Status transition logic

  if (updateData.status && updateData.status !== currentStatus) {
    const invalidTransitions = {
      in_progress: ["pending"], // Can't go back to pending
      completed: [], // Can't change from completed
    };

    if (invalidTransitions[currentStatus]?.includes(updateData.status)) {
      const error = new Error(
        `Invalid status transition: Cannot change from '${currentStatus}' to '${updateData.status}'`,
      );
      error.statusCode = 400;
      throw error;
    }

    //  Actual start time is captured as technician starts a job
    if (updateData.status === "in_progress" && !updateData.actual_start_time) {
      const error = new Error(
        "actual_start_time is required when changing status to in_progress",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // VALIDATION 3: Time logic
  // If both actual_start_time and actual_end_time are provided,
  // end time must be >= start time
  if (updateData.actual_start_time && updateData.actual_end_time) {
    const startTime = new Date(updateData.actual_start_time);
    const endTime = new Date(updateData.actual_end_time);

    if (endTime < startTime) {
      const error = new Error(
        "actual_end_time cannot be before actual_start_time",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // BUILD UPDATE QUERY DYNAMICALLY
  const allowedFields = [
    "title",
    "description",
    "status",
    "priority",
    "scheduled_date",
    "estimated_duration",
    "actual_start_time",
    "actual_end_time",
    "work_performed",
    "notes",
    "payment_amount",
  ];

  const updates = [];
  const values = [];
  let paramCounter = 1;

  // Build SET clause dynamically
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updates.push(`${field} = $${paramCounter}`);
      values.push(updateData[field]);
      paramCounter++;
    }
  }

  // If no fields to update, return current job card
  if (updates.length === 0) {
    return await getJobCardById(jobCardId);
  }

  // Add job card ID as the last parameter
  values.push(jobCardId);

  const query = `
        UPDATE job_cards 
        SET ${updates.join(", ")}
        WHERE id = $${paramCounter}
        RETURNING id
    `;

  await pool.query(query, values);

  // Database trigger handles status history logging
  // The 'log_status_change' trigger from Step 2 automatically inserts
  // a record into job_status_history when status changes.

  return await getJobCardById(jobCardId);
};

// FUNCTION 5: COMPLETE JOB CARD (WITH EMAIL NOTIFICATIONS)

const completeJobCard = async (jobCardId, completionData) => {
  // Fetch current job status
  const currentJobResult = await pool.query(
    "SELECT status, actual_start_time FROM job_cards WHERE id = $1",
    [jobCardId],
  );

  if (currentJobResult.rows.length === 0) {
    const error = new Error("Job card not found");
    error.statusCode = 404;
    throw error;
  }

  const currentJob = currentJobResult.rows[0];

  // VALIDATION 1: Check if already completed
  if (currentJob.status === "completed") {
    const error = new Error("Job card is already completed");
    error.statusCode = 400;
    throw error;
  }

  // VALIDATION 2: Check if job was started first
  if (currentJob.status === "pending") {
    const error = new Error(
      "Job must be started before it can be completed. Please start the job first.",
    );
    error.statusCode = 400;
    throw error;
  }

  // VALIDATION 3: Required fields for completion

  if (!completionData.work_performed) {
    const error = new Error("work_performed is required to complete a job");
    error.statusCode = 400;
    throw error;
  }

  // Validate work_performed has minimum length
  if (completionData.work_performed.length < 10) {
    const error = new Error(
      "work_performed must be at least 10 characters long",
    );
    error.statusCode = 400;
    throw error;
  }

  // VALIDATION 4: Time logic
  // Completion requires that the job was actually started (has start time)
  // and that end time is after start time

  const startTime = completionData.actual_start_time
    ? new Date(completionData.actual_start_time)
    : currentJob.actual_start_time
      ? new Date(currentJob.actual_start_time)
      : null;

  const endTime = completionData.actual_end_time
    ? new Date(completionData.actual_end_time)
    : new Date(); // Default to current time if not provided

  // If job was never started, require start time in completion data
  if (!startTime) {
    const error = new Error(
      "Job must have actual_start_time before completion. Please start the job first.",
    );
    error.statusCode = 400;
    throw error;
  }

  // Validate end time is after start time
  if (endTime < startTime) {
    const error = new Error(
      "actual_end_time cannot be before actual_start_time",
    );
    error.statusCode = 400;
    throw error;
  }

  // UPDATE JOB CARD TO COMPLETED STATUS

  const query = `
        UPDATE job_cards 
        SET 
            status = 'completed',
            actual_start_time = COALESCE($1, actual_start_time),
            actual_end_time = $2,
            work_performed = $3,
            customer_signature = $4,
            notes = COALESCE($5, notes),
            completed_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id
    `;

  const values = [
    completionData.actual_start_time || null, // Only update if provided
    endTime,
    completionData.work_performed,
    completionData.customer_signature || null, //
    completionData.notes || null, // Optional additional notes
    jobCardId,
  ];

  await pool.query(query, values);

  // Database trigger logs completion
  // Return completed job card
  const completedJob = await getJobCardById(jobCardId);

  // ✅ SEND EMAIL TO SUPERVISORS
  try {
    console.log("📧 Sending job completion emails to supervisors...");

    const supervisors = await pool.query(
      "SELECT id, name, email FROM users WHERE role = $1",
      ["supervisor"],
    );

    for (const supervisor of supervisors.rows) {
      if (supervisor.email) {
        await emailService.sendJobCompletionEmailToSupervisor(
          completedJob,
          supervisor,
        );
      }
    }
    console.log("✅ Supervisor emails sent successfully");
  } catch (emailError) {
    console.error("⚠️  Failed to send supervisor emails:", emailError.message);
  }

  // ✅ SEND EMAIL TO CUSTOMER
  try {
    if (completedJob.customer.email) {
      console.log(
        "📧 Sending job completion email to customer:",
        completedJob.customer.email,
      );

      if (completedJob.payment_amount) {
        // Job has a payment amount, generate token and send invoice
        const paystackService = require("./paystack.service");
        const token = await paystackService.generatePaymentToken(jobCardId);
        await emailService.sendJobCompletionEmailToCustomer(
          completedJob,
          token,
        );
        console.log("✅ Invoice email with payment link sent to customer");
      } else {
        // No payment amount, send regular completion email
        await emailService.sendJobCompletionEmailToCustomer(completedJob, null);
        console.log("✅ Regular completion email sent to customer");
      }
    } else {
      console.log("⚠️  Customer has no email, skipping customer notification");
    }
  } catch (emailError) {
    console.error("⚠️  Failed to send customer email:", emailError.message);
  }

  return completedJob;
};

// FUNCTION 6: DELETE JOB CARD

const deleteJobCard = async (jobCardId) => {
  // STEP 1: Check if job card exists and get its status
  const jobCheck = await pool.query(
    "SELECT id, status FROM job_cards WHERE id = $1",
    [jobCardId],
  );

  if (jobCheck.rows.length === 0) {
    const error = new Error("Job card not found");
    error.statusCode = 404;
    throw error;
  }

  const jobStatus = jobCheck.rows[0].status;

  // VALIDATION: Only pending jobs can be deleted
  if (jobStatus !== "pending") {
    const error = new Error(
      `Cannot delete job card with status '${jobStatus}'. Only pending jobs can be deleted.`,
    );
    error.statusCode = 403; // 403 Forbidden
    throw error;
  }

  // DELETE JOB CARD
  // When we delete the job_cards row, the CASCADE rule on job_status_history
  // foreign key will automatically delete all related history records
  await pool.query("DELETE FROM job_cards WHERE id = $1", [jobCardId]);

  return {
    message: "Job card deleted successfully",
    deletedId: jobCardId,
  };
};

// FUNCTION 7: GET JOB CARD STATISTICS

const getJobCardStatistics = async () => {
  const overallStatsQuery = `
        SELECT 
            COUNT(*) as total_jobs,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
            COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_count
        FROM job_cards
    `;

  const priorityStatsQuery = `
        SELECT 
            COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
            COUNT(*) FILTER (WHERE priority = 'high') as high_count,
            COUNT(*) FILTER (WHERE priority = 'medium') as medium_count,
            COUNT(*) FILTER (WHERE priority = 'low') as low_count
        FROM job_cards
        WHERE status != 'completed'
    `;

  const todayJobsQuery = `
        SELECT COUNT(*) as today_scheduled
        FROM job_cards
        WHERE DATE(scheduled_date) = CURRENT_DATE
    `;

  // CURRENT_DATE - INTERVAL '7 days' = 7 days ago
  const weekCompletedQuery = `
        SELECT COUNT(*) as week_completed
        FROM job_cards
        WHERE status = 'completed'
        AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
    `;

  const avgCompletionTimeQuery = `
        SELECT 
            ROUND(
                AVG(
                    EXTRACT(EPOCH FROM (actual_end_time - actual_start_time)) / 3600
                )::numeric, 
                2
            ) as avg_completion_hours
        FROM job_cards
        WHERE status = 'completed'
        AND actual_start_time IS NOT NULL
        AND actual_end_time IS NOT NULL
    `;

  const recentActivityQuery = `
        SELECT 
            jsh.job_card_id,
            jc.title as job_title,
            jsh.status,
            jsh.changed_at,
            u.name as technician_name
        FROM job_status_history jsh
        JOIN job_cards jc ON jsh.job_card_id = jc.id
        JOIN users u ON jsh.changed_by_user_id = u.id
        ORDER BY jsh.changed_at DESC
        LIMIT 10
    `;

  // Execute all queries in parallel for performance
  const [
    overallStats,
    priorityStats,
    todayJobs,
    weekCompleted,
    avgCompletionTime,
    recentActivity,
  ] = await Promise.all([
    pool.query(overallStatsQuery),
    pool.query(priorityStatsQuery),
    pool.query(todayJobsQuery),
    pool.query(weekCompletedQuery),
    pool.query(avgCompletionTimeQuery),
    pool.query(recentActivityQuery),
  ]);

  // Format and return statistics
  return {
    // Overview stats
    total_jobs: parseInt(overallStats.rows[0].total_jobs),
    pending_jobs: parseInt(overallStats.rows[0].pending_count),
    in_progress_jobs: parseInt(overallStats.rows[0].in_progress_count),
    completed_jobs: parseInt(overallStats.rows[0].completed_count),

    // Priority breakdown
    urgent_count: parseInt(priorityStats.rows[0].urgent_count),
    high_count: parseInt(priorityStats.rows[0].high_count),
    medium_count: parseInt(priorityStats.rows[0].medium_count),
    low_count: parseInt(priorityStats.rows[0].low_count),

    // Time metrics
    today_scheduled: parseInt(todayJobs.rows[0].today_scheduled),
    week_completed: parseInt(weekCompleted.rows[0].week_completed),
    avg_completion_hours:
      parseFloat(avgCompletionTime.rows[0].avg_completion_hours) || 0,

    // Recent activity
    recent_activity: recentActivity.rows.map((activity) => ({
      job_card_id: activity.job_card_id,
      job_title: activity.job_title,
      status: activity.status,
      changed_at: activity.changed_at,
      technician_name: activity.technician_name,
    })),
  };
};

module.exports = {
  getAllJobCards,
  getJobCardById,
  createJobCard, // ✅ Now sends email to technician
  updateJobCard,
  completeJobCard, // ✅ Now sends emails to supervisor and customer
  deleteJobCard,
  getJobCardStatistics,
};
