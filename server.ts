import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    mode: 'local-autonomous',
  });
});

// Download full project ZIP
app.get('/api/download-project-zip', (req: Request, res: Response) => {
  const zipPath = path.join(process.cwd(), 'public', 'proyecto-conversaciones-audio.zip');
  res.download(zipPath, 'proyecto-conversaciones-audio.zip', (err) => {
    if (err) {
      console.error('Error enviando archivo ZIP:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'No se pudo descargar el archivo ZIP.' });
      }
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'index.html'));
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Conversaciones de Audio activo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
