import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamento, setEquipamento] = useState("Pluviometro_01");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [periodo, setPeriodo] = useState(""); // 👈 novo filtro rápido

  const baseUrl = import.meta.env.VITE_API_URL || "";

  // Função para calcular datas baseadas no período rápido
  function calcularPeriodoRapido(p) {
    const agora = new Date();
    const final = agora.toISOString().slice(0, 19);
    const inicio = new Date(agora);

    if (p === "24h") inicio.setHours(inicio.getHours() - 24);
    if (p === "7d") inicio.setDate(inicio.getDate() - 7);
    if (p === "30d") inicio.setDate(inicio.getDate() - 30);

    const inicioISO = inicio.toISOString().slice(0, 19);

    setDataInicial(inicioISO);
    setDataFinal(final);
    setPeriodo(p);

    carregar(inicioISO, final);
  }

  async function carregar(inicial = dataInicial, final = dataFinal) {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ equipamento });
      if (inicial) params.append("data_inicial", inicial);
      if (final) params.append("data_final", final);

      const url = `${baseUrl}/api/series?${params.toString()}`;
      console.log("📡 Requisitando:", url);

      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao buscar dados do servidor");
      const json = await resp.json();
      setDados(json);
    } catch (e) {
      setErro("Falha ao carregar dados. Verifique a API.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function limparFiltro() {
    setDataInicial("");
    setDataFinal("");
    setPeriodo("");
    carregar();
  }

  useEffect(() => {
    carregar();
  }, [equipamento]);

  const labels = dados.map((d) =>
    new Date(d.registro).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    })
  );
  const temperatura = dados.map((d) => d.temperatura);
  const umidade = dados.map((d) => d.umidade);
  const chuva = dados.map((d) => d.chuva);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>🌦️ IoT Dashboard</h1>

      {/* 🔧 FILTROS */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 15,
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <label>
          Equipamento:{" "}
          <input
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
          />
        </label>

        <label>
          Data inicial:{" "}
          <input
            type="datetime-local"
            value={dataInicial}
            onChange={(e) => setDataInicial(e.target.value)}
          />
        </label>

        <label>
          Data final:{" "}
          <input
            type="datetime-local"
            value={dataFinal}
            onChange={(e) => setDataFinal(e.target.value)}
          />
        </label>

        <button onClick={() => carregar()}>🔍 Filtrar</button>
        <button onClick={limparFiltro}>❌ Limpar</button>
      </div>

      {/* ⏱️ FILTROS RÁPIDOS */}
      <div style={{ marginBottom: 20 }}>
        <strong>Período rápido:</strong>{" "}
        <button
          onClick={() => calcularPeriodoRapido("24h")}
          style={{
            background: periodo === "24h" ? "#ccc" : "",
            marginLeft: 5,
          }}
        >
          Últimas 24h
        </button>
        <button
          onClick={() => calcularPeriodoRapido("7d")}
          style={{
            background: periodo === "7d" ? "#ccc" : "",
            marginLeft: 5,
          }}
        >
          Última semana
        </button>
        <button
          onClick={() => calcularPeriodoRapido("30d")}
          style={{
            background: periodo === "30d" ? "#ccc" : "",
            marginLeft: 5,
          }}
        >
          Último mês
        </button>
      </div>

      {loading && <p>Carregando dados...</p>}
      {erro && <p style={{ color: "red" }}>{erro}</p>}

      {!loading && !erro && dados.length === 0 && (
        <p>Nenhum dado encontrado para este filtro.</p>
      )}

      {/* 📊 GRÁFICOS */}
      {dados.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 40,
            }}
          >
            <div>
              <h3>Temperatura (°C)</h3>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Temperatura",
                      data: temperatura,
                      borderColor: "red",
                      tension: 0.2,
                    },
                  ],
                }}
              />
            </div>

            <div>
              <h3>Umidade (%)</h3>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Umidade",
                      data: umidade,
                      borderColor: "blue",
                      tension: 0.2,
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div>
            <h3>Chuva (mm)</h3>
            <Bar
              data={{
                labels,
                datasets: [
                  {
                    label: "Chuva",
                    data: chuva,
                    backgroundColor: "green",
                  },
                ],
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
