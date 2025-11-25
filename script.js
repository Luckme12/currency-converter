// script.js - Currency Converter (PHP <-> USD <-> EUR)
// Uses exchangerate.host for live rates with fallback to static rates.

// --- Configuration / fallback static rates (approximate; only used if API fails) ---
const STATIC_RATES = {
  // 1 PHP equals:
  PHP: { USD: 0.017, EUR: 0.016 }, // example static rates (update as you like)
  USD: { PHP: 58.5, EUR: 0.93 },
  EUR: { PHP: 63.0, USD: 1.08 }
};

// --- DOM elements ---
const amountEl = document.getElementById('amount');
const fromEl = document.getElementById('from');
const toEl = document.getElementById('to');
const convertBtn = document.getElementById('convertBtn');
const swapBtn = document.getElementById('swapBtn');
const statusEl = document.getElementById('status');
const convertedValueEl = document.getElementById('convertedValue');
const rateInfoEl = document.getElementById('rateInfo');

// --- Helpers ---
function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#ff9b9b' : '';
}

function formatNumber(n) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

// Fetch latest rates from exchangerate.host
// We'll request base = fromCurrency and symbols = toCurrency to minimize data
async function fetchRate(fromCurrency, toCurrency) {
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(fromCurrency)}&symbols=${encodeURIComponent(toCurrency)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network response not ok');
  const data = await res.json();
  if (!data || !data.rates || typeof data.rates[toCurrency] !== 'number') {
    throw new Error('Malformed API response');
  }
  return data.rates[toCurrency];
}

// Convert using either live rate or static fallback
async function convert() {
  const amount = parseFloat(amountEl.value);
  if (!isFinite(amount)) {
    setStatus('Please enter a valid amount', true);
    return;
  }

  const from = fromEl.value;
  const to = toEl.value;

  // identical currency quick path
  if (from === to) {
    convertedValueEl.textContent = `${formatNumber(amount)} ${to}`;
    rateInfoEl.textContent = `Rate: 1 ${from} = 1 ${to}`;
    setStatus('Same currency — no conversion needed');
    return;
  }

  setStatus('Fetching latest rate…');

  let rate;
  try {
    rate = await fetchRate(from, to);
    setStatus('Live rate loaded');
  } catch (err) {
    console.warn('Live API failed, using fallback static rates:', err);
    setStatus('Live rates unavailable — using fallback static rates', true);

    // fallback lookup from static table
    if (STATIC_RATES[from] && STATIC_RATES[from][to]) {
      rate = STATIC_RATES[from][to];
    } else {
      // If we don't have direct table, try to compute via USD (common pivot)
      if (STATIC_RATES[from] && STATIC_RATES[from]['USD'] && STATIC_RATES['USD'] && STATIC_RATES['USD'][to]) {
        rate = STATIC_RATES[from]['USD'] * STATIC_RATES['USD'][to];
      } else {
        // last resort: error
        setStatus('No fallback rate available for that pair', true);
        convertedValueEl.textContent = '—';
        rateInfoEl.textContent = 'Rate: —';
        return;
      }
    }
  }

  const converted = amount * rate;
  convertedValueEl.textContent = `${formatNumber(converted)} ${to}`;
  rateInfoEl.textContent = `Rate: 1 ${from} = ${formatNumber(rate)} ${to}`;
}

// Swap from/to selections
function swapCurrencies() {
  const tmp = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value = tmp;
  // update UI quickly
  convert();
}

// Event listeners
convertBtn.addEventListener('click', convert);
swapBtn.addEventListener('click', (e) => { e.preventDefault(); swapCurrencies(); });

// Optional: convert when user changes inputs for fast UX
[amountEl, fromEl, toEl].forEach(el => {
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') convert();
  });
});
