import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// Cria pool de conexões com o banco PostgreSQL Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Testa a conexão ao iniciar
pool
  .connect()
  .then(() => console.log("✅ Conectado ao banco PostgreSQL Neon!"))
  .catch((err) => console.error("❌ Erro ao conectar ao banco:", err));

// Endpoint para verificar se o servidor está online
app.get("/", (req, res) => {
  res.send("🚀 API do IoT Dashboard está funcionando!");
});

// Endpoint principal: retorna dados do equipamento
app.get("/api/series", async (req, res) => {
  const equipamento = req.query.equipamento;

  if (!equipamento)
    return res.status(400).json({ erro: "Informe o parâmetro ?equipamento=" });

  try {
    const query = `
      SELECT 
        id,
        registro,
        equipamento,
        chuva,
        temperatura,
        umidade,
        criado_em
      FROM iot.registros
      WHERE equipamento = $1
      ORDER BY registro ASC;
    `;

    const { rows } = await pool.query(query, [equipamento]);
    res.json(rows);
  } catch (err) {
    console.error("❌ Erro na consulta:", err);
    res.status(500).json({ erro: "Erro ao consultar o banco de dados" });
  }
});

// Inicializa o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
