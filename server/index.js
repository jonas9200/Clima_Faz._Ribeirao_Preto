import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.get("/", (req, res) => res.send("✅ API do IoT Dashboard está funcionando!"));

app.get("/api/series", async (req, res) => {
  try {
    const { equipamento = "EQ1" } = req.query;
    const query = `
      SELECT registro AS ts, temperatura, umidade, chuva
      FROM iot.registros
      WHERE equipamento = $1
      ORDER BY registro;
    `;
    const { rows } = await pool.query(query, [equipamento]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar dados" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
