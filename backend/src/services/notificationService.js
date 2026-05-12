const axios = require('axios');
const { NOTIFICATION_WEBHOOK_URL, NOTIFICATION_TYPE } = require('../config');

async function sendNotification(event, payload = {}) {
  if (!NOTIFICATION_WEBHOOK_URL) {
    return;
  }

  try {
    await axios.post(NOTIFICATION_WEBHOOK_URL, {
      event,
      type: NOTIFICATION_TYPE,
      timestamp: new Date().toISOString(),
      payload,
    });
  } catch (error) {
    console.error('Notification send failed:', error.message || error);
  }
}

module.exports = { sendNotification };
