// ============================================
// ScamShield — Risk Engine + UI
// ============================================

const HISTORY_KEY = 'scamshield_history';

// ---------- TAB SWITCHING ----------
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(`panel-${tab.dataset.tab}`).classList.remove('hidden');
    if (tab.dataset.tab === 'history') renderHistory();
  });
});

// ---------- MESSAGE ANALYSIS ----------
document.getElementById('analyzeMsgBtn').addEventListener('click', () => {
  const text = document.getElementById('messageInput').value.trim();
  if (!text) {
    alert('Please paste a message first.');
    return;
  }
  const result = analyzeMessage(text);
  renderResult('messageResult', result);
  saveToHistory(text.slice(0, 80), result);
});

// ---------- LINK ANALYSIS ----------
document.getElementById('analyzeLinkBtn').addEventListener('click', () => {
  const url = document.getElementById('linkInput').value.trim();
  if (!url) {
    alert('Please enter a URL.');
    return;
  }
  const result = analyzeLink(url);
  renderResult('linkResult', result);
  saveToHistory(url, result);
});

document.getElementById('clearHistoryBtn').addEventListener('click', () => {
  if (confirm('Clear all scan history?')) {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  }
});

// ============================================
// RULE-BASED RISK ENGINE
// ============================================

function analyzeMessage(text) {
  const lower = text.toLowerCase();
  let score = 0;
  const flags = [];
  let category = 'General';

  // --- Money / payment patterns ---
  const moneyPatterns = [
    /pay\s*(₹|rs\.?|inr|rupees?)\s*\d+/i,
    /send\s*(₹|rs\.?|inr)?\s*\d+/i,
    /transfer\s*(₹|rs\.?|inr)?\s*\d+/i,
    /registration\s*fee/i,
    /processing\s*(fee|charge)/i,
    /claim\s*(fee|charge)/i,
    /advance\s*(payment|fee)/i,
    /upi\s*(id|number|request)/i,
  ];
  moneyPatterns.forEach(p => {
    if (p.test(text)) {
      score += 18;
      flags.push('Requests money / fee / payment');
    }
  });

  // --- Urgency ---
  const urgency = [
    /immediately/i, /urgent(ly)?/i, /right\s*now/i, /within\s*\d+\s*(hour|minute|day)/i,
    /today\s*only/i, /act\s*now/i, /last\s*chance/i, /account\s*will\s*be\s*block/i,
    /will\s*be\s*(blocked|suspended|closed)/i, /expire(s|d)?\s*(today|soon)/i
  ];
  urgency.forEach(p => {
    if (p.test(text)) {
      score += 12;
      flags.push('Creates urgency / time pressure');
    }
  });

  // --- Fake prize / lottery ---
  if (/won|winner|prize|lottery|jackpot|congratulat/i.test(text) &&
      (/pay|fee|claim|send|transfer|₹|rs\.?/i.test(text))) {
    score += 25;
    flags.push('Unexpected prize + payment request');
    category = 'Fake Prize / Lottery';
  }

  // --- Fake job ---
  if (/(job|work\s*from\s*home|earning|salary|vacancy|hiring)/i.test(text) &&
      /(fee|registration|joining\s*fee|kit\s*fee|training\s*fee|pay\s*₹|rs\.?\s*\d+)/i.test(text)) {
    score += 28;
    flags.push('Job offer that asks for money');
    category = 'Fake Job Offer';
  }
  if (/(₹|rs\.?)\s*(50,?000|1,?00,?000|lakh|lac).{0,30}(day|daily|per\s*day|month)/i.test(text) ||
      /earn\s*(₹|rs\.?)?\s*\d{4,}.{0,20}(day|daily)/i.test(text)) {
    score += 15;
    flags.push('Unrealistic high earnings claim');
    if (category === 'General') category = 'Fake Job Offer';
  }

  // --- Fake bank / KYC ---
  if (/(bank|account|kyc|aadhaar|aadhar|pan\s*card|otp|pin|cvv|password)/i.test(text) &&
      /(block|suspend|verify|update|click|link|urgent|immediately)/i.test(text)) {
    score += 30;
    flags.push('Bank / KYC threat or verification request');
    category = 'Fake Bank / KYC';
  }
  if (/(verify\s*(your\s*)?(kyc|account|details)|update\s*(your\s*)?(kyc|details))/i.test(text)) {
    score += 12;
    flags.push('Asks to verify / update personal or bank details');
  }
  if (/(otp|one\s*time\s*password|pin|password|cvv).{0,40}(share|send|provide|enter|give)/i.test(text) ||
      /(share|send|provide).{0,30}(otp|pin|password|cvv)/i.test(text)) {
    score += 35;
    flags.push('Requests sensitive credentials (OTP / PIN / password)');
    category = 'Credential Phishing';
  }

  // --- Fake delivery ---
  if (/(parcel|package|courier|delivery|shipment|consignment)/i.test(text) &&
      /(pay|fee|₹|rs\.?|reschedule|release|pending|undelivered)/i.test(text)) {
    score += 22;
    flags.push('Unexpected delivery + payment request');
    category = 'Fake Delivery';
  }

  // --- Romance / emotional pressure ---
  if (/(love\s*you|miss\s*you|darling|honey|sweetheart).{0,80}(money|₹|rs\.?|urgent|emergency|help|send|need)/i.test(text) ||
      /(emergency|hospital|stuck|arrested|accident).{0,60}(money|₹|rs\.?|send|help|urgent)/i.test(text)) {
    score += 25;
    flags.push('Emotional pressure + money request');
    category = 'Romance / Financial Pressure';
  }

  // --- Links in message ---
  if (/https?:\/\/|bit\.ly|tinyurl|t\.co|goo\.gl|rebrand\.ly/i.test(text)) {
    score += 10;
    flags.push('Contains a link (verify carefully)');
  }

  // --- Suspicious claim language ---
  if (/(limited\s*time|exclusive\s*offer|selected\s*(as\s*)?winner|government\s*scheme|lottery\s*board)/i.test(text)) {
    score += 8;
    flags.push('Uses typical scam marketing language');
  }

  // Deduplicate flags
  const uniqueFlags = [...new Set(flags)];

  // Cap score
  score = Math.min(score, 100);

  // Determine risk level
  let risk = 'LOW';
  if (score >= 55) risk = 'HIGH';
  else if (score >= 28) risk = 'MEDIUM';

  // Recommendations
  const recommendations = generateRecommendations(risk, category, uniqueFlags);

  // Explain like I'm 10
  const simpleExplanation = generateSimpleExplanation(risk, category, uniqueFlags);

  return {
    risk,
    score,
    category,
    redFlags: uniqueFlags.length ? uniqueFlags : ['No strong red flags detected'],
    recommendations,
    simpleExplanation,
    type: 'message'
  };
}

