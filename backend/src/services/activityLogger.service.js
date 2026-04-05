const pool = require("../config/database");
const logEvent = async (eventType, userId = null, metadata = {}) => {
  try {
    const logEntry = await pool.query(
      `INSERT INTO activity_logs (
        event_type,
        user_id,
        metadata
    )
        VALUES ($1, $2, $3)`,
      [eventType, userId, JSON.stringify(metadata)],
    );
  } catch (error) {
    console.error("Error logging Activity:", error);
  }
};

module.exports = {
  logEvent,
};
