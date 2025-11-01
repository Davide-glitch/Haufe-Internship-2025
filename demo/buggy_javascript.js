/**
 * Demo file with intentional JavaScript issues for testing
 */

// ISSUE: Hardcoded API key (CRITICAL)
var API_KEY = "sk-1234567890abcdef";

// ISSUE: Using var instead of let/const (WARNING)
var counter = 0;

// ISSUE: Console.log statements (WARNING)
function processUser(user) {
  console.log("Processing user:", user);
  var result = user.name.toUpperCase();
  console.debug("Result:", result);
  return result;
}

// ISSUE: eval usage (CRITICAL)
function executeCode(code) {
  return eval(code);  // Never do this!
}

// ISSUE: Double equals instead of triple (WARNING)
function checkValue(val) {
  if (val == "123") {  // Use === instead
    return true;
  }
  return false;
}

// ISSUE: Missing error handling
async function fetchData(url) {
  const response = await fetch(url);
  return response.json();  // What if this fails?
}

// Good code example
const  CONFIG = {
  apiUrl: process.env.API_URL || 'https://api.example.com'
};

function validateInput(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Input must be a string');
  }
  return input.trim();
}

// TODO: Add rate limiting
async function fetchUserData(userId) {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
