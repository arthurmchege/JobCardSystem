// M-Pesa Helper Utilities
// Pure utility functions for M-Pesa Integration

// Generating the M-Pesa API Password
// Formula: Base64(BusinessShortCode + Passkey + Timestamp)

function generatePassword(shortcode, passkey, timestamp) {
  const str = shortcode + passkey + timestamp;
  return Buffer.from(str).toString('base64');
} 

// Generating timestamp in M-Pesa required format
// Format: YYYYMMDDHHMMSS

function generateTimestamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hour}${minute}${second}`;
}

module.exports = { 
  generatePassword,
  generateTimestamp
}