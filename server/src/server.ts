import express from 'express';
import cors from 'cors';
import routes from './routes/routes';
import envService from './services/env.service';
import { errorHandler } from './middlewares/error.middleware';

const app = express();
const PORT = envService.getEnv('PORT') || '3000';

const rawOrigins = envService.getEnv('ALLOWED_ORIGINS') || envService.getEnv('FRONTEND_URL');
const allowedOrigins = new Set(rawOrigins ? rawOrigins.split(',').map(origin => origin.trim()) : []);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

app.use('/api', routes);

app.get('/', (_, res) => {
  res.json({ message: 'The Mirror API' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] running on port ${PORT}`);
});

