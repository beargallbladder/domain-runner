import * as dotenv from 'dotenv';
import express from 'express';
import { Pool } from 'pg';

dotenv.config();

console.log('🚀 SIMPLE MODULAR PROCESSOR v1.0.0');
const app = express();
const port = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'simple-modular-processor' });
});

app.listen(port, () => {
  console.log(`🌐 Running on port ${port}`);
});
