// Simple Express-like API handler for the romantic adventure
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Import database functions (we'll create a simplified version)
const { trackStorySession, recordChoice, saveRewardDownload, getSessionStats } = require('./db-operations');

// MIME types for serving static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain'
};

// Simple router
class SimpleRouter {
  constructor() {
    this.routes = {
      'GET': {},
      'POST': {}
    };
  }

  get(path, handler) {
    this.routes.GET[path] = handler;
  }

  post(path, handler) {
    this.routes.POST[path] = handler;
  }

  async handle(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Serve static files
    if (method === 'GET' && !pathname.startsWith('/api/')) {
      return this.serveStaticFile(pathname, res);
    }

    // Handle API routes
    const handler = this.routes[method][pathname];
    if (handler) {
      try {
        let body = '';
        if (method === 'POST') {
          req.on('data', chunk => body += chunk);
          req.on('end', async () => {
            try {
              const data = body ? JSON.parse(body) : {};
              await handler(req, res, data, parsedUrl.query);
            } catch (error) {
              this.sendError(res, 400, 'Invalid JSON');
            }
          });
        } else {
          await handler(req, res, {}, parsedUrl.query);
        }
      } catch (error) {
        console.error('Route handler error:', error);
        this.sendError(res, 500, 'Internal server error');
      }
    } else {
      this.sendError(res, 404, 'Not found');
    }
  }

  serveStaticFile(pathname, res) {
    // Default to index.html for root path
    if (pathname === '/') pathname = '/index.html';

    const filePath = path.join(process.cwd(), pathname.slice(1));
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          this.sendError(res, 404, 'File not found');
        } else {
          this.sendError(res, 500, 'Server error');
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  }

  sendJSON(res, data, status = 200) {
    res.writeHead(status, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
  }

  sendError(res, status, message) {
    res.writeHead(status, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: message }));
  }
}

// Create router and define routes
const router = new SimpleRouter();

// API Routes for the romantic adventure
router.post('/api/session', async (req, res, data) => {
  try {
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const session = await trackStorySession({
      sessionId,
      playerName: data.playerName || 'Avantee',
      startedAt: new Date()
    });

    router.sendJSON(res, { 
      success: true, 
      sessionId: sessionId,
      message: 'Story session started successfully'
    });
  } catch (error) {
    console.error('Error starting story session:', error);
    router.sendJSON(res, { success: false, error: 'Failed to start session' }, 500);
  }
});

router.post('/api/story/choice', async (req, res, data) => {
  try {
    const choice = await recordChoice({
      sessionId: data.sessionId,
      sceneId: data.sceneId,
      choiceText: data.choiceText,
      nextSceneId: data.nextSceneId,
      choiceOrder: data.choiceOrder || 1
    });

    router.sendJSON(res, { 
      success: true, 
      message: 'Choice recorded successfully'
    });
  } catch (error) {
    console.error('Error recording choice:', error);
    router.sendJSON(res, { success: false, error: 'Failed to record choice' }, 500);
  }
});

router.post('/api/story/complete', async (req, res, data) => {
  try {
    // Update session as completed
    // This would normally use the database storage
    router.sendJSON(res, { 
      success: true, 
      message: 'Story completed successfully'
    });
  } catch (error) {
    console.error('Error completing story:', error);
    router.sendJSON(res, { success: false, error: 'Failed to complete story' }, 500);
  }
});

router.post('/api/rewards/download', async (req, res, data) => {
  try {
    const download = await saveRewardDownload({
      sessionId: data.sessionId,
      rewardId: data.rewardId,
      rewardTitle: data.rewardTitle
    });

    router.sendJSON(res, { 
      success: true, 
      message: 'Reward download tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking reward download:', error);
    router.sendJSON(res, { success: false, error: 'Failed to track download' }, 500);
  }
});

router.get('/api/story/stats', async (req, res, data, query) => {
  try {
    const stats = await getSessionStats(query.sessionId);
    router.sendJSON(res, { 
      success: true, 
      stats: stats || { totalSessions: 0, completedSessions: 0 }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    router.sendJSON(res, { success: false, error: 'Failed to get stats' }, 500);
  }
});

// Handle preflight requests
router.get('/api/*', async (req, res) => {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end('OK');
});

// Create and start server
const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  router.handle(req, res);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Avantee's Romantic Adventure Server running on port ${PORT}`);
});

module.exports = { server, router };