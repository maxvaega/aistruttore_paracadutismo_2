// utils/verifySignature.js

const crypto = require('crypto');

function verifyRequestSignature(req) {
  const APP_SECRET = process.env.APP_SECRET;
  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    console.error('Nessuna firma nella richiesta');
    return false;
  }

  const elements = signature.split('=');
  const signatureHash = elements[1];

  const expectedHash = crypto
    .createHmac('sha256', APP_SECRET)
    .update(req.rawBody)
    .digest('hex');

  if (signatureHash !== expectedHash) {
    console.error('Firma non valida');
    return false;
  }

  return true;
}

module.exports = { verifyRequestSignature };
