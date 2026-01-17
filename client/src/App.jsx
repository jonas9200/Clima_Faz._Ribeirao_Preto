import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [equipamento, setEquipamento] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEquipamentos, setLoadingEquipamentos] = useState(false);
  const [erro, setErro] = useState("");
  const [periodo, setPeriodo] = useState("24h");
  const [totalChuva, setTotalChuva] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [favorito, setFavorito] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL || "";

  // Detecta se é mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🔄 Carregar lista de equipamentos
  useEffect(() => {
    carregarEquipamentos();
  }, []);

  async function carregarEquipamentos() {
    setLoadingEquipamentos(true);
    try {
      const url = `${baseUrl}/api/equipamentos`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao buscar equipamentos");
      const json = await resp.json();
      
      const listaEquipamentos = json.equipamentos || [];
      setEquipamentos(listaEquipamentos);
      
      if (listaEquipamentos.length > 0) {
        setEquipamento(listaEquipamentos[0]);
      }
    } catch (e) {
      console.error("Erro ao carregar equipamentos:", e);
      const listaPadrao = ["Pluviometro_01"];
      setEquipamentos(listaPadrao);
      setEquipamento(listaPadrao[0]);
    } finally {
      setLoadingEquipamentos(false);
    }
  }

  // Aplicar filtro automático
  useEffect(() => {
    if (equipamento && equipamento !== "") {
      setTimeout(() => {
        calcularPeriodoRapido("24h");
      }, 100);
    }
  }, [equipamento]);

  // Funções de conversão de data
  function toLocalDatetimeString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function toDatabaseFormat(datetimeString) {
    if (!datetimeString) return '';
    const date = new Date(datetimeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // 📆 Filtros rápidos
  function calcularPeriodoRapido(p) {
    const agora = new Date();
    const inicio = new Date(agora);

    if (p === "24h") {
      inicio.setHours(inicio.getHours() - 24);
    } else if (p === "7d") {
      inicio.setDate(inicio.getDate() - 7);
    } else if (p === "30d") {
      inicio.setDate(inicio.getDate() - 30);
    }

    setDataInicial(toLocalDatetimeString(inicio));
    setDataFinal(toLocalDatetimeString(agora));
    setPeriodo(p);

    const inicioBanco = toDatabaseFormat(toLocalDatetimeString(inicio));
    const finalBanco = toDatabaseFormat(toLocalDatetimeString(agora));

    carregarComDatas(inicioBanco, finalBanco);
  }

  async function carregarComDatas(inicial, final) {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ equipamento });
      if (inicial) params.append("data_inicial", inicial);
      if (final) params.append("data_final", final);

      const url = `${baseUrl}/api/series?${params.toString()}`;
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

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ equipamento });
      
      const dataInicialBanco = toDatabaseFormat(dataInicial);
      const dataFinalBanco = toDatabaseFormat(dataFinal);
      
      if (dataInicialBanco) params.append("data_inicial", dataInicialBanco);
      if (dataFinalBanco) params.append("data_final", dataFinalBanco);

      const url = `${baseUrl}/api/series?${params.toString()}`;
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
    setTimeout(() => {
      calcularPeriodoRapido("24h");
    }, 100);
  }

  // Processar dados
  function agruparPorHora(lista) {
    const mapa = {};
    lista.forEach((d) => {
      const registro = d.registro;
      let horaStr = registro.includes('T') 
        ? registro.slice(0, 13) + ":00:00"
        : registro.slice(0, 13) + ":00:00";

      if (!mapa[horaStr]) {
        mapa[horaStr] = {
          count: 0,
          somaTemp: 0,
          somaUmid: 0,
          somaChuva: 0,
          timestamp: new Date(registro).getTime()
        };
      }

      mapa[horaStr].count++;
      mapa[horaStr].somaTemp += Number(d.temperatura) || 0;
      mapa[horaStr].somaUmid += Number(d.umidade) || 0;
      mapa[horaStr].somaChuva += Number(d.chuva) || 0;
    });

    const horasOrdenadas = Object.keys(mapa).sort((a, b) => 
      mapa[a].timestamp - mapa[b].timestamp
    );

    return horasOrdenadas.map((h) => ({
      hora: h,
      timestamp: mapa[h].timestamp,
      temperatura: Number((mapa[h].somaTemp / mapa[h].count).toFixed(2)),
      umidade: Number((mapa[h].somaUmid / mapa[h].count).toFixed(2)),
      chuva: Number(mapa[h].somaChuva.toFixed(2)),
    }));
  }

  const agrupados = agruparPorHora(dados);
  
  // Dados para exibição
  const ultimaComunicacao = agrupados.length > 0 
    ? new Date(agrupados[agrupados.length - 1].hora).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : "20:00";
    
  const tempAtual = agrupados.length > 0 ? agrupados[agrupados.length - 1].temperatura : 23.1;
  const umidadeAtual = agrupados.length > 0 ? agrupados[agrupados.length - 1].umidade : 98.3;
  const chuvaPeriodo = totalChuva;

  // Calcular máximo
  const tempMax = agrupados.length > 0 
    ? Math.max(...agrupados.map(d => d.temperatura))
    : 28.8;
    
  const umidadeMax = agrupados.length > 0 
    ? Math.max(...agrupados.map(d => d.umidade))
    : 73.8;
    
  const horaTempMax = agrupados.length > 0 
    ? new Date(agrupados.find(d => d.temperatura === tempMax).hora).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : "17:00";

  // Dados para o gráfico
  const labels = agrupados.length > 0 
    ? agrupados.map(d => 
        new Date(d.hora).toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }).replace(':', 'h')
      )
    : ["00h00", "02h00", "04h00", "06h00", "08h00", "10h00", "12h00", "14h00", "16h00", "18h00", "20h00", "22h00"];

  const chuvaData = agrupados.length > 0 
    ? agrupados.map(d => d.chuva)
    : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  const tempData = agrupados.length > 0 
    ? agrupados.map(d => d.temperatura)
    : [22, 21, 20, 19, 20, 23, 25, 28, 28.8, 27, 25, 23];

  // Estilos baseados na imagem
  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
      padding: isMobile ? "15px" : "30px",
      fontFamily: "'Arial', sans-serif",
      color: "#333"
    },
    header: {
      textAlign: "center",
      marginBottom: "40px",
      padding: "0 20px"
    },
    mainTitle: {
      fontSize: isMobile ? "28px" : "36px",
      fontWeight: "600",
      color: "#2c3e50",
      margin: "0 0 8px 0",
      letterSpacing: "-0.5px"
    },
    subtitle: {
      fontSize: isMobile ? "16px" : "20px",
      color: "#7f8c8d",
      margin: "0 0 30px 0",
      fontWeight: "400"
    },
    layoutContainer: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "350px 1fr",
      gap: "30px",
      maxWidth: "1400px",
      margin: "0 auto"
    },
    // Coluna esquerda - Estatísticas
    leftColumn: {
      background: "#ffffff",
      borderRadius: "15px",
      padding: "25px",
      boxShadow: "0 5px 20px rgba(0, 0, 0, 0.08)",
      border: "1px solid #eaeaea"
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "20px",
      marginBottom: "30px"
    },
    statCard: {
      background: "#f8f9fa",
      borderRadius: "12px",
      padding: "20px",
      textAlign: "center",
      border: "1px solid #eaeaea",
      transition: "all 0.3s ease"
    },
    statTitle: {
      fontSize: "13px",
      color: "#7f8c8d",
      fontWeight: "600",
      marginBottom: "10px",
      textTransform: "uppercase",
      letterSpacing: "0.5px"
    },
    statValue: {
      fontSize: isMobile ? "22px" : "28px",
      fontWeight: "700",
      color: "#2c3e50"
    },
    periodFilters: {
      display: "flex",
      gap: "10px",
      marginBottom: "25px",
      flexWrap: "wrap"
    },
    periodFilter: {
      flex: "1",
      padding: "12px 15px",
      background: "#f8f9fa",
      border: "1px solid #e0e0e0",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#555",
      cursor: "pointer",
      textAlign: "center",
      transition: "all 0.2s ease"
    },
    periodFilterActive: {
      background: "#3498db",
      color: "white",
      borderColor: "#3498db"
    },
    actionButtons: {
      display: "flex",
      gap: "10px",
      marginBottom: "30px"
    },
    favoriteButton: {
      flex: "1",
      padding: "12px 15px",
      background: favorito ? "#f39c12" : "#f8f9fa",
      border: "1px solid #e0e0e0",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "500",
      color: favorito ? "white" : "#555",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      transition: "all 0.2s ease"
    },
    popupButton: {
      width: "50px",
      padding: "12px",
      background: "#f8f9fa",
      border: "1px solid #e0e0e0",
      borderRadius: "8px",
      fontSize: "18px",
      fontWeight: "500",
      color: "#555",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease"
    },
    // Coluna direita - Gráfico e métricas
    rightColumn: {
      display: "flex",
      flexDirection: "column",
      gap: "25px"
    },
    chartSection: {
      background: "#ffffff",
      borderRadius: "15px",
      padding: "25px",
      boxShadow: "0 5px 20px rgba(0, 0, 0, 0.08)",
      border: "1px solid #eaeaea"
    },
    sectionTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#2c3e50",
      margin: "0 0 20px 0"
    },
    chartHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px"
    },
    metricsLegend: {
      display: "flex",
      gap: "25px"
    },
    metricItem: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    },
    metricLabel: {
      fontSize: "14px",
      color: "#7f8c8d",
      marginBottom: "5px",
      fontWeight: "500"
    },
    metricValue: {
      fontSize: "18px",
      fontWeight: "700",
      color: "#2c3e50"
    },
    chartContainer: {
      height: "300px",
      position: "relative",
      marginBottom: "30px"
    },
    maxTimeInfo: {
      background: "#f8f9fa",
      borderRadius: "10px",
      padding: "20px",
      textAlign: "center",
      border: "1px solid #eaeaea"
    },
    maxTimeTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#2c3e50",
      marginBottom: "15px"
    },
    maxTimeStats: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "15px"
    },
    maxTimeStat: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    },
    maxTimeValue: {
      fontSize: "18px",
      fontWeight: "700",
      color: "#3498db"
    },
    humiditySection: {
      background: "#ffffff",
      borderRadius: "15px",
      padding: "25px",
      boxShadow: "0 5px 20px rgba(0, 0, 0, 0.08)",
      border: "1px solid #eaeaea"
    },
    humidityHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px"
    },
    humidityScale: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "15px",
      padding: "0 10px"
    },
    humidityValue: {
      fontSize: "14px",
      color: "#7f8c8d",
      fontWeight: "500"
    },
    humidityBar: {
      height: "30px",
      background: "linear-gradient(90deg, #3498db 0%, #2ecc71 100%)",
      borderRadius: "15px",
      marginBottom: "20px",
      position: "relative"
    },
    humidityIndicator: {
      position: "absolute",
      top: "-10px",
      width: "4px",
      height: "50px",
      background: "#e74c3c",
      transform: "translateX(-50%)",
      left: `${umidadeAtual}%`
    },
    dayLabels: {
      display: "flex",
      justifyContent: "space-between",
      padding: "0 10px"
    },
    dayLabel: {
      fontSize: "14px",
      color: "#7f8c8d",
      fontWeight: "500"
    },
    // Controles
    controlsCard: {
      background: "#ffffff",
      borderRadius: "15px",
      padding: "25px",
      marginTop: "25px",
      boxShadow: "0 5px 20px rgba(0, 0, 0, 0.08)",
      border: "1px solid #eaeaea"
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
      gap: "15px",
      marginBottom: "20px"
    },
    formGroup: {
      display: "flex",
      flexDirection: "column"
    },
    label: {
      marginBottom: "8px",
      fontWeight: "500",
      color: "#555",
      fontSize: "14px"
    },
    input: {
      padding: "12px",
      border: "1px solid #ddd",
      borderRadius: "8px",
      fontSize: "14px",
      backgroundColor: "white",
      color: "#333",
      transition: "all 0.2s ease"
    },
    select: {
      padding: "12px",
      border: "1px solid #ddd",
      borderRadius: "8px",
      fontSize: "14px",
      backgroundColor: "white",
      color: "#333",
      cursor: "pointer",
      transition: "all 0.2s ease"
    },
    buttonGroup: {
      display: "flex",
      gap: "12px"
    },
    primaryButton: {
      padding: "12px 24px",
      background: "#3498db",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      flex: 1,
      transition: "all 0.2s ease"
    },
    secondaryButton: {
      padding: "12px 24px",
      background: "transparent",
      color: "#7f8c8d",
      border: "1px solid #ddd",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      flex: 1,
      transition: "all 0.2s ease"
    },
    // Estados
    loading: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "20px",
      background: "white",
      borderRadius: "10px",
      color: "#7f8c8d",
      justifyContent: "center",
      fontSize: "14px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
      border: "1px solid #eaeaea"
    },
    spinner: {
      width: "20px",
      height: "20px",
      border: "2px solid #eaeaea",
      borderTop: "2px solid #3498db",
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    },
    error: {
      padding: "16px",
      background: "rgba(231, 76, 60, 0.05)",
      border: "1px solid #e74c3c",
      borderRadius: "10px",
      color: "#e74c3c",
      textAlign: "center",
      fontSize: "14px"
    }
  };

  // Configurações do gráfico
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
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#333',
        bodyColor: '#333',
        borderColor: '#ddd',
        borderWidth: 1,
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#7f8c8d',
          font: {
            size: 11
          },
          maxTicksLimit: 12
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          color: '#7f8c8d',
          font: {
            size: 11
          },
          callback: function(value) {
            return value;
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  // Dados do gráfico
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Chuvas (mm)',
        data: chuvaData,
        type: 'bar',
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderColor: 'rgba(52, 152, 219, 1)',
        borderWidth: 1,
        borderRadius: 4,
        order: 2
      },
      {
        label: 'Temp (°C)',
        data: tempData,
        type: 'line',
        borderColor: 'rgba(231, 76, 60, 1)',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        order: 1
      }
    ]
  };

  return (
    <div style={styles.container}>
      {/* Cabeçalho */}
      <div style={styles.header}>
        <h1 style={styles.mainTitle}>Fazenda Ribeirão Preto</h1>
        <p style={styles.subtitle}>Estágio Alfenarzinho - Pernambuco (SP)</p>
      </div>

      {/* Layout principal */}
      <div style={styles.layoutContainer}>
        {/* Coluna esquerda - Estatísticas */}
        <div style={styles.leftColumn}>
          {/* Grid de estatísticas */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statTitle}>Ultimo Comunicado</div>
              <div style={styles.statValue}>{ultimaComunicacao}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statTitle}>Temperatura Atual</div>
              <div style={styles.statValue}>{tempAtual.toFixed(1)}°C</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statTitle}>Umidade Atual</div>
              <div style={styles.statValue}>{umidadeAtual.toFixed(1)}%</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statTitle}>Chuvas no Período</div>
              <div style={styles.statValue}>{chuvaPeriodo.toFixed(1)}mm</div>
            </div>
          </div>

          {/* Filtros de período */}
          <div style={styles.periodFilters}>
            {["16/01/2025", "17/01/2025", "24h", "7 Días", "30 Dias"].map((period) => (
              <button
                key={period}
                style={{
                  ...styles.periodFilter,
                  ...(periodo === period ? styles.periodFilterActive : {})
                }}
                onClick={() => {
                  if (period === "24h") calcularPeriodoRapido("24h");
                  else if (period === "7 Días") calcularPeriodoRapido("7d");
                  else if (period === "30 Dias") calcularPeriodoRapido("30d");
                }}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Botões de ação */}
          <div style={styles.actionButtons}>
            <button 
              style={styles.favoriteButton}
              onClick={() => setFavorito(!favorito)}
            >
              {favorito ? "★" : "☆"} {favorito ? "Favoritado" : "Favoritar"}
            </button>
            <button style={styles.popupButton}>
              [-] PopUp
            </button>
          </div>

          {/* Seção de máximo */}
          <div style={styles.maxTimeInfo}>
            <div style={styles.maxTimeTitle}>Tempo Máximo</div>
            <div style={styles.maxTimeValue}>{horaTempMax}</div>
            <div style={styles.maxTimeStats}>
              <div style={styles.maxTimeStat}>
                <div style={{...styles.statTitle, fontSize: "12px"}}>Chuvas</div>
                <div style={styles.statValue}>{chuvaPeriodo > 0 ? chuvaPeriodo.toFixed(1) : "0"}</div>
              </div>
              <div style={styles.maxTimeStat}>
                <div style={{...styles.statTitle, fontSize: "12px"}}>Temp Máx.</div>
                <div style={styles.statValue}>{tempMax.toFixed(1)}</div>
              </div>
              <div style={styles.maxTimeStat}>
                <div style={{...styles.statTitle, fontSize: "12px"}}>Umid Máx.</div>
                <div style={styles.statValue}>{umidadeMax.toFixed(1)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna direita - Gráfico e métricas */}
        <div style={styles.rightColumn}>
          {/* Seção do gráfico */}
          <div style={styles.chartSection}>
            <h3 style={styles.sectionTitle}>Monitoramento Meteorológico Local</h3>
            
            <div style={styles.chartHeader}>
              <div style={styles.metricsLegend}>
                <div style={styles.metricItem}>
                  <div style={styles.metricLabel}>Chuvas</div>
                  <div style={styles.metricValue}>{chuvaPeriodo.toFixed(1)}</div>
                </div>
                <div style={styles.metricItem}>
                  <div style={styles.metricLabel}>Temp Máx.</div>
                  <div style={styles.metricValue}>{tempMax.toFixed(1)}</div>
                </div>
                <div style={styles.metricItem}>
                  <div style={styles.metricLabel}>Umid Máx.</div>
                  <div style={styles.metricValue}>{umidadeMax.toFixed(1)}</div>
                </div>
              </div>
            </div>

            <div style={styles.chartContainer}>
              <Bar
                data={chartData}
                options={chartOptions}
              />
            </div>
          </div>

          {/* Seção de umidade */}
          <div style={styles.humiditySection}>
            <div style={styles.humidityHeader}>
              <h3 style={styles.sectionTitle}>Grau de Humidade</h3>
              <div style={styles.metricValue}>{umidadeAtual.toFixed(1)}%</div>
            </div>
            
            <div style={styles.humidityScale}>
              <div style={styles.humidityValue}>0</div>
              <div style={styles.humidityValue}>25</div>
              <div style={styles.humidityValue}>50</div>
              <div style={styles.humidityValue}>75</div>
              <div style={styles.humidityValue}>100</div>
            </div>
            
            <div style={styles.humidityBar}>
              <div style={{
                ...styles.humidityIndicator,
                left: `${umidadeAtual}%`
              }} />
            </div>
            
            <div style={styles.dayLabels}>
              <div style={styles.dayLabel}>Dia 1</div>
              <div style={styles.dayLabel}>2</div>
              <div style={styles.dayLabel}>3</div>
              <div style={styles.dayLabel}>4</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de configuração */}
      <div style={styles.controlsCard}>
        <h3 style={styles.sectionTitle}>Configurações</h3>
        
        {erro && (
          <div style={styles.error}>
            ⚠️ {erro}
          </div>
        )}
        
        {loading && (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <span>Carregando dados...</span>
          </div>
        )}

        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>📡 Equipamento</label>
            {loadingEquipamentos ? (
              <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <span>Carregando equipamentos...</span>
              </div>
            ) : (
              <select
                style={styles.select}
                value={equipamento}
                onChange={(e) => setEquipamento(e.target.value)}
              >
                <option value="">Selecione um equipamento</option>
                {equipamentos.map((eqp) => (
                  <option key={eqp} value={eqp}>
                    {eqp}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>📅 Data Inicial</label>
            <input
              type="datetime-local"
              style={styles.input}
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>📅 Data Final</label>
            <input
              type="datetime-local"
              style={styles.input}
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
            />
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button 
            style={styles.primaryButton}
            onClick={() => carregar()}
            disabled={!equipamento}
          >
            🔍 Aplicar Filtros
          </button>
          <button 
            style={styles.secondaryButton}
            onClick={limparFiltro}
          >
            🗑️ Limpar Filtros
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        * {
          box-sizing: border-box;
        }

        input:focus, select:focus, button:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }

        button:hover {
          transform: translateY(-1px);
        }

        body {
          background: #f8f9fa;
          margin: 0;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
