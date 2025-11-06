import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com o Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // obrigatório no Neon
});

// Rota básica (teste)
app.get('/', (req, res) => {
  res.send('API do Dashboard IoT funcionando ✅');
});

// Endpoint para buscar dados
app.get('/api/series', async (req, res) => {
  const { equipamento = 'EQ1', from, to, aggregate = 'minute' } = req.query;
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    let query;
    if (aggregate === 'minute') {
      query = `
        SELECT date_trunc('minute', registro) AS ts,
               avg(temperatura) AS temperatura,
               avg(umidade) AS umidade,
               sum(chuva) AS chuva
        FROM iot.registros
        WHERE equipamento = $1
          AND registro BETWEEN $2 AND $3
        GROUP BY ts
        ORDER BY ts;
      `;
    } else {
      query = `
        SELECT registro AS ts, temperatura, umidade, chuva
        FROM iot.registros
        WHERE equipamento = $1
          AND registro BETWEEN $2 AND $3
        ORDER BY registro;
      `;
    }

    const { rows } = await pool.query(query, [equipamento, fromDate, toDate]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));
