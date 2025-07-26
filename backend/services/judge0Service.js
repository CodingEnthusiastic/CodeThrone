const JUDGE0_API_KEYS = [
  process.env.JUDGE0_API_KEY_1 || '6122def4d2mshe32cbcfded19d6dp158ca4jsn8310ab11ffd6',
  process.env.JUDGE0_API_KEY_2 || 'ab2e9c3104msh1bbe6d326aef7f6p1ffa71jsn844d209e717a',
  process.env.JUDGE0_API_KEY_3 || '515b75cad0mshe6e5ecf2ab4eb03p1f0e3ejsn242d18a58e3e',
  process.env.JUDGE0_API_KEY_4 || 'f7b6209c49msh4a25edf04f27133p1247edjsn15b5227e5164',
  process.env.JUDGE0_API_KEY_5 || 'b7055c95acmsh34946e84e4e6f61p1448adjsn7ebce46cd253', // Pro key
];

// Track API key usage for intelligent fallback
let currentKeyIndex = 0;
let keyFailureCount = {};
let lastResetTime = Date.now();

// Reset failure counts every hour to give failed keys another chance
const RESET_INTERVAL = 60 * 60 * 1000; // 1 hour

// Initialize failure count tracking
JUDGE0_API_KEYS.forEach((_, index) => {
  keyFailureCount[index] = 0;
});

/**
 * Get the next available Judge0 API key with intelligent fallback
 * @returns {Object} { key: string, index: number }
 */
function getNextApiKey() {
  const now = Date.now();
  
  // Reset failure counts if it's been more than an hour
  if (now - lastResetTime > RESET_INTERVAL) {
    console.log('🔄 Resetting Judge0 API key failure counts');
    Object.keys(keyFailureCount).forEach(index => {
      keyFailureCount[index] = 0;
    });
    lastResetTime = now;
    currentKeyIndex = 0;
  }

  // Find the next available key (one with lowest failure count)
  let bestKeyIndex = 0;
  let lowestFailureCount = keyFailureCount[0];

  for (let i = 1; i < JUDGE0_API_KEYS.length; i++) {
    if (keyFailureCount[i] < lowestFailureCount) {
      lowestFailureCount = keyFailureCount[i];
      bestKeyIndex = i;
    }
  }

  currentKeyIndex = bestKeyIndex;
  const key = JUDGE0_API_KEYS[currentKeyIndex];
  
  console.log(`🔑 Using Judge0 API key ${currentKeyIndex + 1} (failures: ${keyFailureCount[currentKeyIndex]})`);
  
  return {
    key,
    index: currentKeyIndex
  };
}

/**
 * Mark an API key as failed and increment its failure count
 * @param {number} keyIndex - Index of the failed key
 */
function markKeyAsFailed(keyIndex) {
  if (keyIndex >= 0 && keyIndex < JUDGE0_API_KEYS.length) {
    keyFailureCount[keyIndex]++;
    console.log(`❌ Judge0 API key ${keyIndex + 1} failed (total failures: ${keyFailureCount[keyIndex]})`);
  }
}

/**
 * Make a request to Judge0 API with automatic key fallback
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of different keys to try
 * @returns {Promise<Response>}
 */
async function makeJudge0Request(url, options = {}, maxRetries = JUDGE0_API_KEYS.length) {
  let lastError = null;
  let attemptsCount = 0;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { key, index } = getNextApiKey();
    attemptsCount++;
    
    try {
      const requestOptions = {
        ...options,
        headers: {
          ...options.headers,
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        }
      };

      console.log(`🚀 Attempt ${attemptsCount}: Making Judge0 request with key ${index + 1}`);
      
      const response = await fetch(url, requestOptions);
      
      // Check for rate limiting or API key issues
      if (response.status === 429) {
        console.log(`⚠️ Rate limit hit on key ${index + 1}, trying next key`);
        markKeyAsFailed(index);
        lastError = new Error(`Rate limit exceeded on key ${index + 1}`);
        continue;
      }
      
      if (response.status === 403) {
        console.log(`⚠️ Forbidden on key ${index + 1}, trying next key`);
        markKeyAsFailed(index);
        lastError = new Error(`Forbidden access on key ${index + 1}`);
        continue;
      }
      
      if (response.status === 401) {
        console.log(`⚠️ Unauthorized on key ${index + 1}, trying next key`);
        markKeyAsFailed(index);
        lastError = new Error(`Unauthorized access on key ${index + 1}`);
        continue;
      }
      
      if (!response.ok) {
        console.log(`⚠️ HTTP error ${response.status} on key ${index + 1}, trying next key`);
        markKeyAsFailed(index);
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        continue;
      }
      
      // Success! Reset the failure count for this key
      keyFailureCount[index] = Math.max(0, keyFailureCount[index] - 1);
      console.log(`✅ Successful request with Judge0 key ${index + 1}`);
      
      return response;
      
    } catch (error) {
      console.log(`❌ Network error with key ${index + 1}:`, error.message);
      markKeyAsFailed(index);
      lastError = error;
      
      // If it's a network error, wait a bit before trying the next key
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // All keys failed
  console.error('❌ All Judge0 API keys failed!');
  throw new Error(`All Judge0 API keys exhausted. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Get current API key statistics for monitoring
 * @returns {Object} Statistics about key usage
 */
function getApiKeyStats() {
  return {
    totalKeys: JUDGE0_API_KEYS.length,
    currentKeyIndex: currentKeyIndex + 1,
    keyFailures: { ...keyFailureCount },
    lastResetTime: new Date(lastResetTime).toISOString(),
    nextResetIn: Math.max(0, RESET_INTERVAL - (Date.now() - lastResetTime))
  };
}

export {
  makeJudge0Request,
  getNextApiKey,
  markKeyAsFailed,
  getApiKeyStats,
  JUDGE0_API_KEYS
};
