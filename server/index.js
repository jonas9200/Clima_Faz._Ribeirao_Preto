import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Conexão ao banco Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🔹 Rota principal (teste)
app.get("/", (req, res) => {
  res.send("API do IoT Dashboard está funcionando!");
});

// 🔹 🔸 Rota que o frontend precisa
app.get("/api/series", async (req, res) => {
  try {
    const { equipamento } = req.query;
    if (!equipamento)
      return res.status(400).json({ error: "Parâmetro 'equipamento' é obrigatório" });

    const query = `
      SELECT registro, chuva, temperatura, umidade 
      FROM iot.registros 
      WHERE equipamento = $1
      ORDER BY registro ASC
      LIMIT 200
    `;

    const result = await pool.query(query, [equipamento]);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao consultar banco:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
