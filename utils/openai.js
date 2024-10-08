// utils/openai.js

const axios = require('axios');
const { cleanResponseText } = require('./cleanResponse');

const threads = {}; // In produzione, sostituisci con un database

async function handleInstagramObj(body) {
  const promises = [];

  body.entry.forEach((entry) => {
    const messaging = entry.messaging;

    messaging.forEach((event) => {
      if (event.message && event.message.text && !event.message.is_echo) {
        const senderId = event.sender.id;
        const messageText = event.message.text;

        promises.push(
          processMessage(senderId, messageText)
            .then((responseText) => sendMessage(senderId, responseText))
            .catch((error) => {
              console.error('Errore nel processare il messaggio:', error);
            })
        );
      } else {
        console.log('Evento non gestito o messaggio di eco');
      }
    });
  });

  await Promise.all(promises);
}

async function processMessage(senderId, messageText) {
  let threadId = threads[senderId];

  if (!threadId) {
    threadId = await createThread(senderId);
    threads[senderId] = threadId;
  }

  await addMessageToThread(threadId, 'user', messageText);
  const runId = await runThread(threadId, senderId);

  await waitForRunCompletion(threadId, runId);
  const responseText = await getAssistantResponse(threadId, runId);

  const cleanedText = cleanResponseText(responseText);

  return cleanedText;
}

async function createThread(senderId) {
  const OPENAI_TOKEN = process.env.OPENAI_TOKEN;

  const config = {
    method: 'post',
    url: 'https://api.openai.com/v1/threads',
    headers: {
      'OpenAI-Beta': 'assistants=v2',
      Authorization: `Bearer ${OPENAI_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await axios(config);
    return response.data.id;
  } catch (error) {
    console.error('Errore nella creazione del thread:', error.response ? error.response.data : error);
    throw error;
  }
}

async function addMessageToThread(threadId, role, content) {
  const OPENAI_TOKEN = process.env.OPENAI_TOKEN;

  const config = {
    method: 'post',
    url: `https://api.openai.com/v1/threads/${threadId}/messages`,
    headers: {
      'OpenAI-Beta': 'assistants=v2',
      Authorization: `Bearer ${OPENAI_TOKEN}`,
      'Content-Type': 'application/json',
    },
    data: {
      role: role,
      content: content,
    },
  };

  try {
    await axios(config);
  } catch (error) {
    console.error('Errore nell\'aggiunta del messaggio al thread:', error.response ? error.response.data : error);
    throw error;
  }
}

async function runThread(threadId, senderId) {
  const OPENAI_TOKEN = process.env.OPENAI_TOKEN;
  const assistantId = 'asst_VtO7QR4yBlqYK2JL2LW1g5FN'; // ID dell'assistente AIstruttore

  const data = {
    assistant_id: assistantId,
    additional_instructions: `utente: ${senderId}`,
    tool_choice: {
      type: 'file_search',
    },
  };

  const config = {
    method: 'post',
    url: `https://api.openai.com/v1/threads/${threadId}/runs`,
    headers: {
      'OpenAI-Beta': 'assistants=v2',
      Authorization: `Bearer ${OPENAI_TOKEN}`,
      'Content-Type': 'application/json',
    },
    data: data,
  };

  try {
    const response = await axios(config);
    return response.data.id;
  } catch (error) {
    console.error('Errore nell\'esecuzione del thread:', error.response ? error.response.data : error);
    throw error;
  }
}

async function waitForRunCompletion(threadId, runId) {
  const OPENAI_TOKEN = process.env.OPENAI_TOKEN;

  const config = {
    method: 'get',
    url: `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
    headers: {
      'OpenAI-Beta': 'assistants=v2',
      Authorization: `Bearer ${OPENAI_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const response = await axios(config);
      const status = response.data.status;

      if (!['queued', 'in_progress'].includes(status)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    } catch (error) {
      console.error('Errore nell\'attesa del completamento del run:', error.response ? error.response.data : error);
      throw error;
    }
  }

  throw new Error('Timeout nell\'attesa del completamento del run');
}

async function getAssistantResponse(threadId, runId) {
  const OPENAI_TOKEN = process.env.OPENAI_TOKEN;

  const config = {
    method: 'get',
    url: `https://api.openai.com/v1/threads/${threadId}/messages`,
    headers: {
      'OpenAI-Beta': 'assistants=v2',
      Authorization: `Bearer ${OPENAI_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const response = await axios(config);
      const messages = response.data.data;

      const assistantMessage = messages.find(
        (msg) => msg.run_id === runId && msg.role === 'assistant'
      );

      if (assistantMessage && assistantMessage.content.length > 0) {
        return assistantMessage.content[0].text.value;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    } catch (error) {
      console.error('Errore nel recupero della risposta dell\'assistente:', error.response ? error.response.data : error);
      throw error;
    }
  }

  throw new Error('Timeout nel recupero della risposta dell\'assistente');
}

async function sendMessage(senderId, messageText) {
  const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

  const url = `https://graph.facebook.com/v16.0/me/messages?access_token=${ACCESS_TOKEN}`;

  const payload = {
    recipient: { id: senderId },
    message: { text: messageText },
  };

  try {
    await axios.post(url, payload);
    console.log('Messaggio inviato a:', senderId);
  } catch (error) {
    console.error('Errore nell\'invio del messaggio:', error.response ? error.response.data : error);
    throw error;
  }
}

module.exports = { handleInstagramObj };
