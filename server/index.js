import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
app.use(cors());
app.use(express.json());

// Conexão ao banco Neon
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get("/", (req, res) => {
  res.send("🚀 API do IoT Dashboard está funcionando!");
});

// ✅ Rota principal de dados - SEM CONVERSÃO DE TIMEZONE
app.get("/api/series", async (req, res) => {
  const { equipamento, data_inicial, data_final } = req.query;

  try {
    let query = `
      SELECT registro, equipamento, chuva, temperatura, umidade
      FROM iot.registros
      WHERE 1=1
    `;
    const params = [];

    if (equipamento) {
      params.push(equipamento);
      query += ` AND equipamento = $${params.length}`;
    }

    // ✅ USA AS DATAS EXATAS DO BANCO - SEM CONVERSÃO
    if (data_inicial) {
      params.push(data_inicial);
      query += ` AND registro >= $${params.length}`;
    }

    if (data_final) {
      params.push(data_final);
      query += ` AND registro <= $${params.length}`;
    }

    query += " ORDER BY registro ASC";

    console.log("📡 Query executada:", query);
    console.log("📊 Parâmetros:", params);

    const { rows } = await pool.query(query, params);

    // ✅ Soma total da chuva (null -> 0)
    const somaChuva = rows.reduce(
      (acc, row) => acc + (Number(row.chuva) || 0),
      0
    );

    console.log("✅ Dados retornados:", rows.length, "registros");
    if (rows.length > 0) {
      console.log("📅 Primeiro registro:", rows[0].registro);
      console.log("📅 Último registro:", rows[rows.length - 1].registro);
    }

    res.json({
      total_chuva: somaChuva,
      dados: rows
    });
  } catch (err) {
    console.error("Erro ao consultar o banco:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🌐 Servidor rodando na porta ${PORT}`));
