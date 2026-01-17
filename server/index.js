import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Configuração de CORS mais permissiva para o Render
app.use(cors({
  origin: '*', // Em produção, especifique o domínio do seu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Usar variável de ambiente
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    rejectUnauthorized: false 
  }
});

// Teste de conexão
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err.stack);
  } else {
    console.log('✅ Conectado ao banco de dados');
    release();
  }
});

// Rota raiz para verificar se o servidor está rodando
app.get("/", (req, res) => {
  res.json({ 
    status: "online", 
    message: "API Clima Fazenda Ribeirão Preto",
    timestamp: new Date().toISOString()
  });
});

// CORREÇÃO: Remover /api das rotas OU adicionar /api no cliente
app.get("/equipamentos", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT equipamento 
       FROM iot.registros 
       WHERE equipamento IS NOT NULL 
       ORDER BY equipamento`
    );
    res.json({ equipamentos: rows.map(r => r.equipamento) });
  } catch (err) {
    console.error("Erro ao buscar equipamentos:", err);
    res.status(500).json({ erro: "Erro ao buscar equipamentos", detalhes: err.message });
  }
});

app.get("/series", async (req, res) => {
  const { equipamento, data_inicial, data_final } = req.query;
  
  try {
    let query = `
      SELECT 
        registro AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo' as registro,
        equipamento, 
        chuva, 
        temperatura, 
        umidade 
      FROM iot.registros 
      WHERE 1=1
    `;
    const params = [];
    
    if (equipamento) { 
      params.push(equipamento); 
      query += ` AND equipamento = ${params.length}`; 
    }
    if (data_inicial) { 
      params.push(data_inicial); 
      query += ` AND registro >= ${params.length}`; 
    }
    if (data_final) { 
      params.push(data_final); 
      query += ` AND registro <= ${params.length}`; 
    }
    
    query += " ORDER BY registro ASC";
    
    const { rows } = await pool.query(query, params);
    res.json({ dados: rows });
  } catch (err) {
    console.error("Erro ao buscar séries:", err);
    res.status(500).json({ erro: "Erro ao buscar séries", detalhes: err.message });
  }
});

// Health check para o Render
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});
