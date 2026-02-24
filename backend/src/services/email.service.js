// services/email.service.js
// Email notification service using Nodemailer

const nodemailer = require('nodemailer');

// ============================================================================
// CREATE EMAIL TRANSPORTER
// ============================================================================

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true', // false for port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Email template for new job assignment to technician
 */
const getJobAssignmentEmail = (jobCard, technician) => {
  return {
    subject: `New Job Assignment: ${jobCard.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; margin-top: 20px; }
          .job-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4F46E5; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #4F46E5; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 12px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #4F46E5; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Job Assignment</h1>
          </div>
          
          <div class="content">
            <p>Hello <strong>${technician.name}</strong>,</p>
            
            <p>You have been assigned to a new job. Please review the details below:</p>
            
            <div class="job-details">
              <div class="detail-row">
                <span class="label">Job Title:</span> ${jobCard.title}
              </div>
              <div class="detail-row">
                <span class="label">Customer:</span> ${jobCard.customer.name}
              </div>
              <div class="detail-row">
                <span class="label">Address:</span> ${jobCard.customer.address}
              </div>
              <div class="detail-row">
                <span class="label">Contact:</span> ${jobCard.customer.phone}
              </div>
              <div class="detail-row">
                <span class="label">Scheduled Date:</span> ${new Date(jobCard.scheduled_date).toLocaleDateString('en-GB')}
              </div>
              <div class="detail-row">
                <span class="label">Priority:</span> <span style="color: ${getPriorityColor(jobCard.priority)}; font-weight: bold;">${jobCard.priority.toUpperCase()}</span>
              </div>
              ${jobCard.description ? `
              <div class="detail-row">
                <span class="label">Description:</span><br/>
                ${jobCard.description}
              </div>
              ` : ''}
            </div>
            
            <p>Please log in to the system to view full details and start the job when ready.</p>
            
            <center>
              <a href="http://localhost:5173/technician/jobs/${jobCard.id}" class="button">View Job Details</a>
            </center>
          </div>
          
          <div class="footer">
            <p>This is an automated message from Copy Cat Group Job Card System.</p>
            <p>If you have any questions, please contact your supervisor.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

/**
 * Email template for job completion notification to supervisor
 */
const getJobCompletionEmail = (jobCard, supervisor) => {
  return {
    subject: `Job Completed: ${jobCard.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; margin-top: 20px; }
          .job-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #10B981; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #10B981; }
          .work-performed { background-color: #ECFDF5; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 12px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #10B981; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Job Completed</h1>
          </div>
          
          <div class="content">
            <p>Hello <strong>${supervisor.name}</strong>,</p>
            
            <p>A job has been successfully completed. Details below:</p>
            
            <div class="job-details">
              <div class="detail-row">
                <span class="label">Job Title:</span> ${jobCard.title}
              </div>
              <div class="detail-row">
                <span class="label">Customer:</span> ${jobCard.customer.name}
              </div>
              <div class="detail-row">
                <span class="label">Technician:</span> ${jobCard.technician.name}
              </div>
              <div class="detail-row">
                <span class="label">Completed:</span> ${new Date(jobCard.actual_end_time).toLocaleString('en-GB')}
              </div>
            </div>
            
            ${jobCard.work_performed ? `
            <div class="work-performed">
              <div class="label">Work Performed:</div>
              <p>${jobCard.work_performed}</p>
            </div>
            ` : ''}
            
            ${jobCard.notes ? `
            <div class="detail-row">
              <span class="label">Notes:</span> ${jobCard.notes}
            </div>
            ` : ''}
            
            <p>You can download the PDF report or view full details in the system.</p>
            
            <center>
              <a href="http://localhost:5173/supervisor/jobs/${jobCard.id}" class="button">View Job Details</a>
            </center>
          </div>
          
          <div class="footer">
            <p>This is an automated message from Copy Cat Group Job Card System.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

/**
 * Email template for customer completion notification
 */
const getCustomerCompletionEmail = (jobCard) => {
  return {
    subject: `Service Completed: ${jobCard.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; margin-top: 20px; }
          .job-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4F46E5; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #4F46E5; }
          .thank-you { background-color: #EEF2FF; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Service Completed</h1>
          </div>
          
          <div class="content">
            <p>Dear <strong>${jobCard.customer.name}</strong>,</p>
            
            <p>We're pleased to inform you that your service request has been completed successfully.</p>
            
            <div class="job-details">
              <div class="detail-row">
                <span class="label">Service:</span> ${jobCard.title}
              </div>
              <div class="detail-row">
                <span class="label">Technician:</span> ${jobCard.technician.name}
              </div>
              <div class="detail-row">
                <span class="label">Completed on:</span> ${new Date(jobCard.actual_end_time).toLocaleString('en-GB')}
              </div>
            </div>
            
            ${jobCard.work_performed ? `
            <div class="detail-row">
              <span class="label">Work Performed:</span><br/>
              <p>${jobCard.work_performed}</p>
            </div>
            ` : ''}
            
            <div class="thank-you">
              <h2>Thank You for Choosing Copy Cat Group!</h2>
              <p>We appreciate your business and hope you're satisfied with our service.</p>
            </div>
            
            <p>If you have any questions or concerns about the service provided, please don't hesitate to contact us.</p>
            
            <p><strong>Contact Information:</strong><br/>
            Phone: ${jobCard.technician.phone || 'N/A'}<br/>
            Email: ${jobCard.technician.email}</p>
          </div>
          
          <div class="footer">
            <p><strong>Copy Cat Group</strong></p>
            <p>Photocopier Sales, Installation & Maintenance</p>
            <p>Nairobi, Kenya</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getPriorityColor = (priority) => {
  const colors = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
    urgent: '#DC2626'
  };
  return colors[priority] || '#6B7280';
};

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

/**
 * Send job assignment email to technician
 */
const sendJobAssignmentEmail = async (jobCard, technician) => {
  try {
    if (!technician.email) {
      console.log('⚠️  Technician has no email address, skipping notification');
      return { success: false, reason: 'No email address' };
    }

    const transporter = createTransporter();
    const emailTemplate = getJobAssignmentEmail(jobCard, technician);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: technician.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Job assignment email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send job assignment email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send job completion email to supervisor
 */
const sendJobCompletionEmailToSupervisor = async (jobCard, supervisor) => {
  try {
    if (!supervisor.email) {
      console.log('⚠️  Supervisor has no email address, skipping notification');
      return { success: false, reason: 'No email address' };
    }

    const transporter = createTransporter();
    const emailTemplate = getJobCompletionEmail(jobCard, supervisor);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: supervisor.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Job completion email sent to supervisor:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send job completion email to supervisor:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send job completion email to customer
 */
const sendJobCompletionEmailToCustomer = async (jobCard) => {
  try {
    if (!jobCard.customer.email) {
      console.log('⚠️  Customer has no email address, skipping notification');
      return { success: false, reason: 'No email address' };
    }

    const transporter = createTransporter();
    const emailTemplate = getCustomerCompletionEmail(jobCard);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: jobCard.customer.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Job completion email sent to customer:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send job completion email to customer:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test email configuration
 */
const sendTestEmail = async (toEmail) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: 'Test Email - Job Card System',
      html: `
        <h1>Email Configuration Test</h1>
        <p>If you're reading this, email notifications are working correctly!</p>
        <p><strong>Copy Cat Group</strong><br/>
        Job Card Management System</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  sendJobAssignmentEmail,
  sendJobCompletionEmailToSupervisor,
  sendJobCompletionEmailToCustomer,
  sendTestEmail
};