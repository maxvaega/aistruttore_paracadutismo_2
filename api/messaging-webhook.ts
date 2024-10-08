// api/messaging-webhook.js

const { VercelRequest, VercelResponse } = require('@vercel/node');
const { verifyRequestSignature } = require('../utils/verifySignature');
const { handleInstagramObj } = require('../utils/openai');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verificato con successo');
        res.status(200).send(challenge);
      } else {
        console.error('Token di verifica non valido');
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  } else if (req.method === 'POST') {
    // Verifica della firma
    if (!verifyRequestSignature(req)) {
      return res.status(403).send('Firma non valida');
    }

    const body = req.body;

    if (body.object === 'instagram') {
      try {
        await handleInstagramObj(body);
        res.status(200).send('EVENT_RECEIVED - instagram');
      } catch (error) {
        console.error('Errore nella gestione dell\'evento Instagram:', error);
        res.sendStatus(500);
      }
    } else {
      res.status(404).send('WRONG EVENT_RECEIVED');
    }
  } else {
    res.sendStatus(405);
  }
};
