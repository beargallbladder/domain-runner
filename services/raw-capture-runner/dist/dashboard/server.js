"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const monitoring_1 = require("../services/monitoring");
const database_1 = require("../config/database");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const monitoring = monitoring_1.MonitoringService.getInstance();
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// API endpoints for metrics
app.get('/api/stats', async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '24h';
        const stats = await monitoring.getStats(timeframe);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
// Get recent alerts
app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await (0, database_1.query)(`
      SELECT details
      FROM processing_logs
      WHERE event_type = 'alert'
      ORDER BY created_at DESC
      LIMIT 100
    `);
        res.json(alerts.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});
// Get recent errors
app.get('/api/errors', async (req, res) => {
    try {
        const errors = await (0, database_1.query)(`
      SELECT details
      FROM processing_logs
      WHERE event_type = 'error'
      ORDER BY created_at DESC
      LIMIT 50
    `);
        res.json(errors.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch errors' });
    }
});
// Serve the dashboard HTML
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'index.html'));
});
// Start server
app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
});
