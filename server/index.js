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

// ✅ Rota principal de dados - MODIFICADA para melhor suporte a timezones
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

    // MODIFICAÇÃO: Usar CAST com TIME ZONE para lidar melhor com UTC
    if (data_inicial) {
      params.push(data_inicial);
      query += ` AND registro >= $${params.length}::timestamptz`;
    }

    if (data_final) {
      params.push(data_final);
      query += ` AND registro <= $${params.length}::timestamptz`;
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

// ✅ NOVA ROTA para filtros rápidos com timezone local
app.get("/api/series/periodo-rapido", async (req, res) => {
  const { equipamento, periodo } = req.query;

  try {
    if (!periodo) {
      return res.status(400).json({ erro: "Parâmetro 'periodo' é obrigatório" });
    }

    let intervalo = "";
    const params = [];
    let paramCount = 0;

    // Calcular datas baseado no período
    const agora = new Date();
    const dataFinal = new Date(agora);
    const dataInicial = new Date(agora);

    switch (periodo) {
      case "24h":
        dataInicial.setHours(dataInicial.getHours() - 24);
        break;
      case "7d":
        dataInicial.setDate(dataInicial.getDate() - 7);
        break;
      case "30d":
        dataInicial.setDate(dataInicial.getDate() - 30);
        break;
      default:
        return res.status(400).json({ erro: "Período inválido. Use: 24h, 7d ou 30d" });
    }

    // Converter para UTC para o banco
    const dataInicialUTC = dataInicial.toISOString().slice(0, 19);
    const dataFinalUTC = dataFinal.toISOString().slice(0, 19);

    console.log("🕒 Período rápido:", periodo);
    console.log("📅 Data inicial (UTC):", dataInicialUTC);
    console.log("📅 Data final (UTC):", dataFinalUTC);

    let query = `
      SELECT registro, equipamento, chuva, temperatura, umidade
      FROM iot.registros
      WHERE registro >= $1::timestamptz AND registro <= $2::timestamptz
    `;
    
    params.push(dataInicialUTC, dataFinalUTC);
    paramCount = 2;

    if (equipamento) {
      paramCount++;
      params.push(equipamento);
      query += ` AND equipamento = $${paramCount}`;
    }

    query += " ORDER BY registro ASC";

    console.log("📡 Query período rápido:", query);
    console.log("📊 Parâmetros:", params);

    const { rows } = await pool.query(query, params);

    // ✅ Soma total da chuva
    const somaChuva = rows.reduce(
      (acc, row) => acc + (Number(row.chuva) || 0),
      0
    );

    console.log("✅ Dados retornados (período rápido):", rows.length, "registros");

    res.json({
      total_chuva: somaChuva,
      dados: rows,
      periodo: periodo,
      data_inicial: dataInicialUTC,
      data_final: dataFinalUTC
    });
  } catch (err) {
    console.error("Erro ao consultar o banco (período rápido):", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🌐 Servidor rodando na porta ${PORT}`));
