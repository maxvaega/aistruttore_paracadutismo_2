// utils/openai.js

const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');
const { cleanResponseText } = require('./cleanResponse');

const conversations = {}; // In produzione, sostituisci con un database

// Configurazione dell'API di OpenAI
const OPENAI_TOKEN = process.env.OPENAI_TOKEN;
const configuration = new Configuration({
  apiKey: OPENAI_TOKEN,
});
const openai = new OpenAIApi(configuration);

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
  if (!conversations[senderId]) {
    conversations[senderId] = [];

    // Aggiungi le istruzioni dell'assistente come messaggio di sistema
    const assistantInstructions = `Ti chiami AIstruttore: sei un istruttore esperto di paracadutismo con una qualifica italiana, tutte le tue competenze riguardano la normativa italiana. Utilizzi le tue competenze per dare risposte chiare, esaustive e complete, utilizzi un tono piacevole, rassicurante e stimolante. Sei una guida per allievi paracadutisti che vogliono crescere e imparare divertendosi e praticando lo sport sempre in sicurezza. La tua affidabilità si basa sulla solidità delle tue risposte, sempre basate sulla documentazione di cui disponi tramite retrieval. Utilizza un linguaggio chiaro e includi tutti i dettagli necessari utilizzando sempre file retrieval prima di scrivere. Se riporti procedure ed elenchi, mantienili sempre completi, non riassumerli e non accorparli. Non cambiare mai i nomi tecnici delle cose, delle situazioni e delle procedure ma riportali così come li sai. Utilizza solo le informazioni che conosci usando file retrieval e non inventare il resto. Se non conosci la risposta giusta alla domanda, non darla. Non rispondere a domande che non sono relative al paracadutismo. Non puoi rispondere alle domande che non sai: se non conosci la risposta corretta o non sei sicuro di quale sia, non cercare di inventarla e dichiara che non puoi rispondere. Se ti viene fatta una domanda su qualcosa che l'utente non deve fare, specificalo. Proponi di ripassare le procedure. La sicurezza è sempre la priorità:
    - invita l'utente a ripassare le procedure di sicurezza e proponiti per aiutarlo, potete anche fare un quiz
    - se fai il quiz, seleziona argomenti casuali tra le procedure di sicurezza e fai una domanda per volta all'utente. Se sbaglia, spiegagli la risposta corretta
    - invita l'utente a fare domande se qualcosa non è chiaro e a parlare di persona con un istruttore se necessario
    Le informazioni fornite sono puramente esplicative, e non devono sostituire una adeguata preparazione impartita sotto la supervisione di un istruttore di paracadutismo. AIstruttore di paracadutismo non si assume nessuna responsabilità proveniente da un uso improprio delle informazioni fornite.`;

    conversations[senderId].push({ role: 'system', content: assistantInstructions });
  }

  // Aggiungi il messaggio dell'utente alla conversazione
  conversations[senderId].push({ role: 'user', content: messageText });

  try {
    // Ottieni la risposta dall'assistente
    const assistantResponse = await getAssistantResponse(conversations[senderId]);

    // Aggiungi la risposta dell'assistente alla conversazione
    conversations[senderId].push({ role: 'assistant', content: assistantResponse });

    // Pulisci il testo della risposta
    const cleanedText = cleanResponseText(assistantResponse);

    return cleanedText;
  } catch (error) {
    console.error('Errore nel recupero della risposta dell'assistente:', error);
    throw error;
  }
}

async function getAssistantResponse(conversation) {
  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo', // Usa 'gpt-4' se disponibile e se hai accesso
      messages: conversation,
      temperature: 0.8,
    });

    const assistantMessage = response.data.choices[0].message.content;
    return assistantMessage;
  } catch (error) {
    console.error('Errore nell'interazione con l'API di OpenAI:', error.response ? error.response.data : error);
    throw error;
  }
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
    console.error('Errore nell'invio del messaggio:', error.response ? error.response.data : error);
    throw error;
  }
}

module.exports = { handleInstagramObj };
