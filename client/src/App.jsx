import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(express.json());

// 🧩 Conexão com o banco Neon (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Teste rápido da API
app.get("/api", (req, res) => {
  res.send("🚀 API do IoT Dashboard está funcionando!");
});

// ✅ Rota principal: retorna séries de dados do equipamento
app.get("/api/series", async (req, res) => {
  try {
    const { equipamento, data_inicial, data_final } = req.query;

    if (!equipamento) {
      return res.status(400).json({ erro: "Informe o parâmetro 'equipamento'" });
    }

    // Monta query base
    let query = `
      SELECT registro, equipamento, chuva, temperatura, umidade
      FROM iot.registros
      WHERE equipamento = $1
    `;
    const params = [equipamento];
    let paramIndex = 2;

    // 🕒 Aplica filtros de data/hora, se fornecidos
    if (data_inicial) {
      query += ` AND registro >= $${paramIndex++}`;
      params.push(new Date(data_inicial));
    }
    if (data_final) {
      query += ` AND registro <= $${paramIndex++}`;
      params.push(new Date(data_final));
    }

    query += " ORDER BY registro ASC";

    // Executa a consulta
    const { rows } = await pool.query(query, params);

    // 🔄 Mapeia e formata data/hora corretamente
    const mapped = rows.map((r) => {
      const dt = new Date(r.registro);

      // Formato ISO UTC
      const registro_iso = dt.toISOString();

      // Formato local (Brasil)
      const registro_local = dt.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour12: false,
      });

      return {
        registro_iso,
        registro_local,
        equipamento: r.equipamento,
        temperatura: parseFloat(r.temperatura),
        umidade: parseFloat(r.umidade),
        chuva: parseFloat(r.chuva),
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error("❌ Erro ao consultar dados:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

// 🔊 Rota padrão
app.get("/", (req, res) => {
  res.send("🌦️ Servidor do IoT Dashboard está online!");
});

// 🚀 Inicializa servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
