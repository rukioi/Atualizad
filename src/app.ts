import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import clientsRoutes from './routes/clients';
import projectsRoutes from './routes/projects';
import tasksRoutes from './routes/tasks';
import transactionsRoutes from './routes/transactions';
import invoicesRoutes from './routes/invoices';
import settingsRoutes from './routes/settings';
import adminRoutes from './routes/admin';
import adminAuthRoutes from './routes/adminAuth';
import notificationsRoutes from './routes/notifications';
import publicationsRoutes from './routes/publications';

export function createApp() {
  const app = express();

  // Basic middleware
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/invoices', invoicesRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/auth', adminAuthRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/publications', publicationsRoutes);

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const spaPath = path.join(__dirname, '../spa');
    app.use(express.static(spaPath));
    
    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(spaPath, 'index.html'));
    });
  }

  // Error handler
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}