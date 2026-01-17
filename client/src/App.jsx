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
  const [activeTab, setActiveTab] = useState("chuva");

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

  // 🧮 FUNÇÃO PARA CALCULAR DELTA T
  const calcularDeltaT = (temp, umid) => {
    if (temp === null || umid === null) return null;
    const t = temp;
    const u = umid;
    const termo1 = t * Math.atan(0.151977 * Math.pow(u + 8.313659, 0.5));
    const termo2 = Math.atan(t + u);
    const termo3 = Math.atan(u - 1.676331);
    const termo4 = 0.00391838 * Math.pow(u, 1.5) * Math.atan(0.023101 * u);
    const resultado = t - ((termo1 + termo2) - termo3 + termo4 - 4.686035);
    return parseFloat(resultado.toFixed(2));
  };

  const agrupados = agruparPorHora(dados);
  const labels = agrupados.map(() => "");
  const temperatura = agrupados.map((d) => d.temperatura);
  const umidade = agrupados.map((d) => d.umidade);
  const chuva = agrupados.map((d) => d.chuva);
  
  // 📊 CALCULAR DELTA T PARA CADA PONTO
  const deltaT = agrupados.map((d) => calcularDeltaT(d.temperatura, d.umidade));

  // Configurações dos gráficos para dark mode
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        labels: {
          color: '#e2e8f0'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        titleFont: {
          size: isMobile ? 12 : 14
        },
        bodyFont: {
          size: isMobile ? 11 : 13
        },
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
        display: false,
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.2)'
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: isMobile ? 10 : 12
          },
          callback: function(value) {
            return value.toFixed(2);
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
          color: 'rgba(148, 163, 184, 0.2)'
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: isMobile ? 10 : 12
          },
          callback: function(value) {
            return value.toFixed(2);
          }
        }
      }
    }
  };

  // 🎨 CORES PARA OS GRÁFICOS
  const chartColors = {
    chuva: {
      border: "#60a5fa",
      background: "rgba(96, 165, 250, 0.8)"
    },
    temperatura: {
      border: "#f87171",
      background: "rgba(248, 113, 113, 0.1)"
    },
    umidade: {
      border: "#60a5fa",
      background: "rgba(96, 165, 250, 0.1)"
    },
    deltaT: {
      border: "#10b981", // Verde para Delta T
      background: "rgba(16, 185, 129, 0.1)"
    }
  };

  // Estilos DARK MODE com tema azul - OTIMIZADO
  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      padding: isMobile ? "10px" : "20px",
      fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      color: "#e2e8f0"
    },
    header: {
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "20px",
      padding: isMobile ? "20px" : "30px",
      marginBottom: isMobile ? "20px" : "30px",
      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(100, 116, 139, 0.2)"
    },
    headerContent: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile ? "flex-start" : "center",
      gap: "20px",
    },
    titleSection: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
    },
    logo: {
      fontSize: isMobile ? "2rem" : "2.5rem",
      background: "linear-gradient(135deg, #60a5fa, #3b82f6)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    title: {
      margin: 0,
      fontSize: isMobile ? "1.5rem" : "2rem",
      fontWeight: "700",
      background: "linear-gradient(135deg, #60a5fa, #3b82f6)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    subtitle: {
      margin: "8px 0 0 0",
      color: "#94a3b8",
      fontSize: isMobile ? "0.9rem" : "1rem",
      fontWeight: "400",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
      gap: "15px",
      width: isMobile ? "100%" : "auto",
    },
    statCard: {
      background: "linear-gradient(135deg, #1e40af, #3b82f6)",
      padding: isMobile ? "15px" : "20px",
      borderRadius: "15px",
      color: "white",
      textAlign: "center",
      boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
    },
    statCardDelta: {
      background: "linear-gradient(135deg, #047857, #10b981)",
      padding: isMobile ? "15px" : "20px",
      borderRadius: "15px",
      color: "white",
      textAlign: "center",
      boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
    },
    statValue: {
      fontSize: isMobile ? "1.3rem" : "1.6rem",
      fontWeight: "bold",
      marginBottom: "5px",
    },
    statLabel: {
      fontSize: isMobile ? "0.7rem" : "0.8rem",
      opacity: 0.9,
    },
    card: {
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "15px",
      padding: isMobile ? "20px" : "25px",
      marginBottom: isMobile ? "20px" : "25px",
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(100, 116, 139, 0.2)"
    },
    cardTitle: {
      margin: "0 0 20px 0",
      fontSize: isMobile ? "1.2rem" : "1.3rem",
      fontWeight: "600",
      color: "#e2e8f0",
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
      color: "#cbd5e1",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
    },
    input: {
      padding: "12px",
      border: "1px solid #475569",
      borderRadius: "8px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      backgroundColor: "#1e293b",
      color: "#e2e8f0",
      transition: "all 0.3s ease",
    },
    select: {
      padding: "12px",
      border: "1px solid #475569",
      borderRadius: "8px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      backgroundColor: "#1e293b",
      color: "#e2e8f0",
      cursor: "pointer",
      transition: "all 0.3s ease",
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
      transition: "all 0.3s ease",
      boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
    },
    secondaryButton: {
      padding: "12px 24px",
      background: "transparent",
      color: "#94a3b8",
      border: "1px solid #475569",
      borderRadius: "8px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      flex: isMobile ? "1" : "none",
      transition: "all 0.3s ease",
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
      border: "1px solid #475569",
      borderRadius: "8px",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      cursor: "pointer",
      textAlign: "center",
      flex: isMobile ? "1" : "none",
      transition: "all 0.3s ease",
      fontWeight: "500",
      color: "#94a3b8",
    },
    quickFilterActive: {
      background: "linear-gradient(135deg, #1e40af, #3b82f6)",
      color: "white",
      borderColor: "transparent",
      boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
    },
    loading: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "20px",
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "10px",
      color: "#94a3b8",
      justifyContent: "center",
      fontSize: isMobile ? "0.9rem" : "1rem",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
      border: "1px solid rgba(100, 116, 139, 0.2)"
    },
    spinner: {
      width: "20px",
      height: "20px",
      border: "2px solid #475569",
      borderTop: "2px solid #3b82f6",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
    error: {
      padding: "16px",
      background: "rgba(239, 68, 68, 0.1)",
      border: "1px solid #dc2626",
      borderRadius: "10px",
      color: "#fca5a5",
      textAlign: "center",
      fontSize: isMobile ? "0.9rem" : "1rem",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
    },
    emptyState: {
      textAlign: "center",
      padding: "50px 20px",
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "15px",
      color: "#94a3b8",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
      border: "1px solid rgba(100, 116, 139, 0.2)"
    },
    tabsContainer: {
      display: "flex",
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "12px",
      padding: "5px",
      marginBottom: "20px",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
      border: "1px solid rgba(100, 116, 139, 0.2)"
    },
    tab: {
      flex: 1,
      padding: "12px 16px",
      textAlign: "center",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      fontWeight: "500",
      fontSize: isMobile ? "0.85rem" : "0.9rem",
      color: "#94a3b8",
    },
    activeTab: {
      background: "linear-gradient(135deg, #1e40af, #3b82f6)",
      color: "white",
      boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
    },
    chartCard: {
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "15px",
      padding: isMobile ? "15px 20px" : "20px 25px",
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
      height: isMobile ? "380px" : "420px",
      marginBottom: isMobile ? "20px" : "25px",
      minHeight: "380px",
      border: "1px solid rgba(100, 116, 139, 0.2)",
      display: "flex",
      flexDirection: "column",
    },
    chartHeader: {
      marginBottom: "12px",
      textAlign: "center",
      flexShrink: 0,
    },
    chartTitle: {
      margin: 0,
      fontSize: isMobile ? "1.1rem" : "1.2rem",
      fontWeight: "600",
      color: "#e2e8f0",
    },
    chartContainer: {
      flex: 1,
      minHeight: 0,
      position: "relative",
    },
    chartsSection: {
      marginBottom: isMobile ? "20px" : "30px",
    },
    summaryCard: {
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "15px",
      padding: isMobile ? "20px" : "25px",
      marginBottom: isMobile ? "20px" : "25px",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(100, 116, 139, 0.2)"
    }
  };

  // Função para renderizar o gráfico ativo com cores azuis
  const renderActiveChart = () => {
    switch (activeTab) {
      case "chuva":
        return (
          <Bar
            data={{
              labels,
              datasets: [
                {
                  label: "Chuva por hora (mm)",
                  data: chuva,
                  backgroundColor: chartColors.chuva.background,
                  borderColor: chartColors.chuva.border,
                  borderWidth: 2,
                  borderRadius: 6,
                },
              ],
            }}
            options={barOptions}
          />
        );
      case "temperatura":
        return (
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Temperatura (°C)",
                  data: temperatura,
                  borderColor: chartColors.temperatura.border,
                  backgroundColor: chartColors.temperatura.background,
                  borderWidth: 3,
                  tension: 0.4,
                  fill: true,
                },
              ],
            }}
            options={chartOptions}
          />
        );
      case "umidade":
        return (
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Umidade (%)",
                  data: umidade,
                  borderColor: chartColors.umidade.border,
                  backgroundColor: chartColors.umidade.background,
                  borderWidth: 3,
                  tension: 0.4,
                  fill: true,
                },
              ],
            }}
            options={chartOptions}
          />
        );
      case "deltaT":
        return (
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Delta T (°C)",
                  data: deltaT,
                  borderColor: chartColors.deltaT.border,
                  backgroundColor: chartColors.deltaT.background,
                  borderWidth: 3,
                  tension: 0.4,
                  fill: true,
                },
              ],
            }}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                tooltip: {
                  ...chartOptions.plugins.tooltip,
                  callbacks: {
                    ...chartOptions.plugins.tooltip.callbacks,
                    label: (context) => {
                      const index = context.dataIndex;
                      const deltaTValue = deltaT[index];
                      const temp = temperatura[index];
                      const umid = umidade[index];
                      return [
                        `Delta T: ${deltaTValue.toFixed(2)}°C`,
                        `Temp: ${temp.toFixed(2)}°C`,
                        `Umid: ${umid.toFixed(2)}%`
                      ];
                    }
                  }
                }
              },
              scales: {
                ...chartOptions.scales,
                y: {
                  ...chartOptions.scales.y,
                  title: {
                    display: true,
                    text: 'Delta T (°C)',
                    color: '#94a3b8',
                    font: {
                      size: isMobile ? 11 : 13
                    }
                  }
                }
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  // 📊 CALCULAR VALORES MÉDIOS PARA O RESUMO
  const temperaturaMedia = agrupados.length > 0 
    ? (agrupados.reduce((sum, d) => sum + d.temperatura, 0) / agrupados.length).toFixed(2)
    : "0.00";
  
  const umidadeMedia = agrupados.length > 0 
    ? (agrupados.reduce((sum, d) => sum + d.umidade, 0) / agrupados.length).toFixed(2)
    : "0.00";
  
  const deltaTMedia = agrupados.length > 0 
    ? (deltaT.reduce((sum, d) => sum + (d || 0), 0) / deltaT.filter(d => d !== null).length).toFixed(2)
    : "0.00";

  return (
    <div style={styles.container}>
      {/* 🎯 HEADER ELEGANTE - DARK MODE */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <div style={styles.titleSection}>
              <div style={styles.logo}>🌦️</div>
              <div>
                <h1 style={styles.title}>Fazenda Ribeirão Preto</h1>
                <p style={styles.subtitle}>Monitoramento Meteorológico</p>
              </div>
            </div>
          </div>
          
          {!loading && !erro && agrupados.length > 0 && (
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{totalChuva.toFixed(2)} mm</div>
                <div style={styles.statLabel}>Total de Chuva</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{temperaturaMedia}°C</div>
                <div style={styles.statLabel}>Temp. Média</div>
              </div>
              <div style={styles.statCardDelta}>
                <div style={styles.statValue}>{deltaTMedia}°C</div>
                <div style={styles.statLabel}>Delta T Médio</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 🎛️ PAINEL DE CONTROLE - DARK MODE */}
      <div style={styles.card}>
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
                onFocus={(e) => e.target.style.borderColor = "#60a5fa"}
                onBlur={(e) => e.target.style.borderColor = "#475569"}
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
              onFocus={(e) => e.target.style.borderColor = "#60a5fa"}
              onBlur={(e) => e.target.style.borderColor = "#475569"}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>📅 Data Final</label>
            <input
              type="datetime-local"
              style={styles.input}
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = "#60a5fa"}
              onBlur={(e) => e.target.style.borderColor = "#475569"}
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
            onMouseOver={(e) => e.target.style.backgroundColor = "#374151"}
            onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
          >
            🗑️ Limpar Filtros
          </button>
        </div>
      </div>

      {/* ⏱️ FILTROS RÁPIDOS - DARK MODE */}
      <div style={styles.card}>
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
              onMouseOver={(e) => !styles.quickFilterActive.backgroundColor && (e.target.style.backgroundColor = "#374151")}
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

      {/* 📊 STATUS E ERROS - DARK MODE */}
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
            <h3 style={{ marginBottom: "10px", color: "#e2e8f0" }}>Nenhum dado encontrado</h3>
            <p style={{ margin: 0 }}>Não há dados disponíveis para os filtros selecionados.</p>
          </div>
        )}

        {!equipamento && !loadingEquipamentos && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: "4rem", marginBottom: "15px" }}>📡</div>
            <h3 style={{ marginBottom: "10px", color: "#e2e8f0" }}>Selecione um equipamento</h3>
            <p style={{ margin: 0 }}>Escolha um equipamento da lista para visualizar os dados.</p>
          </div>
        )}
      </div>

      {/* 📈 GRÁFICOS COM ABAS - DARK MODE OTIMIZADO */}
      {agrupados.length > 0 && (
        <div style={styles.chartsSection}>
          {/* ABAS DE NAVEGAÇÃO - AGORA COM 4 OPÇÕES */}
          <div style={styles.tabsContainer}>
            {[
              { id: "chuva", label: "🌧️ Chuva", emoji: "🌧️" },
              { id: "temperatura", label: "🌡️ Temperatura", emoji: "🌡️" },
              { id: "umidade", label: "💧 Umidade", emoji: "💧" },
              { id: "deltaT", label: "ΔT Delta T", emoji: "ΔT" }
            ].map((tab) => (
              <div
                key={tab.id}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab.id ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab(tab.id)}
                onMouseOver={(e) => activeTab !== tab.id && (e.target.style.backgroundColor = "#374151")}
                onMouseOut={(e) => activeTab !== tab.id && (e.target.style.backgroundColor = "transparent")}
              >
                {isMobile ? tab.emoji : tab.label}
              </div>
            ))}
          </div>

          {/* GRÁFICO ATIVO - LAYOUT OTIMIZADO */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>
                {activeTab === "chuva" && "🌧️ Precipitação por Hora (mm)"}
                {activeTab === "temperatura" && "🌡️ Temperatura (°C)"}
                {activeTab === "umidade" && "💧 Umidade Relativa (%)"}
                {activeTab === "deltaT" && "ΔT Diferença de Temperatura (°C)"}
              </h3>
            </div>
            <div style={styles.chartContainer}>
              {renderActiveChart()}
            </div>
          </div>

          {/* 🗓️ INFORMAÇÕES DO PERÍODO - COM DADOS DE DELTA T */}
          <div style={styles.summaryCard}>
            <h3 style={styles.cardTitle}>📊 Resumo do Período</h3>
            <div style={{ 
              background: "linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(59, 130, 246, 0.1))", 
              padding: "20px", 
              borderRadius: "12px",
              fontSize: isMobile ? "0.85rem" : "0.95rem",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              color: "#cbd5e1"
            }}>
              {agrupados.length > 0 && (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", 
                  gap: "15px" 
                }}>
                  <div><strong>📡 Equipamento:</strong> {equipamento}</div>
                  <div><strong>📊 Período:</strong> {periodo === "24h" ? "Últimas 24h" : 
                     periodo === "7d" ? "Última semana" : 
                     "Último mês"}</div>
                  <div><strong>🕐 Registros:</strong> {agrupados.length} horas</div>
                  <div><strong>🌡️ Temp. Média:</strong> {temperaturaMedia}°C</div>
                  <div><strong>💧 Umidade Média:</strong> {umidadeMedia}%</div>
                  <div><strong>ΔT Médio:</strong> {deltaTMedia}°C</div>
                  <div><strong>🌧️ Chuva Total:</strong> {totalChuva.toFixed(2)} mm</div>
                  <div><strong>📅 Início:</strong> {new Date(agrupados[0].hora).toLocaleDateString('pt-BR')}</div>
                  <div><strong>📅 Fim:</strong> {new Date(agrupados[agrupados.length - 1].hora).toLocaleDateString('pt-BR')}</div>
                </div>
              )}
              {activeTab === "deltaT" && (
                <div style={{ 
                  marginTop: "15px", 
                  padding: "10px", 
                  background: "rgba(16, 185, 129, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(16, 185, 129, 0.3)"
                }}>
                  <small style={{ color: "#10b981" }}>
                    <strong>💡 Sobre Delta T:</strong> Diferença entre temperatura do bulbo seco e bulbo úmido. 
                    Valores acima de 8°C indicam condições favoráveis para aplicação de defensivos.
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
        }

        button:hover {
          transform: translateY(-1px);
        }

        body {
          background: #0f172a;
          margin: 0;
          padding: 0;
        }

        /* Estilos para o tooltip do Delta T */
        .chartjs-tooltip {
          max-width: 250px;
        }
      `}</style>
    </div>
  );
}
