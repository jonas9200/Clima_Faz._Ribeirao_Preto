import express from "express";
import pkg from "pg";
import cors from "cors";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// ⚙️ Configuração da conexão com o banco Neon (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Rota de teste (útil pra Render mostrar que o servidor está vivo)
app.get("/api", (req, res) => {
  res.send("🚀 API do IoT Dashboard está funcionando!");
});

// ✅ Rota principal — lê dados da tabela iot.registros
app.get("/api/series", async (req, res) => {
  try {
    const { equipamento, data_inicial, data_final } = req.query;

    if (!equipamento) {
      return res.status(400).json({ erro: "Informe o parâmetro equipamento" });
    }

    let query = `
      SELECT registro, equipamento, chuva, temperatura, umidade
      FROM iot.registros
      WHERE equipamento = $1
    `;
    const params = [equipamento];
    let paramIndex = 2;

    // 🕒 Filtros de data/hora
    if (data_inicial) {
      query += ` AND registro >= $${paramIndex++}`;
      params.push(new Date(data_inicial));
    }
    if (data_final) {
      query += ` AND registro <= $${paramIndex++}`;
      params.push(new Date(data_final));
    }

    query += " ORDER BY registro ASC";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao consultar dados:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

// Inicializa o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
