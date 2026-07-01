

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL   = 'https://gw.fbr.gov.pk/di_data/v1/di';
const ENDPOINTS  = {
  validate : `${BASE_URL}/validateinvoicedata_sb`,
  submit   : `${BASE_URL}/postinvoicedata_sb`,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format today's date as yyyy-MM-dd (FBR required format)
 */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Core fetch wrapper — throws a structured FbrError on non-2xx or network failure
 */
async function fbrFetch(endpoint, token, body) {
  let response;

  try {
    response = await fetch(endpoint, {
      method  : 'POST',
      headers : {
        'Content-Type'  : 'application/json',
        'Authorization' : `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new FbrError('NETWORK_ERROR', networkErr.message, null, body);
  }

  let responseBody;
  const contentType = response.headers.get('content-type') ?? '';

try {
  const text = await response.text();
  console.log(`[FBR RAW] status=${response.status} body=${text}`);
  responseBody = text ? JSON.parse(text.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')) : null;
} catch {
  responseBody = '<could not parse response body>';
}

  if (!response.ok) {
    throw new FbrError(
      `HTTP_${response.status}`,
      `FBR returned ${response.status} ${response.statusText}`,
      responseBody,
      body,
    );
  }

  return { status: response.status, data: responseBody };
}

// ─── Custom Error ─────────────────────────────────────────────────────────────

export class FbrError extends Error {
  /**
   * @param {string} code        - machine-readable code e.g. HTTP_401, NETWORK_ERROR
   * @param {string} message     - human message
   * @param {*}      responseBody- raw FBR response (may be null)
   * @param {*}      sentPayload - the payload we sent (useful for debugging)
   */
  constructor(code, message, responseBody = null, sentPayload = null) {
    super(message);
    this.name         = 'FbrError';
    this.code         = code;
    this.responseBody = responseBody;
    this.sentPayload  = sentPayload;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate an invoice in sandbox without officially submitting it.
 * Good to call before submitInvoice to catch field errors early.
 *
 * @param {string} token   - sandbox bearer token from IRIS
 * @param {object} invoice - invoice object (see buildSampleInvoice)
 * @returns {{ status: number, data: any }}
 */
export async function validateInvoice(token, invoice) {
  if (!token) throw new Error('Bearer token is required');
  return fbrFetch(ENDPOINTS.validate, token, invoice);
}

/**
 * Submit an invoice to the FBR sandbox.
 * On success FBR returns a fbrInvoiceNo — store this in your DB.
 *
 * @param {string} token   - sandbox bearer token from IRIS
 * @param {object} invoice - invoice object (see buildSampleInvoice)
 * @returns {{ status: number, data: any }}
 */
export async function submitInvoice(token, invoice) {
  if (!token) throw new Error('Bearer token is required');
  return fbrFetch(ENDPOINTS.submit, token, invoice);
}

/**
 * Convenience: validate THEN submit in one call.
 * Stops and throws if validation fails.
 *
 * @param {string} token
 * @param {object} invoice
 * @returns {{ validation: any, submission: any }}
 */
export async function validateThenSubmit(token, invoice) {
  const validation = await validateInvoice(token, invoice);
  const submission = await submitInvoice(token, invoice);
  return { validation, submission };
}

// ─── Invoice Builder ──────────────────────────────────────────────────────────

/**
 * Build a minimal valid SN001 invoice payload, with optional overrides.
 *
 * scenarioId reference (sandbox only):
 *   SN001  — Standard rate goods, registered buyer   (18%, most common)
 *   SN002  — Standard rate goods, unregistered buyer
 *   SN005  — Zero-rated goods
 *   SN006  — Exempt goods
 *   SN007  — Services
 *   SN008  — Reduced rate goods
 *   SN009  — Cotton ginners
 *   SN010  — Telecom services
 *   SN016  — Advance payment invoice
 *   SN017  — Credit note
 *   SN018  — Debit note
 *   SN024  — Fixed/notified value goods
 *   SN026  — Further tax
 *   SN027  — FED applicable
 *   SN028  — Withholding tax
 *
 * @param {Partial<InvoicePayload>} overrides - any field(s) to override
 * @returns {InvoicePayload}
 */
export function buildSampleInvoice(overrides = {}) {
  const base = {
    invoiceType           : 'Sale Invoice',
    invoiceDate           : todayStr(),
    sellerNTNCNIC         : '8885801',           // ← your NTN/CNIC from IRIS
    sellerBusinessName    : 'Your Business Name',
    sellerProvince        : 'Sindh',
    sellerAddress         : 'Karachi',
    buyerNTNCNIC          : '2046004',
    buyerBusinessName     : 'Test Buyer Co.',
    buyerProvince         : 'Sindh',
    buyerAddress          : 'Karachi',
    buyerRegistrationType : 'Registered',
    invoiceRefNo          : '',
    scenarioId            : 'SN001',             // required in sandbox, omit in production
    items: [
      {
        hsCode                        : '0101.2100',
        productDescription            : 'Test Product',
        rate                          : '18%',
        uoM                           : 'Numbers, pieces, units',
        quantity                      : 1,
        totalValues                   : 0,
        valueSalesExcludingST         : 1000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable            : 180,
        salesTaxWithheldAtSource      : 0,
        extraTax                      : '',
        furtherTax                    : 0,
        sroScheduleNo                 : '',
        fedPayable                    : 0,
        discount                      : 0,
        saleType                      : 'Goods at standard rate (default)',
        sroItemSerialNo               : '',
      },
    ],
  };

  // Deep-merge items array if overrides includes one
  if (overrides.items) {
    const mergedItems = overrides.items.map((item, i) => ({
      ...(base.items[i] ?? base.items[0]),
      ...item,
    }));
    return { ...base, ...overrides, items: mergedItems };
  }

  return { ...base, ...overrides };
}

// ─── Quick-test runner ────────────────────────────────────────────────────────
// Run directly:  node fbr-sandbox.js YOUR_TOKEN
// or:            FBR_TOKEN=xxx node fbr-sandbox.js

if (process.argv[1].endsWith('fbr-sandbox.js')) {
  const token = process.argv[2] || process.env.FBR_TOKEN;

  if (!token) {
    console.error('\n[FBR] ❌  Provide your sandbox token:');
    console.error('         node fbr-sandbox.js <YOUR_TOKEN>');
    console.error('     or: FBR_TOKEN=<YOUR_TOKEN> node fbr-sandbox.js\n');
    process.exit(1);
  }

  (async () => {
    const invoice = buildSampleInvoice({ scenarioId: 'SN001' });

    console.log('\n══════════════════════════════════════════════');
    console.log('  FBR IRIS Sandbox — Quick Test');
    console.log('══════════════════════════════════════════════');
    console.log('\n[1/2] Validating invoice…');
    console.log('  Payload:', JSON.stringify(invoice, null, 2));

    try {
      const validation = await validateInvoice(token, invoice);
      console.log('\n  ✅ Validation response:');
      console.log(' ', JSON.stringify(validation.data, null, 2));
    } catch (err) {
      console.error('\n  ❌ Validation failed:', err.code, '—', err.message);
      if (err.responseBody) console.error('  FBR said:', JSON.stringify(err.responseBody, null, 2));
      process.exit(1);
    }

    console.log('\n[2/2] Submitting invoice…');

    try {
      const submission = await submitInvoice(token, invoice);
      console.log('\n  ✅ Submission response:');
      console.log(' ', JSON.stringify(submission.data, null, 2));
      const invoiceNo = submission.data?.fbrInvoiceNo ?? submission.data?.invoiceNo ?? '(check response above)';
      console.log(`\n  🎉 FBR Invoice No: ${invoiceNo}`);
    } catch (err) {
      console.error('\n  ❌ Submission failed:', err.code, '—', err.message);
      if (err.responseBody) console.error('  FBR said:', JSON.stringify(err.responseBody, null, 2));
      process.exit(1);
    }

    console.log('\n══════════════════════════════════════════════\n');
  })();
}