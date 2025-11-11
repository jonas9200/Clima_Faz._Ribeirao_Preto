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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const baseUrl = import.meta.env.VITE_API_URL || "";

  // Detecta se é mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      temperatura: Number((mapa[h].somaTemp / mapa[h].count).toFixed(2)),
      umidade: Number((mapa[h].somaUmid / mapa[h].count).toFixed(2)),
      chuva: Number(mapa[h].somaChuva.toFixed(2)),
    }));
  }

  const agrupados = agruparPorHora(dados);

  // Labels vazios para remover textos abaixo dos gráficos
  const labels = agrupados.map(() => "");

  const temperatura = agrupados.map((d) => d.temperatura);
  const umidade = agrupados.map((d) => d.umidade);
  const chuva = agrupados.map((d) => d.chuva);

  // Configurações dos gráficos sem labels
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            const dataOriginal = agrupados[index];
            return new Date(dataOriginal.hora).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: false, // Remove completamente o eixo X
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12
          },
          callback: function(value) {
            return value.toFixed(2); // Duas casas decimais no eixo Y
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12
          },
          callback: function(value) {
            return value.toFixed(2); // Duas casas decimais no eixo Y
          }
        }
      }
    }
  };

  // Estilos responsivos
  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: isMobile ? "10px" : "20px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    header: {
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "16px",
      padding: isMobile ? "16px" : "24px",
      marginBottom: isMobile ? "16px" : "24px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    },
    headerContent: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile ? "flex-start" : "center",
      gap: "16px",
    },
    title: {
      margin: 0,
      fontSize: isMobile ? "1.5rem" : "2rem",
      fontWeight: "700",
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    subtitle: {
      margin: "4px 0 0 0",
      color: "#666",
      fontSize: isMobile ? "0.9rem" : "1rem",
    },
    weatherCard: {
      display: "flex",
      gap: isMobile ? "20px" : "32px",
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      padding: isMobile ? "12px 16px" : "16px 24px",
      borderRadius: "12px",
      color: "white",
      width: isMobile ? "100%" : "auto",
      justifyContent: isMobile ? "space-around" : "flex-start",
    },
    card: {
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "12px",
      padding: isMobile ? "16px" : "20px",
      marginBottom: isMobile ? "16px" : "20px",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
    },
    cardTitle: {
      margin: "0 0 16px 0",
      fontSize: isMobile ? "1.1rem" : "1.2rem",
      fontWeight: "600",
      color: "#333",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
      gap: "12px",
      marginBottom: "16px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
    },
    label: {
      marginBottom: "6px",
      fontWeight: "500",
      color: "#555",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
    },
    input: {
      padding: "10px",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
    },
    buttonGroup: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: "10px",
    },
    primaryButton: {
      padding: "10px 20px",
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      color: "white",
      border: "none",
      borderRadius: "6px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      flex: isMobile ? "1" : "none",
    },
    secondaryButton: {
      padding: "10px 20px",
      background: "transparent",
      color: "#666",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      flex: isMobile ? "1" : "none",
    },
    quickFilters: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: "10px",
      flexWrap: "wrap",
    },
    quickFilterButton: {
      padding: "10px 14px",
      background: "transparent",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      cursor: "pointer",
      textAlign: "center",
      flex: isMobile ? "1" : "none",
    },
    quickFilterActive: {
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      color: "white",
      borderColor: "transparent",
    },
    loading: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "16px",
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "8px",
      color: "#666",
      justifyContent: "center",
      fontSize: isMobile ? "0.9rem" : "1rem",
    },
    spinner: {
      width: "18px",
      height: "18px",
      border: "2px solid #e0e0e0",
      borderTop: "2px solid #667eea",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
    error: {
      padding: "14px",
      background: "rgba(255, 107, 107, 0.1)",
      border: "1px solid #ff6b6b",
      borderRadius: "8px",
      color: "#d63031",
      textAlign: "center",
      fontSize: isMobile ? "0.9rem" : "1rem",
    },
    emptyState: {
      textAlign: "center",
      padding: "40px 20px",
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "12px",
      color: "#666",
    },
    chartsGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: isMobile ? "16px" : "20px",
      marginBottom: isMobile ? "16px" : "20px",
    },
    chartCard: {
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "12px",
      padding: isMobile ? "16px" : "20px",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
      height: isMobile ? "300px" : "350px",
    },
    chartHeader: {
      marginBottom: "16px",
      textAlign: "center",
    },
    chartTitle: {
      margin: 0,
      fontSize: isMobile ? "1rem" : "1.1rem",
      fontWeight: "600",
      color: "#333",
    },
  };

  return (
    <div style={styles.container}>
      {/* 🎯 HEADER */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>🌦️ AGS Clima</h1>
            <p style={styles.subtitle}>Monitoramento Meteorológico em Tempo Real</p>
          </div>
          {!loading && !erro && agrupados.length > 0 && (
            <div style={styles.weatherCard}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: isMobile ? "0.7rem" : "0.8rem", opacity: 0.9 }}>Total de Chuva</div>
                <div style={{ fontSize: isMobile ? "1.1rem" : "1.3rem", fontWeight: "bold" }}>{totalChuva.toFixed(2)} mm</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: isMobile ? "0.7rem" : "0.8rem", opacity: 0.9 }}>Período</div>
                <div style={{ fontSize: isMobile ? "1.1rem" : "1.3rem", fontWeight: "bold" }}>{agrupados.length}h</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 🎛️ PAINEL DE CONTROLE */}
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
            🗑️ Limpar
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

      {/* 📊 STATUS E ERROS */}
      <div>
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
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📈</div>
            <h3>Nenhum dado encontrado</h3>
            <p>Não há dados disponíveis para os filtros selecionados.</p>
          </div>
        )}
      </div>

      {/* 📈 GRÁFICOS */}
      {agrupados.length > 0 && (
        <div>
          <div style={styles.chartsGrid}>
            <div style={styles.chartCard}>
              <div style={styles.chartHeader}>
                <h3 style={styles.chartTitle}>🌡️ Temperatura (°C)</h3>
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
                options={chartOptions}
              />
            </div>

            <div style={styles.chartCard}>
              <div style={styles.chartHeader}>
                <h3 style={styles.chartTitle}>💧 Umidade (%)</h3>
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
                options={chartOptions}
              />
            </div>
          </div>

          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>🌧️ Precipitação Acumulada (mm)</h3>
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
              options={barOptions}
            />
          </div>

          {/* 🗓️ LEGENDA DE DATAS */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📅 Período dos Dados</h3>
            <div style={{ 
              background: "rgba(102, 126, 234, 0.1)", 
              padding: "12px", 
              borderRadius: "8px",
              fontSize: isMobile ? "0.8rem" : "0.9rem"
            }}>
              <div><strong>Data inicial:</strong> {new Date(agrupados[0].hora).toLocaleString('pt-BR')}</div>
              <div><strong>Data final:</strong> {new Date(agrupados[agrupados.length - 1].hora).toLocaleString('pt-BR')}</div>
              <div style={{ marginTop: "8px", fontStyle: "italic" }}>
                Passe o mouse sobre os gráficos para ver os valores e datas específicas
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Melhora a experiência em mobile */
        @media (max-width: 768px) {
          input[type="datetime-local"] {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
