const express = require('express');
const session = require('express-session');

const app = express();

// Session configuration (same as main app)
app.use(session({
  secret: process.env.SESSION_SECRET || 'archivart_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to false for testing
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  name: 'archivart.sid'
}));

// Debug endpoint
app.get('/debug-session', (req, res) => {
  console.log('Session debug request:');
  console.log('  req.session:', req.session);
  console.log('  req.sessionID:', req.sessionID);
  console.log('  req.session.user:', req.session.user);
  console.log('  req.session.userId:', req.session.userId);
  
  res.json({
    session: req.session,
    sessionID: req.sessionID,
    user: req.session.user,
    userId: req.session.userId
  });
});

// Set session endpoint
app.post('/set-session', (req, res) => {
  req.session.user = {
    id: 1,
    email: 'admin@archivart.com',
    role: 'admin'
  };
  req.session.userId = 1;
  
  console.log('Session set:', req.session);
  res.json({ success: true, session: req.session });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Test endpoints:`);
  console.log(`  GET http://localhost:${PORT}/debug-session`);
  console.log(`  POST http://localhost:${PORT}/set-session`);
});
