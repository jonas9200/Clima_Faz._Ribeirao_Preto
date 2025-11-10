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
    <div style={styles.container}>
      {/* 🎯 HEADER */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.titleSection}>
            <h1 style={styles.title}>🌦️ AGS Clima</h1>
            <p style={styles.subtitle}>Monitoramento Meteorológico em Tempo Real</p>
          </div>
          {!loading && !erro && agrupados.length > 0 && (
            <div style={styles.weatherCard}>
              <div style={styles.weatherItem}>
                <span style={styles.weatherLabel}>Total de Chuva</span>
                <span style={styles.weatherValue}>{totalChuva.toFixed(2)} mm</span>
              </div>
              <div style={styles.weatherItem}>
                <span style={styles.weatherLabel}>Período</span>
                <span style={styles.weatherValue}>{agrupados.length}h</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 🎛️ PAINEL DE CONTROLE */}
      <section style={styles.controlPanel}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🔧 Filtros e Configurações</h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Equipamento</label>
              <input
                style={styles.input}
                value={equipamento}
                onChange={(e) => setEquipamento(e.target.value)}
                placeholder="Nome do equipamento"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Data Inicial</label>
              <input
                type="datetime-local"
                style={styles.input}
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Data Final</label>
              <input
                type="datetime-local"
                style={styles.input}
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button style={styles.primaryButton} onClick={() => carregar()}>
              🔍 Aplicar Filtros
            </button>
            <button style={styles.secondaryButton} onClick={limparFiltro}>
              🗑️ Limpar Filtros
            </button>
          </div>
        </div>

        {/* ⏱️ FILTROS RÁPIDOS */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>⏱️ Período Rápido</h3>
          <div style={styles.quickFilters}>
            <button
              style={{
                ...styles.quickFilterButton,
                ...(periodo === "24h" ? styles.quickFilterActive : {})
              }}
              onClick={() => calcularPeriodoRapido("24h")}
            >
              ⏰ Últimas 24h
            </button>
            <button
              style={{
                ...styles.quickFilterButton,
                ...(periodo === "7d" ? styles.quickFilterActive : {})
              }}
              onClick={() => calcularPeriodoRapido("7d")}
            >
              📅 Última Semana
            </button>
            <button
              style={{
                ...styles.quickFilterButton,
                ...(periodo === "30d" ? styles.quickFilterActive : {})
              }}
              onClick={() => calcularPeriodoRapido("30d")}
            >
              📊 Último Mês
            </button>
          </div>
        </div>
      </section>

      {/* 📊 STATUS E ERROS */}
      <section style={styles.statusSection}>
        {loading && (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <span>Carregando dados meteorológicos...</span>
          </div>
        )}
        
        {erro && (
          <div style={styles.error}>
            ⚠️ {erro}
          </div>
        )}

        {!loading && !erro && agrupados.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📈</div>
            <h3>Nenhum dado encontrado</h3>
            <p>Não há dados disponíveis para os filtros selecionados.</p>
          </div>
        )}
      </section>

      {/* 📈 GRÁFICOS */}
      {agrupados.length > 0 && (
        <section style={styles.chartsSection}>
          <div style={styles.chartsGrid}>
            <div style={styles.chartCard}>
              <div style={styles.chartHeader}>
                <h3 style={styles.chartTitle}>🌡️ Temperatura</h3>
                <span style={styles.chartUnit}>(°C)</span>
              </div>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Temperatura (°C)",
                      data: temperatura,
                      borderColor: "#ff6b6b",
                      backgroundColor: "rgba(255, 107, 107, 0.1)",
                      borderWidth: 2,
                      tension: 0.4,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  maintainAspectRatio: false
                }}
              />
            </div>

            <div style={styles.chartCard}>
              <div style={styles.chartHeader}>
                <h3 style={styles.chartTitle}>💧 Umidade</h3>
                <span style={styles.chartUnit}>(%)</span>
              </div>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Umidade (%)",
                      data: umidade,
                      borderColor: "#4dabf7",
                      backgroundColor: "rgba(77, 171, 247, 0.1)",
                      borderWidth: 2,
                      tension: 0.4,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  maintainAspectRatio: false
                }}
              />
            </div>
          </div>

          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div>
                <h3 style={styles.chartTitle}>🌧️ Precipitação Acumulada</h3>
                <p style={styles.chartSubtitle}>Total do período: {totalChuva.toFixed(2)} mm</p>
              </div>
              <span style={styles.chartUnit}>(mm/h)</span>
            </div>
            <Bar
              data={{
                labels,
                datasets: [
                  {
                    label: "Chuva por hora (mm)",
                    data: chuva,
                    backgroundColor: "#51cf66",
                    borderRadius: 4,
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: {
                    display: false
                  }
                },
                maintainAspectRatio: false
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}

// 🎨 ESTILOS
const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "24px",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
  },
  titleSection: {
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: "2.5rem",
    fontWeight: "700",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    margin: "4px 0 0 0",
    color: "#666",
    fontSize: "1.1rem",
    fontWeight: "400",
  },
  weatherCard: {
    display: "flex",
    gap: "32px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    padding: "20px 32px",
    borderRadius: "12px",
    color: "white",
  },
  weatherItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  weatherLabel: {
    fontSize: "0.9rem",
    opacity: 0.9,
    marginBottom: "4px",
  },
  weatherValue: {
    fontSize: "1.5rem",
    fontWeight: "700",
  },
  controlPanel: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "24px",
    marginBottom: "24px",
  },
  card: {
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "16px",
    padding: "24px",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  },
  cardTitle: {
    margin: "0 0 20px 0",
    fontSize: "1.3rem",
    fontWeight: "600",
    color: "#333",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "16px",
    marginBottom: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: "8px",
    fontWeight: "500",
    color: "#555",
    fontSize: "0.9rem",
  },
  input: {
    padding: "12px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    fontSize: "1rem",
    transition: "all 0.3s ease",
    outline: "none",
  },
  inputFocus: {
    borderColor: "#667eea",
    boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.1)",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
  },
  primaryButton: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  secondaryButton: {
    padding: "12px 24px",
    background: "transparent",
    color: "#666",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  quickFilters: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  quickFilterButton: {
    padding: "12px 16px",
    background: "transparent",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "all 0.3s ease",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  quickFilterActive: {
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    borderColor: "transparent",
  },
  statusSection: {
    marginBottom: "24px",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "20px",
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "12px",
    color: "#666",
    justifyContent: "center",
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid #e0e0e0",
    borderTop: "2px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  error: {
    padding: "16px",
    background: "rgba(255, 107, 107, 0.1)",
    border: "1px solid #ff6b6b",
    borderRadius: "12px",
    color: "#d63031",
    textAlign: "center",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "16px",
    color: "#666",
  },
  emptyIcon: {
    fontSize: "4rem",
    marginBottom: "16px",
  },
  chartsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
  },
  chartCard: {
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "16px",
    padding: "24px",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    height: "400px",
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  chartTitle: {
    margin: 0,
    fontSize: "1.3rem",
    fontWeight: "600",
    color: "#333",
  },
  chartSubtitle: {
    margin: "4px 0 0 0",
    color: "#666",
    fontSize: "0.9rem",
  },
  chartUnit: {
    color: "#666",
    fontSize: "0.9rem",
    fontWeight: "500",
  },
};

// Adicionar animação do spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);
