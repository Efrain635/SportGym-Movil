// Funciones utilitarias para pruebas

const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const reverseString = (str) => {
  return str.split('').reverse().join('');
};

const isPalindrome = (str) => {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
};

const countWords = (str) => {
  return str.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const unique = (arr) => {
  return [...new Set(arr)];
};

const shuffle = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

const factorial = (n) => {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
};

const fibonacci = (n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};

const isPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
};

const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const truncate = (str, length) => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

module.exports = {
  isValidEmail,
  capitalize,
  reverseString,
  isPalindrome,
  countWords,
  unique,
  shuffle,
  deepClone,
  factorial,
  fibonacci,
  isPrime,
  formatCurrency,
  truncate,
  generateId,
  chunk,
  debounce
};
