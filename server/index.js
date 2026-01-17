import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
app.use(cors());
app.use(express.json());

// CREDENCIAIS DIRETAS DO BANCO NEON (AWS)
const pool = new pg.Pool({
  connectionString: "postgres://neondb_owner:npg_NPmbI0B1wial@ep-odd-star-acu2n0xu-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require",
  ssl: { 
    rejectUnauthorized: false 
  }
});

app.get("/api/equipamentos", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT DISTINCT equipamento FROM iot.registros WHERE equipamento IS NOT NULL ORDER BY equipamento`);
    res.json({ equipamentos: rows.map(r => r.equipamento) });
  } catch (err) {
    res.status(500).json({ erro: "Erro no banco" });
  }
});

app.get("/api/series", async (req, res) => {
  const { equipamento, data_inicial, data_final } = req.query;
  try {
    let query = `SELECT registro, equipamento, chuva, temperatura, umidade FROM iot.registros WHERE 1=1`;
    const params = [];
    if (equipamento) { params.push(equipamento); query += ` AND equipamento = $${params.length}`; }
    if (data_inicial) { params.push(data_inicial); query += ` AND registro >= $${params.length}`; }
    if (data_final) { params.push(data_final); query += ` AND registro <= $${params.length}`; }
    query += " ORDER BY registro ASC";
    const { rows } = await pool.query(query, params);
    res.json({ dados: rows });
  } catch (err) {
    res.status(500).json({ erro: "Erro no banco" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🌐 Servidor rodando na porta ${PORT}`));
