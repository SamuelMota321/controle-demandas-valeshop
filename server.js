import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Caminho da pasta dist (ajuste se o nome do projeto Angular mudar)
const distFolder = path.join(__dirname, 'dist', 'timesheet-valeshop', 'browser');

// Middleware para servir os arquivos estáticos
app.use(express.static(distFolder, {
  setHeaders: (res, filePath) => {
    // Cache control para arquivos estáticos
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Fallback: todas as rotas GET não correspondidas anteriormente redirecionam para index.html
// Corrigido '/*' para '*'
app.get('*', (req, res) => {
  res.sendFile(path.join(distFolder, 'index.html'));
});

// Porta padrão
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Angular app rodando em http://localhost:${PORT}`);
});
