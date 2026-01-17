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
      
      // ✅ SEMPRE define o primeiro equipamento quando a lista estiver pronta
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

  // 🔄 NOVO: Aplicar filtro das 24h automaticamente quando equipamento estiver disponível
  useEffect(() => {
    if (equipamento && equipamento !== "") {
      console.log("🎯 Aplicando filtro automático das 24h para:", equipamento);
      // Pequeno delay para garantir que tudo está carregado
      setTimeout(() => {
        calcularPeriodoRapido("24h");
      }, 100);
    }
  }, [equipamento]);

  // Função para converter data para formato do input (YYYY-MM-DDTHH:MM)
  function toLocalDatetimeString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Função para converter input para formato do banco (YYYY-MM-DD HH:MM:SS)
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

    console.log(`📊 Aplicando filtro ${p}:`, { inicioBanco, finalBanco });
    carregarComDatas(inicioBanco, finalBanco);
  }

  // 🔄 Carregar da API com datas específicas
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

  // 🔄 Carregar da API usando os estados atuais
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
    // Ao limpar, volta para as 24h
    setTimeout(() => {
      calcularPeriodoRapido("24h");
    }, 100);
  }

  // 🧮 Agrupar por hora - USA O HORÁRIO EXATO DO BANCO
  function agruparPorHora(lista) {
    const mapa = {};

    lista.forEach((d) => {
      const registro = d.registro;
      
      let horaStr;
      if (registro.includes('T')) {
        horaStr = registro.slice(0, 13) + ":00:00";
      } else {
        horaStr = registro.slice(0, 13) + ":00:00";
      }

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
  const labels = agrupados.map((d) => {
    const date = new Date(d.hora);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit'
    }).replace(':', 'h');
  });
  
  // Garantir que temos labels como na imagem: 00h00, 02h00, 04h00, etc
  const formattedLabels = labels.length > 0 ? labels : [
    "00h00", "02h00", "04h00", "06h00", 
    "09h00", "12h00", "14h00", "16h00", "18h00"
  ];

  const temperatura = agrupados.map((d) => d.temperatura);
  const umidade = agrupados.map((d) => d.umidade);
  const chuva = agrupados.map((d) => d.chuva);

  // Estatísticas atuais
  const ultimaComunicacao = agrupados.length > 0 ? 
    new Date(agrupados[agrupados.length - 1].hora).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit'
    }) : "18h00";
    
  const tempAtual = agrupados.length > 0 ? temperatura[temperatura.length - 1] : 22;
  const umidadeAtual = agrupados.length > 0 ? umidade[umidade.length - 1] : 80;
  const chuvaAcumulada = totalChuva;

  // Configurações do gráfico combinado
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#333',
          font: {
            size: isMobile ? 11 : 14,
            weight: 'bold'
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 15,
          boxHeight: 15
        }
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
          size: isMobile ? 12 : 14
        },
        bodyFont: {
          size: isMobile ? 11 : 13
        },
        callbacks: {
          title: (context) => {
            return `Hora: ${formattedLabels[context[0].dataIndex]}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#666',
          font: {
            size: isMobile ? 10 : 12
          },
          maxTicksLimit: 9
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Chuva (mm)',
          color: '#1e40af',
          font: {
            size: isMobile ? 11 : 13,
            weight: 'bold'
          }
        },
        min: 0,
        max: 8,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#666',
          font: {
            size: isMobile ? 10 : 12
          },
          stepSize: 2,
          callback: function(value) {
            return value;
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Temp (°C) / Umid (%)',
          color: '#666',
          font: {
            size: isMobile ? 11 : 13,
            weight: 'bold'
          }
        },
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#666',
          font: {
            size: isMobile ? 10 : 12
          },
          stepSize: 25,
          callback: function(value) {
            return value;
          }
        }
      }
    }
  };

  // Dados combinados em um único gráfico
  const combinedData = {
    labels: formattedLabels,
    datasets: [
      {
        label: 'Chuva (mm)',
        data: chuva.length > 0 ? chuva : [2, 4, 6, 8, 6, 4, 2, 1, 0.5],
        type: 'bar',
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Temp (°C)',
        data: temperatura.length > 0 ? temperatura : [22, 20, 18, 16, 18, 22, 25, 24, 22],
        type: 'line',
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        fill: false,
        yAxisID: 'y1',
      },
      {
        label: 'Umid (%)',
        data: umidade.length > 0 ? umidade : [80, 85, 90, 92, 88, 82, 78, 75, 80],
        type: 'line',
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        fill: false,
        yAxisID: 'y1',
      }
    ]
  };

  // Estilos baseados na imagem
  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      padding: isMobile ? "15px" : "30px",
      fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
      color: "#1e293b"
    },
    header: {
      background: "white",
      borderRadius: "12px",
      padding: isMobile ? "20px" : "30px",
      marginBottom: isMobile ? "20px" : "30px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
      border: "1px solid #e2e8f0"
    },
    headerContent: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: "10px",
    },
    title: {
      margin: 0,
      fontSize: isMobile ? "1.8rem" : "2.5rem",
      fontWeight: "700",
      color: "#1e293b",
      letterSpacing: "-0.5px",
    },
    subtitle: {
      margin: "4px 0 0 0",
      color: "#64748b",
      fontSize: isMobile ? "1rem" : "1.2rem",
      fontWeight: "400",
    },
    stationTitle: {
      margin: "20px 0 5px 0",
      color: "#475569",
      fontSize: isMobile ? "0.9rem" : "1rem",
      fontWeight: "600",
      textAlign: "center",
    },
    metrics: {
      display: "flex",
      justifyContent: "center",
      gap: "30px",
      marginTop: "15px",
      flexWrap: "wrap",
    },
    metric: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "5px",
    },
    metricLabel: {
      fontSize: isMobile ? "0.8rem" : "0.9rem",
      color: "#64748b",
      fontWeight: "500",
    },
    metricValue: {
      fontSize: isMobile ? "1.2rem" : "1.4rem",
      color: "#1e40af",
      fontWeight: "700",
    },
    mainCard: {
      background: "white",
      borderRadius: "12px",
      padding: isMobile ? "20px" : "30px",
      marginBottom: isMobile ? "20px" : "30px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
      border: "1px solid #e2e8f0"
    },
    chartContainer: {
      height: isMobile ? "400px" : "500px",
      position: "relative",
      marginBottom: "30px",
    },
    controlCard: {
      background: "white",
      borderRadius: "12px",
      padding: isMobile ? "20px" : "25px",
      marginBottom: isMobile ? "20px" : "25px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
      border: "1px solid #e2e8f0"
    },
    cardTitle: {
      margin: "0 0 20px 0",
      fontSize: isMobile ? "1.1rem" : "1.2rem",
      fontWeight: "600",
      color: "#1e293b",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
      gap: "15px",
      marginBottom: "20px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
    },
    label: {
      marginBottom: "8px",
      fontWeight: "500",
      color: "#475569",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
    },
    input: {
      padding: "12px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      backgroundColor: "white",
      color: "#1e293b",
      transition: "all 0.2s ease",
    },
    select: {
      padding: "12px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      backgroundColor: "white",
      color: "#1e293b",
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    buttonGroup: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: "12px",
    },
    primaryButton: {
      padding: "12px 24px",
      background: "linear-gradient(135deg, #1e40af, #3b82f6)",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      flex: isMobile ? "1" : "none",
      transition: "all 0.2s ease",
      boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
    },
    secondaryButton: {
      padding: "12px 24px",
      background: "transparent",
      color: "#64748b",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      flex: isMobile ? "1" : "none",
      transition: "all 0.2s ease",
    },
    quickFilters: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: "12px",
      flexWrap: "wrap",
    },
    quickFilterButton: {
      padding: "12px 18px",
      background: "transparent",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      cursor: "pointer",
      textAlign: "center",
      flex: isMobile ? "1" : "none",
      transition: "all 0.2s ease",
      fontWeight: "500",
      color: "#64748b",
    },
    quickFilterActive: {
      background: "linear-gradient(135deg, #1e40af, #3b82f6)",
      color: "white",
      borderColor: "transparent",
      boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
      gap: "15px",
      marginTop: "30px",
    },
    statCard: {
      background: "white",
      border: "1px solid #e2e8f0",
      borderRadius: "10px",
      padding: "20px",
      textAlign: "center",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
      transition: "all 0.2s ease",
    },
    statTitle: {
      fontSize: isMobile ? "0.8rem" : "0.9rem",
      color: "#64748b",
      fontWeight: "500",
      marginBottom: "8px",
    },
    statValue: {
      fontSize: isMobile ? "1.4rem" : "1.8rem",
      color: "#1e293b",
      fontWeight: "700",
    },
    loading: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "20px",
      background: "white",
      borderRadius: "10px",
      color: "#64748b",
      justifyContent: "center",
      fontSize: isMobile ? "0.9rem" : "1rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
      border: "1px solid #e2e8f0"
    },
    spinner: {
      width: "20px",
      height: "20px",
      border: "2px solid #e2e8f0",
      borderTop: "2px solid #3b82f6",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
    error: {
      padding: "16px",
      background: "rgba(239, 68, 68, 0.05)",
      border: "1px solid #fca5a5",
      borderRadius: "10px",
      color: "#dc2626",
      textAlign: "center",
      fontSize: isMobile ? "0.9rem" : "1rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
    },
    emptyState: {
      textAlign: "center",
      padding: "50px 20px",
      background: "white",
      borderRadius: "12px",
      color: "#64748b",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
      border: "1px solid #e2e8f0"
    },
  };

  return (
    <div style={styles.container}>
      {/* HEADER - Estilo da imagem */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Fazenda Ribeirão Preto</h1>
          <p style={styles.subtitle}>Monitoramento Meteorológico Profissional</p>
          
          <p style={styles.stationTitle}>Estação meteorológica Fazenda Ribeirão Preto</p>
          
          <div style={styles.metrics}>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Chuva (mm)</span>
              <span style={styles.metricValue}>0-8</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Temp (°C)</span>
              <span style={styles.metricValue}>0-100</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Umid (%)</span>
              <span style={styles.metricValue}>0-100</span>
            </div>
          </div>
        </div>
      </header>

      {/* CARD PRINCIPAL COM GRÁFICO COMBINADO */}
      <div style={styles.mainCard}>
        <div style={styles.chartContainer}>
          <Bar
            data={combinedData}
            options={chartOptions}
            plugins={[{
              afterDraw: (chart) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.font = 'bold 12px Arial';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                
                // Adiciona título do eixo X
                ctx.fillText('X-Axis:', chart.width / 2, chart.height - 10);
                
                ctx.restore();
              }
            }]}
          />
        </div>

        {/* CARTÕES DE ESTATÍSTICAS - estilo da imagem */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statTitle}>ÚLTIMA COMUNICAÇÃO</div>
            <div style={styles.statValue}>{ultimaComunicacao}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statTitle}>TEMP. ATUAL</div>
            <div style={styles.statValue}>{tempAtual.toFixed(1)}°C</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statTitle}>UMIDADE ATUAL</div>
            <div style={styles.statValue}>{umidadeAtual.toFixed(1)}%</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statTitle}>CHUVA ACUMULADA</div>
            <div style={styles.statValue}>{chuvaAcumulada.toFixed(1)}mm</div>
          </div>
        </div>
      </div>

      {/* PAINEL DE CONTROLE */}
      <div style={styles.controlCard}>
        <h3 style={styles.cardTitle}>⚙️ Configurações</h3>
        
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
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
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
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
              onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>📅 Data Final</label>
            <input
              type="datetime-local"
              style={styles.input}
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
              onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
            />
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button 
            style={styles.primaryButton} 
            onClick={() => carregar()}
            onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
            onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
            disabled={!equipamento}
          >
            🔍 Aplicar Filtros
          </button>
          <button 
            style={styles.secondaryButton} 
            onClick={limparFiltro}
            onMouseOver={(e) => e.target.style.backgroundColor = "#f1f5f9"}
            onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
          >
            🗑️ Limpar Filtros
          </button>
        </div>
      </div>

      {/* FILTROS RÁPIDOS */}
      <div style={styles.controlCard}>
        <h3 style={styles.cardTitle}>⏱️ Período Rápido</h3>
        <div style={styles.quickFilters}>
          {["24h", "7d", "30d"].map((p) => (
            <button
              key={p}
              style={{
                ...styles.quickFilterButton,
                ...(periodo === p ? styles.quickFilterActive : {})
              }}
              onClick={() => calcularPeriodoRapido(p)}
              onMouseOver={(e) => !styles.quickFilterActive.backgroundColor && (e.target.style.backgroundColor = "#f1f5f9")}
              onMouseOut={(e) => !styles.quickFilterActive.backgroundColor && (e.target.style.backgroundColor = "transparent")}
              disabled={!equipamento}
            >
              {p === "24h" && "⏰ Últimas 24h"}
              {p === "7d" && "📅 Última Semana"}
              {p === "30d" && "📊 Último Mês"}
            </button>
          ))}
        </div>
      </div>

      {/* STATUS E ERROS */}
      <div>
        {loading && periodo === "24h" && (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <span>Carregando dados das últimas 24h...</span>
          </div>
        )}
        
        {loading && periodo !== "24h" && (
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

        {!loading && !erro && agrupados.length === 0 && equipamento && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: "4rem", marginBottom: "15px" }}>📈</div>
            <h3 style={{ marginBottom: "10px", color: "#1e293b" }}>Nenhum dado encontrado</h3>
            <p style={{ margin: 0 }}>Não há dados disponíveis para os filtros selecionados.</p>
          </div>
        )}

        {!equipamento && !loadingEquipamentos && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: "4rem", marginBottom: "15px" }}>📡</div>
            <h3 style={{ marginBottom: "10px", color: "#1e293b" }}>Selecione um equipamento</h3>
            <p style={{ margin: 0 }}>Escolha um equipamento da lista para visualizar os dados.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          input[type="datetime-local"] {
            font-size: 16px;
          }
        }

        * {
          box-sizing: border-box;
        }

        input:focus, select:focus, button:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        button:hover {
          transform: translateY(-2px);
        }

        body {
          background: #f8fafc;
          margin: 0;
          padding: 0;
        }

        /* Estilizando a barra de rolagem */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
