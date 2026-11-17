const express = require('express');
const next = require('next');
const cors = require('cors');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

const port = process.env.PORT || 3000;

nextApp.prepare().then(() => {
  const server = express();

  // Allow Flutter apps and browsers to connect
  server.use(cors());

  // Allow Express to read JSON data sent by the Flutter app
  server.use(express.json());

  // --- BACKEND API ROUTES FOR FLUTTER ---
  
  // Test Route
  server.get('/api/hello', (req, res) => {
    return res.json({ 
      status: "success",
      message: "Hello from the Express backend!" 
    });
  });

  // Example Login Route for Flutter
  server.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Simple mock check
    if (username === "admin" && password === "1234") {
      return res.json({ success: true, token: "mock-jwt-token-xyz" });
    }
    
    return res.status(401).json({ success: false, message: "Wrong credentials" });
  });

  // --- FRONTEND NEXT.JS HANDLER ---
  // Everything else gets sent to the Next.js frontend website
  server.all('*', (req, res) => {
    return nextHandler(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Server ready on http://localhost:${port}`);
  });
});
