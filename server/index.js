import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;

// ⚙️ Conexão com o banco (Render, Neon, Supabase, etc.)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🚀 Rota principal de teste
app.get("/", (req, res) => {
  res.send("🚀 API do IoT Dashboard está funcionando!");
});

// 📈 API: retorna dados agregados por hora
app.get("/api/series", async (req, res) => {
  try {
    const { equipamento, data_inicial, data_final } = req.query;

    if (!equipamento)
      return res.status(400).json({ erro: "O parâmetro 'equipamento' é obrigatório." });

    const params = [equipamento];
    let where = `WHERE equipamento = $1`;

    if (data_inicial) {
      params.push(data_inicial);
      where += ` AND registro >= $${params.length}`;
    }

    if (data_final) {
      params.push(data_final);
      where += ` AND registro <= $${params.length}`;
    }

    // 🔢 Query principal: agrega por hora
    const query = `
      SELECT
        DATE_TRUNC('hour', registro) AS hora,
        AVG(temperatura) AS temperatura_media,
        AVG(umidade) AS umidade_media,
        SUM(chuva) AS chuva_total
      FROM series
      ${where}
      GROUP BY hora
      ORDER BY hora ASC;
    `;

    const { rows } = await pool.query(query, params);

    // 🌧️ Soma total de chuva no período
    const totalQuery = `
      SELECT SUM(chuva) AS total_chuva
      FROM series
      ${where};
    `;
    const totalResult = await pool.query(totalQuery, params);
    const totalChuva = totalResult.rows[0]?.total_chuva || 0;

    res.json({
      equipamento,
      total_chuva: totalChuva,
      dados: rows.map((r) => ({
        hora: r.hora,
        temperatura: Number(r.temperatura_media),
        umidade: Number(r.umidade_media),
        chuva: Number(r.chuva_total),
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar séries:", error);
    res.status(500).json({ erro: "Erro ao buscar dados do banco." });
  }
});

// 🔥 Porta Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ API rodando na porta ${PORT}`));