function analyzeLink(urlStr) {
  let score = 0;
  const flags = [];
  let category = 'URL Analysis';

  let url;
  try {
    // Add protocol if missing for parsing
    const normalized = urlStr.match(/^https?:\/\//i) ? urlStr : 'http://' + urlStr;
    url = new URL(normalized);
  } catch {
    return {
      risk: 'HIGH',
      score: 80,
      category: 'Invalid / Malformed URL',
      redFlags: ['Could not parse the URL – it may be malformed or deliberately confusing'],
      recommendations: [
        'Do not click or visit this link',
        'Type the official website address yourself in the browser'
      ],
      simpleExplanation: 'This link looks broken or tricky on purpose. Don’t open it.',
      type: 'link'
    };
  }

  const host = url.hostname.toLowerCase();
  const full = url.href.toLowerCase();

  // No HTTPS
  if (url.protocol !== 'https:') {
    score += 20;
    flags.push('Does not use HTTPS (connection may not be secure)');
  }

  // IP address instead of domain
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    score += 25;
    flags.push('Uses raw IP address instead of a normal domain name');
  }

  // Very long or suspicious TLDs / structure
  if (host.split('.').length > 4) {
    score += 12;
    flags.push('Unusually complex domain structure');
  }

  // Common lookalike / phishing patterns
  const lookalikes = [
    /paypa[l1]/i, /amaz[0o]n/i, /app[l1]e/i, /micros[o0]ft/i,
    /faceb[o0][o0]k/i, /instagr[a4]m/i, /whats[a4]pp/i,
    /netflix/i, /sbi\.|hdfc|icici|axisbank|paytm|phonepe/i,
    /bankofindia|unionbank|pnb|canarabank/i
  ];
  // Only flag if it's NOT the real domain
  const realDomains = ['paypal.com', 'amazon.in', 'amazon.com', 'apple.com', 'microsoft.com',
    'facebook.com', 'instagram.com', 'whatsapp.com', 'netflix.com',
    'onlinesbi.sbi', 'hdfcbank.com', 'icicibank.com', 'axisbank.com',
    'paytm.com', 'phonepe.com'];
  const isReal = realDomains.some(d => host === d || host.endsWith('.' + d));
  if (!isReal) {
    lookalikes.forEach(p => {
      if (p.test(host)) {
        score += 30;
        flags.push('Possible lookalike / brand-impersonation domain');
      }
    });
  }

  // Login / verify / account paths on unknown domains
  if (/login|signin|sign-in|verify|account|secure|update|kyc|password|otp/i.test(url.pathname + url.search)) {
    score += 15;
    flags.push('URL path looks like a login / verification page');
  }

  // Shorteners
  if (/bit\.ly|tinyurl|t\.co|goo\.gl|rebrand\.ly|ow\.ly|is\.gd|cutt\.ly|shorturl/i.test(host)) {
    score += 18;
    flags.push('Uses a URL shortener (destination is hidden)');
  }

  // Suspicious keywords in full URL
  if (/free.?money|claim.?prize|urgent.?verify|account.?block/i.test(full)) {
    score += 15;
    flags.push('URL contains typical scam keywords');
  }

  // Very new / odd TLDs sometimes used in scams (heuristic)
  if (/\.(xyz|top|club|online|site|icu|buzz|rest|ml|ga|cf|gq)$/i.test(host)) {
    score += 10;
    flags.push('Uses a less-common top-level domain often seen in scams');
  }

  score = Math.min(score, 100);
  let risk = 'LOW';
  if (score >= 50) risk = 'HIGH';
  else if (score >= 25) risk = 'MEDIUM';

  const uniqueFlags = [...new Set(flags)];
  if (uniqueFlags.length === 0) {
    uniqueFlags.push('No strong technical red flags detected');
  }

  return {
    risk,
    score,
    category,
    redFlags: uniqueFlags,
    recommendations: [
      'Do not click the link from the message',
      'Open your browser and type the official website address yourself',
      'If it claims to be a bank or company, use their official app instead',
      'When in doubt, contact the organization using a phone number you already trust'
    ],
    simpleExplanation: risk === 'HIGH'
      ? 'This link looks risky. It might be trying to trick you into giving away passwords or money. Don’t open it — go to the real website yourself.'
      : risk === 'MEDIUM'
      ? 'This link has some warning signs. Be careful. Prefer typing the official address yourself instead of clicking.'
      : 'This link doesn’t show strong warning signs, but still only open links you completely trust.',
    type: 'link',
    parsed: {
      domain: host,
      protocol: url.protocol.replace(':', ''),
      path: url.pathname
    }
  };
}

