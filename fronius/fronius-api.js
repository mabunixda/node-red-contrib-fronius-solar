"use strict";

const axios = require("axios");
const https = require("https");

const DEFAULT_DEVICE_ID = 1;
const DEFAULT_TIMEOUT = 20000;

const debug =
  process.env.FRONIUS_DEBUG === "true"
    ? (...args) => console.log("[fronius-api]", ...args)
    : () => {};

// Request queue to serialize requests (Fronius inverters can be overwhelmed by concurrent requests)
let lastRequest = Promise.resolve();

/**
 * Creates an axios instance configured for Fronius API requests
 * @param {Object} options - Connection options
 * @returns {import('axios').AxiosInstance}
 */
function createClient(options) {
  const protocol = options.protocol === "https:" ? "https" : "http";
  const baseURL = `${protocol}://${options.host}:${options.port || (protocol === "https" ? 443 : 80)}`;

  const config = {
    baseURL,
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: {
      Accept: "application/json",
    },
    // Allow self-signed certificates (common for inverter web interfaces)
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  };

  // Add digest auth if credentials are provided
  if (options.username && options.password) {
    config.auth = {
      username: options.username,
      password: options.password,
    };
  }

  const client = axios.create(config);

  // Request interceptor for debugging
  client.interceptors.request.use((config) => {
    debug("REQUEST:", config.method?.toUpperCase(), config.url);
    return config;
  });

  // Response interceptor for debugging
  client.interceptors.response.use(
    (response) => {
      debug("RESPONSE:", response.status, response.config.url);
      return response;
    },
    (error) => {
      debug("ERROR:", error.message);
      return Promise.reject(error);
    },
  );

  return client;
}

/**
 * Validates that the response has the expected Fronius API structure
 * @param {Object} data - Response data
 * @returns {boolean}
 */
function isValidResponse(data) {
  return data && typeof data === "object" && "Head" in data && "Body" in data;
}

/**
 * Makes a serialized request to the Fronius API
 * @param {Object} options - Request options
 * @param {string} path - API endpoint path
 * @returns {Promise<Object>}
 */
async function makeRequest(options, path) {
  const client = createClient(options);

  // Serialize requests to avoid overwhelming the inverter
  const request = lastRequest.then(async () => {
    try {
      const response = await client.get(path);

      if (!isValidResponse(response.data)) {
        throw new Error("Invalid response body format: Head and Body expected");
      }

      return response.data;
    } catch (error) {
      // Transform axios errors to user-friendly messages
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error("Unauthorized: check username/password");
        }
        throw new Error(
          `Request failed. HTTP Status Code: ${error.response.status}`,
        );
      } else if (error.code === "ECONNABORTED") {
        throw new Error("Request timeout occurred - request aborted");
      } else if (error.code === "ECONNREFUSED") {
        throw new Error(
          `Connection refused - check if inverter is reachable at ${options.host}`,
        );
      } else if (error.code === "ENOTFOUND") {
        throw new Error(`Host not found: ${options.host}`);
      }
      throw error;
    }
  });

  // Update lastRequest but don't let failures block future requests
  lastRequest = request.catch(() => {});

  return request;
}

/**
 * Validates required properties are present in options
 * @param {Object} options - Options object
 * @param {string[]} required - Required property names
 */
function validateOptions(options, required) {
  for (const prop of required) {
    if (options[prop] === undefined || options[prop] === null) {
      throw new Error(`Request options lacks required property=${prop}`);
    }
  }
}

/**
 * Get inverter realtime data
 * @param {Object} options - Connection options
 * @returns {Promise<Object>}
 */
async function GetInverterRealtimeData(options) {
  validateOptions(options, ["host", "deviceId"]);

  const deviceId = options.deviceId || DEFAULT_DEVICE_ID;
  let path;

  if (options.version === 0) {
    path = `/solar_api/GetInverterRealtimeData.cgi?Scope=Device&DeviceIndex=${deviceId}&DataCollection=CommonInverterData`;
  } else {
    path = `/solar_api/v1/GetInverterRealtimeData.cgi?Scope=Device&DeviceId=${deviceId}&DataCollection=CommonInverterData`;
  }

  return makeRequest(options, path);
}

/**
 * Get components data (undocumented API for Symo inverters)
 * @param {Object} options - Connection options
 * @returns {Promise<Object>}
 */
async function GetComponentsData(options) {
  validateOptions(options, ["host"]);
  return makeRequest(options, "/components/5/0/?print=names");
}

/**
 * Get power flow realtime data
 * @param {Object} options - Connection options
 * @returns {Promise<Object>}
 */
async function GetPowerFlowRealtimeData(options) {
  validateOptions(options, ["host"]);
  return makeRequest(options, "/solar_api/v1/GetPowerFlowRealtimeData.fcgi");
}

/**
 * Get storage realtime data (for battery systems)
 * @param {Object} options - Connection options
 * @returns {Promise<Object>}
 */
async function GetStorageRealtimeData(options) {
  validateOptions(options, ["host"]);

  const deviceId = options.deviceId || DEFAULT_DEVICE_ID;
  return makeRequest(
    options,
    `/solar_api/v1/GetStorageRealtimeData.cgi?Scope=Device&DeviceId=${deviceId}`,
  );
}

/**
 * Get meter realtime data (for power meter / smart meter)
 * @param {Object} options - Connection options
 * @returns {Promise<Object>}
 */
async function GetMeterRealtimeData(options) {
  validateOptions(options, ["host"]);

  const deviceId = options.deviceId || DEFAULT_DEVICE_ID;
  return makeRequest(
    options,
    `/solar_api/v1/GetMeterRealtimeData.cgi?Scope=Device&DeviceId=${deviceId}`,
  );
}

module.exports = {
  GetInverterRealtimeData,
  GetComponentsData,
  GetPowerFlowRealtimeData,
  GetStorageRealtimeData,
  GetMeterRealtimeData,
};
