import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🧠 API principal — médias e soma por hora
app.get("/api/series", async (req, res) => {
  const { equipamento, data_inicial, data_final } = req.query;
  if (!equipamento)
    return res.status(400).json({ erro: "Parâmetro 'equipamento' obrigatório" });

  try {
    // monta filtro de datas
    let filtro = "";
    const params = [equipamento];

    if (data_inicial) {
      params.push(data_inicial);
      filtro += ` AND registro >= $${params.length}`;
    }

    if (data_final) {
      params.push(data_final);
      filtro += ` AND registro <= $${params.length}`;
    }

    // busca médias por hora e total de chuva
    const sql = `
      WITH dados_hora AS (
        SELECT
          date_trunc('hour', registro) AS hora,
          AVG(temperatura) AS temperatura,
          AVG(umidade) AS umidade,
          SUM(chuva) AS chuva
        FROM iot.registros
        WHERE equipamento = $1
        ${filtro}
        GROUP BY hora
        ORDER BY hora
      )
      SELECT * FROM dados_hora
    `;

    const { rows } = await pool.query(sql, params);

    // calcula total de chuva
    const total = rows.reduce((acc, r) => acc + (r.chuva || 0), 0);

    res.json({ dados: rows, total_chuva: total });
  } catch (err) {
    console.error("Erro SQL:", err);
    res.status(500).json({ erro: "Erro ao buscar dados", detalhes: err.message });
  }
});

app.get("/", (req, res) => res.send("🚀 API do IoT Dashboard está funcionando!"));

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`✅ Servidor rodando na porta ${port}`));
