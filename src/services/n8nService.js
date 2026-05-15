/**
 * ============================================================
 * FILE: src/services/n8nService.js
 * PURPOSE: Proxies requests to n8n webhooks securely
 *
 * WHY THIS FILE EXISTS:
 * Without a proxy:
 * - n8n URLs are exposed in frontend code
 * - API keys are visible in browser DevTools
 * - Anyone can call n8n directly
 *
 * With proxy:
 * - Frontend calls our backend (authenticated)
 * - Backend calls n8n with API key (hidden from users)
 * - n8n URLs never exposed to public
 * - We can validate/transform data before sending
 * ============================================================
 */

const N8N_BASE = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_MASTER_API_KEY;

if (!N8N_BASE || !N8N_API_KEY) {
  console.warn("Warning: N8N_BASE_URL or N8N_MASTER_API_KEY not set");
}

/**
 * callN8n - Makes authenticated request to n8n webhook
 *
 * @param {string} path - Webhook path (e.g. 'form-book')
 * @param {string} method - HTTP method
 * @param {Object} body - Request body (for POST)
 * @param {Object} queryParams - URL query params (for GET)
 */
const callN8n = async (path, method = "POST", body = null, queryParams = {}) => {
  // Build URL with query params
  const url = new URL(`${N8N_BASE}/${path}`);
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": N8N_API_KEY, // Hidden from frontend users
    },
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n error (${response.status}): ${errorText}`);
  }

  return await response.json();
};

/**
 * getAvailableSlots - Gets available appointment slots for a date
 */
const getAvailableSlots = async (date, clinicId) => {
  return callN8n("get-slots", "GET", null, { date, clinicId });
};

/**
 * bookAppointment - Creates a new appointment
 */
const bookAppointment = async (bookingData) => {
  return callN8n("form-book", "POST", bookingData);
};

/**
 * findAppointment - Finds appointment by ID or phone
 */
const findAppointment = async (bookingId, phone) => {
  return callN8n("form-find", "POST", { bookingId, phone });
};

/**
 * rescheduleAppointment - Reschedules an appointment
 */
const rescheduleAppointment = async (rescheduleData) => {
  return callN8n("form-reschedule", "POST", rescheduleData);
};

module.exports = {
  callN8n,
  getAvailableSlots,
  bookAppointment,
  findAppointment,
  rescheduleAppointment,
};
