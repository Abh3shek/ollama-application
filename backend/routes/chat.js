const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const prisma = new PrismaClient();

// Create new chat
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    const chat = await prisma.chat.create({
      data: {
        title: title || `Chat ${new Date().toLocaleString()}`,
      },
    });
    res.json(chat);
  } catch (err) {
    console.error('Error creating chat:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all chats
router.get('/', async (req, res) => {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(chats);
  } catch (err) {
    console.error('Error fetching chats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat messages
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { timestamp: 'asc' }, // Use timestamp from schema
    });
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete chat and its messages
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete all messages in the chat first
    await prisma.message.deleteMany({
      where: { chatId: id }
    });
    
    // Then delete the chat
    await prisma.chat.delete({
      where: { id }
    });
    
    res.status(204).end(); // No content
  } catch (err) {
    console.error('Error deleting chat:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Post message to chat
router.post('/:chatId/message', async (req, res) => {
  const { chatId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Verify chat exists
    const chatExists = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chatExists) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Save user message
    await prisma.message.create({
      data: {
        chatId,
        role: 'user',
        content: message,
        // timestamp is automatically set by Prisma
      },
    });

    const fetch = await (async () => {
      if (typeof globalThis.fetch === 'function') return globalThis.fetch;
      return (await import('node-fetch')).default;
    })();
    
    // Send to Ollama
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma',
        prompt: message,
        stream: true,
      }),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Ensure headers are sent immediately

    let botMessage = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const processStream = async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(Boolean);
          
          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                botMessage += json.response;
                res.write(`data: ${JSON.stringify({ token: json.response })}\n\n`);
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }

        // Save assistant message
        await prisma.message.create({
          data: {
            chatId,
            role: 'assistant',
            content: botMessage,
          },
        });

        res.end();
      } catch (err) {
        console.error('Stream processing error:', err);
        res.status(500).end();
      }
    };

    processStream();
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;