function generateRecommendations(risk, category, flags) {
  const recs = [];

  if (risk === 'HIGH' || risk === 'MEDIUM') {
    recs.push('Do not click any links in the message');
    recs.push('Do not send money, pay any fee, or share OTP / PIN / password');
  }

  if (category.includes('Bank') || category.includes('KYC') || category.includes('Credential')) {
    recs.push('Open your bank’s official app or website yourself — never use the link from the message');
    recs.push('Call the bank using the number printed on your debit card or official website');
  }

  if (category.includes('Job')) {
    recs.push('Legitimate companies never ask for registration or training fees from candidates');
    recs.push('Search the company name independently and check reviews');
  }

  if (category.includes('Prize') || category.includes('Lottery')) {
    recs.push('Real lottery or prize organizers do not ask you to pay a fee to receive winnings');
  }

  if (category.includes('Delivery')) {
    recs.push('Contact the courier company through their official website or app');
  }

  if (category.includes('Romance')) {
    recs.push('Never send money to someone you have only met online');
    recs.push('Be extra careful with sudden emergencies and emotional pressure');
  }

  recs.push('When unsure, ask a trusted family member or friend before taking any action');

  return [...new Set(recs)];
}

function generateSimpleExplanation(risk, category, flags) {
  if (risk === 'LOW') {
    return 'This message doesn’t show the usual warning signs of a scam. Still, only trust messages from people and companies you already know.';
  }

  const explanations = {
    'Fake Prize / Lottery': 'Someone is pretending you won a big prize and asking you to pay a little money first. Real prizes never ask you to pay to receive them.',
    'Fake Job Offer': 'This looks like a job that promises a lot of money but asks you to pay a fee first. Real employers never charge you to join.',
    'Fake Bank / KYC': 'Someone is pretending to be your bank and trying to scare you into clicking a link or giving secret information. Real banks never ask for OTP or password in a message.',
    'Credential Phishing': 'Someone may be trying to trick you into giving them your login details or OTP — like asking for the key to your house.',
    'Fake Delivery': 'This pretends a package is waiting and asks for a small payment. Real courier companies don’t work this way.',
    'Romance / Financial Pressure': 'Someone is using emotions and an urgent story to get you to send money. Be very careful with people you only know online.',
  };

  return explanations[category] ||
    (risk === 'HIGH'
      ? 'This message has several strong warning signs that are commonly used in scams. It is safer not to click links or send any money.'
      : 'This message has some warning signs. Double-check through official channels before doing anything.');
}

