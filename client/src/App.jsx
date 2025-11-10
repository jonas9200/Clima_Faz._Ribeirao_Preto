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

  const baseUrl = import.meta.env.VITE_API_URL || "";

  // 📆 Filtros rápidos
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

  // 🔄 Carregar da API
  async function carregar(inicial = dataInicial, final = dataFinal) {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ equipamento });
      if (inicial) params.append("data_inicial", inicial);
      if (final) params.append("data_final", final);

      const url = `${baseUrl}/api/series?${params.toString()}`;
      console.log("📡 Buscando dados:", url);

      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao buscar dados");
      const json = await resp.json();

      const lista = json.dados || [];
      setDados(lista);
      setTotalChuva(json.total_chuva || 0);
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

  // 🧮 Agrupar por hora
  function agruparPorHora(lista) {
    const mapa = {};

    lista.forEach((d) => {
      const data = new Date(d.registro);
      // Normaliza para "AAAA-MM-DD HH:00"
      const horaStr = data.toISOString().slice(0, 13) + ":00";

      if (!mapa[horaStr]) {
        mapa[horaStr] = {
          count: 0,
          somaTemp: 0,
          somaUmid: 0,
          somaChuva: 0,
        };
      }

      mapa[horaStr].count++;
      mapa[horaStr].somaTemp += Number(d.temperatura) || 0;
      mapa[horaStr].somaUmid += Number(d.umidade) || 0;
      mapa[horaStr].somaChuva += Number(d.chuva) || 0;
    });

    // Converte para lista ordenada
    const horas = Object.keys(mapa).sort();
    return horas.map((h) => ({
      hora: h,
      temperatura: mapa[h].somaTemp / mapa[h].count,
      umidade: mapa[h].somaUmid / mapa[h].count,
      chuva: mapa[h].somaChuva,
    }));
  }

  const agrupados = agruparPorHora(dados);

  const labels = agrupados.map((d) =>
    new Date(d.hora).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    })
  );
  const temperatura = agrupados.map((d) => d.temperatura);
  const umidade = agrupados.map((d) => d.umidade);
  const chuva = agrupados.map((d) => d.chuva);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>🌦️ AGS Clima</h1>

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

      {!loading && !erro && agrupados.length === 0 && (
        <p>Nenhum dado encontrado para este filtro.</p>
      )}

      {/* 📊 RESUMO GERAL */}
      {!loading && !erro && agrupados.length > 0 && (
        <div
          style={{
            background: "#f2f2f2",
            padding: 15,
            borderRadius: 8,
            marginBottom: 25,
          }}
        >
          <h3>📊 Resumo do Período</h3>
          <p>
            <strong>Total de chuva:</strong> {totalChuva.toFixed(2)} mm
          </p>
        </div>
      )}

      {/* 📈 GRÁFICOS */}
      {agrupados.length > 0 && (
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
                      label: "Temperatura (°C)",
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
                      label: "Umidade (%)",
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
            <h3>Chuva acumulada por hora (mm)</h3>
            <p>
              <strong>Total acumulado:</strong> {totalChuva.toFixed(2)} mm
            </p>
            <Bar
              data={{
                labels,
                datasets: [
                  {
                    label: "Chuva por hora (mm)",
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
