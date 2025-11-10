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
  const [periodo, setPeriodo] = useState("");
  const [totalChuva, setTotalChuva] = useState(0);
  const [mediaTemp, setMediaTemp] = useState(0);
  const [mediaUmid, setMediaUmid] = useState(0);

  const baseUrl = import.meta.env.VITE_API_URL || "";

  // 📆 Períodos rápidos (24h, 7d, 30d)
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

  // 🔄 Carrega dados da API
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

      const lista = json.dados || [];
      setDados(lista);
      setTotalChuva(json.total_chuva || 0);

      if (lista.length > 0) {
        const somaTemp = lista.reduce((a, d) => a + (Number(d.temperatura) || 0), 0);
        const somaUmid = lista.reduce((a, d) => a + (Number(d.umidade) || 0), 0);
        setMediaTemp(somaTemp / lista.length);
        setMediaUmid(somaUmid / lista.length);
      } else {
        setMediaTemp(0);
        setMediaUmid(0);
      }
    } catch (e) {
      setErro("Falha ao carregar dados. Verifique a API.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [equipamento]);

  const labels = dados.map((d) =>
    new Date(new Date(d.registro).getTime() + 3 * 60 * 60 * 1000).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    })
  );
  const temperatura = dados.map((d) => d.temperatura);
  const umidade = dados.map((d) => d.umidade);
  const chuva = dados.map((d) => d.chuva);

  return (
    <div style={{
      padding: 30,
      fontFamily: "'Inter', Arial, sans-serif",
      background: "#f4f6f8",
      color: "#222",
      minHeight: "100vh"
    }}>
      <header style={{
        textAlign: "center",
        marginBottom: 40,
        borderBottom: "2px solid #ddd",
        paddingBottom: 10
      }}>
        <h1 style={{ fontSize: 32, color: "#0077b6" }}>🌦️ AGS Clima Dashboard</h1>
        <p style={{ color: "#555" }}>Monitoramento de temperatura, umidade e chuva em tempo real</p>
      </header>

      {/* 🔧 FILTROS */}
      <section style={{
        background: "#fff",
        padding: 20,
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        marginBottom: 25
      }}>
        <h2 style={{ fontSize: 20, marginBottom: 15 }}>Filtros</h2>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 15,
          alignItems: "center",
        }}>
          <label>
            Equipamento:{" "}
            <input
              value={equipamento}
              onChange={(e) => setEquipamento(e.target.value)}
              style={{ padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
            />
          </label>

          <label>
            Data inicial:{" "}
            <input
              type="datetime-local"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              style={{ padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
            />
          </label>

          <label>
            Data final:{" "}
            <input
              type="datetime-local"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              style={{ padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
            />
          </label>

          <button
            onClick={() => carregar()}
            style={{
              padding: "8px 16px",
              background: "#0077b6",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            🔍 Filtrar
          </button>

          <button
            onClick={() => {
              setDataInicial("");
              setDataFinal("");
              setPeriodo("");
              carregar();
            }}
            style={{
              padding: "8px 16px",
              background: "#e63946",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            ❌ Limpar
          </button>
        </div>

        {/* ⏱️ FILTROS RÁPIDOS */}
        <div style={{ marginTop: 15 }}>
          <strong>Período rápido:</strong>{" "}
          {[
            { id: "24h", label: "Últimas 24h" },
            { id: "7d", label: "Última semana" },
            { id: "30d", label: "Último mês" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => calcularPeriodoRapido(p.id)}
              style={{
                marginLeft: 8,
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: periodo === p.id ? "#0077b6" : "#eee",
                color: periodo === p.id ? "#fff" : "#222",
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {loading && <p>Carregando dados...</p>}
      {erro && <p style={{ color: "red" }}>{erro}</p>}
      {!loading && !erro && dados.length === 0 && (
        <p>Nenhum dado encontrado para este filtro.</p>
      )}

      {/* 📈 RESUMO GERAL */}
      {!loading && !erro && dados.length > 0 && (
        <section style={{
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          marginBottom: 30,
          textAlign: "center",
        }}>
          <h2 style={{ color: "#0077b6" }}>📊 Resumo do Período</h2>
          <p style={{ fontSize: 18 }}>
            <strong>Total de chuva:</strong> {totalChuva.toFixed(2)} mm |{" "}
            <strong>Temperatura média:</strong> {mediaTemp.toFixed(1)} °C |{" "}
            <strong>Umidade média:</strong> {mediaUmid.toFixed(1)} %
          </p>
        </section>
      )}

      {/* 📊 GRÁFICOS */}
      {dados.length > 0 && (
        <>
          <section style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginBottom: 30,
          }}>
            <div style={{
              background: "#fff",
              padding: 15,
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}>
              <h3 style={{ color: "#d62828" }}>🌡️ Temperatura (°C)</h3>
              <Line data={{
                labels,
                datasets: [{ label: "Temperatura", data: temperatura, borderColor: "#d62828", tension: 0.3 }],
              }} />
            </div>

            <div style={{
              background: "#fff",
              padding: 15,
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}>
              <h3 style={{ color: "#457b9d" }}>💧 Umidade (%)</h3>
              <Line data={{
                labels,
                datasets: [{ label: "Umidade", data: umidade, borderColor: "#457b9d", tension: 0.3 }],
              }} />
            </div>
          </section>

          <section style={{
            background: "#fff",
            padding: 15,
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}>
            <h3 style={{ color: "#2a9d8f" }}>🌧️ Chuva (mm)</h3>
            <p><strong>Total acumulado:</strong> {totalChuva.toFixed(2)} mm</p>
            <Bar data={{
              labels,
              datasets: [{ label: "Chuva (mm)", data: chuva, backgroundColor: "#2a9d8f" }],
            }} />
          </section>
        </>
      )}
    </div>
  );
}
