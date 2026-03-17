

const PDFDocument = require('pdfkit');

// Company details from environment variables with sensible fallbacks
const COMPANY_NAME     = process.env.COMPANY_NAME    || 'JOB CARD SYSTEM';
const COMPANY_TAGLINE  = process.env.COMPANY_TAGLINE || 'Photocopier Sales, Installation & Maintenance';
const COMPANY_LOCATION = process.env.COMPANY_LOCATION || 'Nairobi, Kenya';

const generateJobCardPDF = (jobCard) => {
  const doc = createPDFDocument(jobCard);
  doc.end();
  return doc;
};

const generateJobCardPDFBuffer = (jobCard) => {
  return new Promise((resolve, reject) => {
    const doc = createPDFDocument(jobCard);
    
    // Collect PDF data in memory
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    doc.end();
  });
};

// Create PDF document with job card content

const createPDFDocument = (jobCard) => {
  // Create a new PDF document
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    }
  });

  // Company Header
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .text(COMPANY_NAME.toUpperCase(), { align: 'center' })
    .fontSize(10)
    .font('Helvetica')
    .text(COMPANY_TAGLINE, { align: 'center' })
    .text(COMPANY_LOCATION, { align: 'center' })
    .moveDown(0.5);

  // Report Title
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('JOB CARD REPORT', { align: 'center' })
    .moveDown(1);

  // Horizontal line
  doc
    .strokeColor('#333333')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .stroke()
    .moveDown(1);

  // Job Information Section
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('JOB INFORMATION', { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Job ID: ', { continued: true })
    .font('Helvetica')
    .text(jobCard.id)
    .moveDown(0.3);

  doc
    .font('Helvetica-Bold')
    .text('Job Title: ', { continued: true })
    .font('Helvetica')
    .text(jobCard.title)
    .moveDown(0.3);

  doc
    .font('Helvetica-Bold')
    .text('Description: ', { continued: true })
    .font('Helvetica')
    .text(jobCard.description || 'N/A')
    .moveDown(0.3);

  doc
    .font('Helvetica-Bold')
    .text('Priority: ', { continued: true })
    .font('Helvetica')
    .text(jobCard.priority.toUpperCase())
    .moveDown(0.3);

  doc
    .font('Helvetica-Bold')
    .text('Status: ', { continued: true })
    .font('Helvetica')
    .text(jobCard.status.toUpperCase(), {
      color: jobCard.status === 'completed' ? '#00AA00' : '#000000'
    })
    .moveDown(1);

  // Customer Details Section
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('CUSTOMER DETAILS', { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Customer Name: ', { continued: true })
    .font('Helvetica')
    .text(jobCard.customer.name)
    .moveDown(0.3);

  if (jobCard.customer.contact_person) {
    doc
      .font('Helvetica-Bold')
      .text('Contact Person: ', { continued: true })
      .font('Helvetica')
      .text(jobCard.customer.contact_person)
      .moveDown(0.3);
  }

  doc
    .font('Helvetica-Bold')
    .text('Phone: ', { continued: true })
    .font('Helvetica')
    .text(jobCard.customer.phone)
    .moveDown(0.3);

  if (jobCard.customer.email) {
    doc
      .font('Helvetica-Bold')
      .text('Email: ', { continued: true })
      .font('Helvetica')
      .text(jobCard.customer.email)
      .moveDown(0.3);
  }

  doc
    .font('Helvetica-Bold')
    .text('Address: ', { continued: true })
    .font('Helvetica')
    .text(jobCard.customer.address, { width: 400 })
    .moveDown(1);

  // Technician Details Section
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('TECHNICIAN DETAILS', { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Technician: ', { continued: true })
    .font('Helvetica')
    .text(jobCard.technician.name)
    .moveDown(0.3);

  if (jobCard.technician.phone) {
    doc
      .font('Helvetica-Bold')
      .text('Phone: ', { continued: true })
      .font('Helvetica')
      .text(jobCard.technician.phone)
      .moveDown(0.3);
  }

  doc
    .font('Helvetica-Bold')
    .text('Email: ', { continued: true })
    .font('Helvetica')
    .text(jobCard.technician.email)
    .moveDown(1);

  // Timeline Section
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('TIMELINE', { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Scheduled Date: ', { continued: true })
    .font('Helvetica')
    .text(new Date(jobCard.scheduled_date).toLocaleDateString('en-GB'))
    .moveDown(0.3);

  if (jobCard.actual_start_time) {
    doc
      .font('Helvetica-Bold')
      .text('Started: ', { continued: true })
      .font('Helvetica')
      .text(new Date(jobCard.actual_start_time).toLocaleString('en-GB'))
      .moveDown(0.3);
  }

  if (jobCard.actual_end_time) {
    doc
      .font('Helvetica-Bold')
      .text('Completed: ', { continued: true })
      .font('Helvetica')
      .text(new Date(jobCard.actual_end_time).toLocaleString('en-GB'))
      .moveDown(0.3);
  }

  if (jobCard.estimated_duration) {
    doc
      .font('Helvetica-Bold')
      .text('Estimated Duration: ', { continued: true })
      .font('Helvetica')
      .text(`${jobCard.estimated_duration} minutes`)
      .moveDown(0.3);
  }

  // Payment details (if provided)
  if (jobCard.payment_amount) {
    doc
      .font('Helvetica-Bold')
      .text('Payment Amount: ', { continued: true })
      .font('Helvetica')
      .text(`KES ${Number(jobCard.payment_amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      .moveDown(0.3);

    if (jobCard.payment_status) {
      doc
        .font('Helvetica-Bold')
        .text('Payment Status: ', { continued: true })
        .font('Helvetica')
        .text(jobCard.payment_status.replace('_', ' ').toUpperCase())
        .moveDown(0.3);
    }

    doc.moveDown(0.4);
  }

  // Work Performed Section (only if completed)
  if (jobCard.work_performed) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('WORK PERFORMED', { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(jobCard.work_performed, { width: 500, align: 'justify' })
      .moveDown(1);
  }

  // Notes Section (if any)
  if (jobCard.notes) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('ADDITIONAL NOTES', { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(jobCard.notes, { width: 500, align: 'justify' })
      .moveDown(1);
  }

  // Horizontal line
  doc
    .strokeColor('#333333')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .stroke()
    .moveDown(1);

  // Signature Section
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('CUSTOMER SIGNATURE', 50, doc.y)
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font('Helvetica')
    .text('Name: _________________________________', 50, doc.y)
    .moveDown(0.5)
    .text('Signature: _____________________________')
    .moveDown(0.3)
    .text('Date: __________________________________')
    .moveDown(2);

  // Footer
  const bottomY = doc.page.height - 80;
  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#666666')
    .text(
      'This is a computer-generated document.',
      50,
      bottomY,
      { align: 'center', width: 500 }
    )
    .moveDown(0.3)
    .text(
      `Generated on: ${new Date().toLocaleString('en-GB')}`,
      { align: 'center' }
    );

  return doc;
};

module.exports = {
  generateJobCardPDF,
  generateJobCardPDFBuffer
};