// utils/cleanResponse.js

function cleanResponseText(text) {
    if (!text) return '';
  
    // Rimuove le formattazioni Markdown
    let cleanedText = text
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
      .replace(/(\*|_)(.*?)\1/g, '$2') // Italic
      .replace(/~~(.*?)~~/g, '$1') // Strikethrough
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/#+\s?(.*)/g, '$1') // Headers
      .replace(/>\s?(.*)/g, '$1') // Blockquotes
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
      .replace(/!\[(.*?)\]\(.*?\)/g, '') // Images
      .replace(/[-_*]{3,}/g, '') // Horizontal rules
      .replace(/^\s*[\r\n]/gm, '') // Empty lines
      .replace(/^\s*\n/gm, ''); // Leading newlines
  
    // Rimuove le annotazioni tra 【 e 】
    cleanedText = cleanedText.replace(/【[^】]*】/g, '');
  
    // Rimuove spazi extra
    cleanedText = cleanedText.trim();
  
    return cleanedText;
  }
  
  module.exports = { cleanResponseText };
  