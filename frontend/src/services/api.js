const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

// Custom error class for API errors
class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

// Helper function to handle fetch responses
const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  const data = isJson ? await response.json() : await response.text();

  // Check if response is not ok OR if server returned success: false
  if (!response.ok || (data && data.success === false)) {
    const errorMessage =
      data?.error ||
      data?.message ||
      data ||
      `HTTP error! status: ${response.status}`;
    throw new APIError(errorMessage, response.status, data);
  }

  return data;
};

// Helper function to make authenticated requests
const fetchWithAuth = async (url, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
      credentials: "include",
    });

    return await handleResponse(response);
  } catch (error) {
    // Handle 401 Unauthorized errors
    if (error instanceof APIError && error.status === 401) {
      localStorage.removeItem("user");
    }

    console.error("API Error:", error);
    throw error;
  }
};

// AUTH API

export const authAPI = {
  login: async (email, password) => {
    try {
      const data = await fetchWithAuth("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const data = await fetchWithAuth("/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });
      return data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

  logout: async () => {
    try {
      return await fetchWithAuth("/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  },
};

// JOB CARD API

export const jobCardAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    const url = queryString ? `/job-cards?${queryString}` : "/job-cards";
    return await fetchWithAuth(url);
  },

  getById: async (id) => {
    return await fetchWithAuth(`/job-cards/${id}`);
  },

  create: async (jobCardData) => {
    return await fetchWithAuth("/job-cards", {
      method: "POST",
      body: JSON.stringify(jobCardData),
    });
  },

  update: async (id, updateData) => {
    return await fetchWithAuth(`/job-cards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });
  },

  complete: async (id, completionData) => {
    return await fetchWithAuth(`/job-cards/${id}/complete`, {
      method: "POST",
      body: JSON.stringify(completionData),
    });
  },

  delete: async (id) => {
    return await fetchWithAuth(`/job-cards/${id}`, {
      method: "DELETE",
    });
  },

  getStatistics: async () => {
    return await fetchWithAuth("/job-cards/stats");
  },

  downloadPDF: async (id) => {
    const response = await fetch(`${API_BASE_URL}/job-cards/${id}/pdf`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to download PDF");
    }

    return response.blob();
  },
};

// CUSTOMER API

export const customerAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    const url = queryString ? `/customers?${queryString}` : "/customers";
    return await fetchWithAuth(url);
  },

  getById: async (id) => {
    return await fetchWithAuth(`/customers/${id}`);
  },

  create: async (customerData) => {
    return await fetchWithAuth("/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  },

  update: async (id, updateData) => {
    return await fetchWithAuth(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });
  },

  delete: async (id) => {
    return await fetchWithAuth(`/customers/${id}`, {
      method: "DELETE",
    });
  },

  getStatistics: async () => {
    return await fetchWithAuth("/customers/stats");
  },
};

// USER API

export const userAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    const url = queryString ? `/users?${queryString}` : "/users";
    return await fetchWithAuth(url);
  },

  getById: async (id) => {
    return await fetchWithAuth(`/users/${id}`);
  },

  getStatistics: async () => {
    return await fetchWithAuth("/users/stats");
  },

  delete: async (id) => {
    return await fetchWithAuth(`/users/${id}`, {
      method: "DELETE",
    });
  },
};

// PAYMENT API

export const paymentAPI = {
  initiatePayment: async (jobCardId, phoneNumber) => {
    return await fetchWithAuth("/payments/initiate", {
      method: "POST",
      body: JSON.stringify({
        job_card_id: jobCardId,
        phone_number: phoneNumber,
      }),
    });
  },

  getPaymentStatus: async (paymentId) => {
    return await fetchWithAuth(`/payments/${paymentId}`);
  },

  getJobPayments: async (jobId) => {
    return await fetchWithAuth(`/payments/job/${jobId}`);
  },
};

// PAYSTACK PUBLIC API
export const paystackAPI = {
  getPaymentDetails: async (token) => {
    const response = await fetch(`${API_BASE_URL}/pay/${token}`);
    return await handleResponse(response);
  },

  initializePayment: async (token) => {
    const response = await fetch(`${API_BASE_URL}/pay/${token}/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await handleResponse(response);
  },

  verifyPayment: async (token, reference) => {
    const response = await fetch(
      `${API_BASE_URL}/pay/${token}/verify?reference=${reference}`,
    );
    return await handleResponse(response);
  },

  resendInvoice: async (jobId) => {
    const response = await fetch(
      `${API_BASE_URL}/pay/${jobId}/resend-invoice`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    return await handleResponse(response);
  },
};

export default {
  authAPI,
  customerAPI,
  jobCardAPI,
  userAPI,
  paymentAPI,
  paystackAPI,
};