// ============================================
// RENDER RESULT
// ============================================

function renderResult(containerId, result) {
  const el = document.getElementById(containerId);
  const riskClass = result.risk.toLowerCase();

  let domainInfo = '';
  if (result.parsed) {
    domainInfo = `
      <div class="section-title">URL Details</div>
      <div style="font-size:0.95rem;margin-bottom:0.75rem;">
        <div><strong>Domain:</strong> ${escapeHtml(result.parsed.domain)}</div>
        <div><strong>Protocol:</strong> ${escapeHtml(result.parsed.protocol)}</div>
        <div><strong>Path:</strong> ${escapeHtml(result.parsed.path || '/')}</div>
      </div>
    `;
  }

  el.innerHTML = `
    <div class="risk-badge ${riskClass}">
      ${result.risk === 'HIGH' ? '🔴' : result.risk === 'MEDIUM' ? '🟠' : '🟢'}
      ${result.risk} RISK
    </div>
    <div class="category-tag">${escapeHtml(result.category)}</div>
    <div style="font-size:1.1rem;font-weight:700;margin-bottom:0.25rem;">
      Risk Score: ${result.score}/100
    </div>
    <div class="score-bar">
      <div class="score-fill ${riskClass}" style="width:${result.score}%"></div>
    </div>

    ${domainInfo}

    <div class="section-title">Red Flags Detected</div>
    <ul class="flags">
      ${result.redFlags.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
    </ul>

    <div class="section-title">What you should do</div>
    <ul class="recs">
      ${result.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
    </ul>

    <div class="simple-box">
      <h4>🧒 Explain like I’m 10</h4>
      <p>${escapeHtml(result.simpleExplanation)}</p>
    </div>
  `;

  el.classList.add('show');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================
// HISTORY (localStorage)
// ============================================

function saveToHistory(preview, result) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  history.unshift({
    preview: preview.slice(0, 70),
    risk: result.risk,
    score: result.score,
    category: result.category,
    time: new Date().toLocaleString(),
  });
  // Keep last 50
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  const list = document.getElementById('historyList');

  // Stats
  const total = history.length;
  const high = history.filter(h => h.risk === 'HIGH').length;
  const medium = history.filter(h => h.risk === 'MEDIUM').length;
  const low = history.filter(h => h.risk === 'LOW').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statHigh').textContent = high;
  document.getElementById('statMedium').textContent = medium;
  document.getElementById('statLow').textContent = low;

  if (history.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);padding:1rem 0;">No scans yet. Analyze a message or link to start.</p>';
    return;
  }

  list.innerHTML = history.map(h => `
    <div class="history-item">
      <span class="history-risk ${h.risk.toLowerCase()}">${h.risk}</span>
      <span class="history-text" title="${escapeHtml(h.preview)}">${escapeHtml(h.preview)}</span>
      <span style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap;">${h.time}</span>
    </div>
  `).join('');
}

// Initial history render if needed
renderHistory();
