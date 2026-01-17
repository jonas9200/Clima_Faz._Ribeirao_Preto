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
  
  // Formatar labels para eixo X como na imagem
  const formatarLabelsX = () => {
    if (agrupados.length === 0) return [];
    
    // Se tiver poucos dados, mostra todos
    if (agrupados.length <= 9) {
      return agrupados.map((d) => {
        const date = new Date(d.hora);
        return date.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit'
        });
      });
    }
    
    // Senão, mostra pontos espaçados como na imagem
    const labels = [];
    const step = Math.max(1, Math.floor(agrupados.length / 9));
    
    for (let i = 0; i < agrupados.length; i += step) {
      const date = new Date(agrupados[i].hora);
      labels.push(date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit'
      }));
      if (labels.length >= 9) break;
    }
    
    return labels;
  };

  const labelsX = formatarLabelsX();
  const temperatura = agrupados.map((d) => d.temperatura);
  const umidade = agrupados.map((d) => d.umidade);
  const chuva = agrupados.map((d) => d.chuva);

  // Configuração do gráfico combinado com eixo Y duplo
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
          color: '#e2e8f0',
          font: {
            size: isMobile ? 11 : 13,
            family: "'Inter', sans-serif"
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1,
        titleFont: {
          size: isMobile ? 12 : 14,
          family: "'Inter', sans-serif"
        },
        bodyFont: {
          size: isMobile ? 11 : 13,
          family: "'Inter', sans-serif"
        },
        padding: 12,
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
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: isMobile ? 10 : 12,
            family: "'Inter', sans-serif"
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
          text: 'Chuva (mm) / Umidade (%)',
          color: '#94a3b8',
          font: {
            size: isMobile ? 11 : 13,
            family: "'Inter', sans-serif"
          }
        },
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: isMobile ? 10 : 12,
            family: "'Inter', sans-serif"
          },
          stepSize: 25,
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
          text: 'Temperatura (°C)',
          color: '#f87171',
          font: {
            size: isMobile ? 11 : 13,
            family: "'Inter', sans-serif"
          }
        },
        min: 0,
        max: Math.max(...temperatura.length > 0 ? temperatura : [0]) + 2,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#f87171',
          font: {
            size: isMobile ? 10 : 12,
            family: "'Inter', sans-serif"
          },
          stepSize: 2,
          callback: function(value) {
            return value;
          }
        }
      }
    }
  };

  // Dados para o gráfico combinado
  const combinedChartData = {
    labels: labelsX,
    datasets: [
      {
        label: "Chuva (mm)",
        data: chuva,
        type: 'bar',
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "#3b82f6",
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        label: "Umidade (%)",
        data: umidade,
        type: 'line',
        borderColor: "#60a5fa",
        backgroundColor: "rgba(96, 165, 250, 0.1)",
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: "Temperatura (°C)",
        data: temperatura,
        type: 'line',
        borderColor: "#f87171",
        backgroundColor: "transparent",
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#f87171",
        yAxisID: 'y1',
      }
    ]
  };

  // Estatísticas atuais (última leitura)
  const ultimaLeitura = agrupados.length > 0 ? agrupados[agrupados.length - 1] : null;
  const ultimaComunicacao = ultimaLeitura 
    ? new Date(ultimaLeitura.hora).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit'
      })
    : '--:--';

  // Estilos DARK MODE com layout profissional
  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      padding: isMobile ? "15px" : "30px",
      fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      color: "#e2e8f0"
    },
    // Header estilo profissional
    header: {
      marginBottom: isMobile ? "25px" : "35px",
      textAlign: "center"
    },
    mainTitle: {
      fontSize: isMobile ? "1.8rem" : "2.5rem",
      fontWeight: "700",
      background: "linear-gradient(135deg, #60a5fa, #3b82f6)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      margin: "0 0 8px 0",
      letterSpacing: "-0.5px"
    },
    subtitle: {
      fontSize: isMobile ? "1rem" : "1.2rem",
      color: "#94a3b8",
      fontWeight: "400",
      margin: "0 0 5px 0",
      opacity: 0.9
    },
    location: {
      fontSize: isMobile ? "0.9rem" : "1rem",
      color: "#60a5fa",
      fontWeight: "500",
      margin: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px"
    },
    // Cartões de status (botões da imagem)
    statusCards: {
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
      gap: "15px",
      marginBottom: isMobile ? "25px" : "30px"
    },
    statusCard: {
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "12px",
      padding: isMobile ? "20px" : "25px",
      textAlign: "center",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
      border: "1px solid rgba(100, 116, 139, 0.2)",
      transition: "all 0.3s ease",
      cursor: "pointer",
    },
    statusTitle: {
      fontSize: isMobile ? "0.8rem" : "0.9rem",
      color: "#94a3b8",
      fontWeight: "500",
      margin: "0 0 10px 0",
      textTransform: "uppercase",
      letterSpacing: "0.5px"
    },
    statusValue: {
      fontSize: isMobile ? "1.4rem" : "1.8rem",
      fontWeight: "700",
      color: "#e2e8f0",
      margin: "0"
    },
    statusTime: {
      fontSize: isMobile ? "0.7rem" : "0.8rem",
      color: "#60a5fa",
      fontWeight: "500",
      margin: "5px 0 0 0"
    },
    // Controles de filtro
    controlsCard: {
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "12px",
      padding: isMobile ? "20px" : "25px",
      marginBottom: isMobile ? "25px" : "30px",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
      border: "1px solid rgba(100, 116, 139, 0.2)"
    },
    controlsTitle: {
      fontSize: isMobile ? "1.1rem" : "1.2rem",
      fontWeight: "600",
      color: "#e2e8f0",
      margin: "0 0 20px 0",
      display: "flex",
      alignItems: "center",
      gap: "10px"
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
    // Gráfico principal
    chartContainer: {
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "12px",
      padding: isMobile ? "20px" : "25px",
      marginBottom: isMobile ? "25px" : "30px",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
      border: "1px solid rgba(100, 116, 139, 0.2)",
      height: isMobile ? "450px" : "500px",
    },
    chartTitle: {
      fontSize: isMobile ? "1.1rem" : "1.2rem",
      fontWeight: "600",
      color: "#e2e8f0",
      margin: "0 0 15px 0",
      display: "flex",
      alignItems: "center",
      gap: "10px"
    },
    chartInnerContainer: {
      height: isMobile ? "380px" : "420px",
      position: "relative",
    },
    // Filtros rápidos
    quickFilters: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: "12px",
      flexWrap: "wrap",
      marginBottom: "20px",
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
    // Estados de carregamento e erro
    loading: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "30px",
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "12px",
      color: "#94a3b8",
      justifyContent: "center",
      fontSize: isMobile ? "0.9rem" : "1rem",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
      border: "1px solid rgba(100, 116, 139, 0.2)",
      marginBottom: "20px"
    },
    spinner: {
      width: "24px",
      height: "24px",
      border: "3px solid #475569",
      borderTop: "3px solid #3b82f6",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
    error: {
      padding: "20px",
      background: "rgba(239, 68, 68, 0.1)",
      border: "1px solid #dc2626",
      borderRadius: "12px",
      color: "#fca5a5",
      textAlign: "center",
      fontSize: isMobile ? "0.9rem" : "1rem",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
      marginBottom: "20px"
    },
    emptyState: {
      textAlign: "center",
      padding: "60px 20px",
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "12px",
      color: "#94a3b8",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
      border: "1px solid rgba(100, 116, 139, 0.2)",
      marginBottom: "20px"
    },
    // Ícones e decorações
    icon: {
      fontSize: isMobile ? "1.2rem" : "1.5rem",
      marginRight: "8px"
    }
  };

  return (
    <div style={styles.container}>
      {/* 🎯 HEADER PROFISSIONAL */}
      <header style={styles.header}>
        <h1 style={styles.mainTitle}>Fazenda Ribeirão Preto</h1>
        <p style={styles.subtitle}>Monitoramento Meteorológico Profissional</p>
        <p style={styles.location}>
          <span>📍</span> Estação meteorológica Fazenda Ribeirão Preto
        </p>
      </header>

      {/* 📊 CARTÕES DE STATUS (BOTÕES DA IMAGEM) */}
      {!loading && !erro && agrupados.length > 0 && (
        <div style={styles.statusCards}>
          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>ÚLTIMA COMUNICAÇÃO</h3>
            <p style={styles.statusValue}>{ultimaComunicacao}</p>
          </div>
          
          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>TEMP. ATUAL</h3>
            <p style={styles.statusValue}>{ultimaLeitura?.temperatura.toFixed(1) || '--'}°C</p>
          </div>
          
          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>UMIDADE ATUAL</h3>
            <p style={styles.statusValue}>{ultimaLeitura?.umidade.toFixed(0) || '--'}%</p>
          </div>
          
          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>CHUVA ACUMULADA</h3>
            <p style={styles.statusValue}>{totalChuva.toFixed(1)}mm</p>
          </div>
        </div>
      )}

      {/* 🎛️ PAINEL DE CONTROLE */}
      <div style={styles.controlsCard}>
        <h3 style={styles.controlsTitle}>⚙️ Configurações da Estação</h3>
        
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>📡 Equipamento</label>
            {loadingEquipamentos ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

        {/* ⏱️ FILTROS RÁPIDOS */}
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

      {/* 📊 STATUS E ERROS */}
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
            <div style={{ fontSize: "4rem", marginBottom: "15px", opacity: 0.5 }}>📈</div>
            <h3 style={{ marginBottom: "10px", color: "#e2e8f0" }}>Nenhum dado encontrado</h3>
            <p style={{ margin: 0, color: "#94a3b8" }}>Não há dados disponíveis para os filtros selecionados.</p>
          </div>
        )}

        {!equipamento && !loadingEquipamentos && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: "4rem", marginBottom: "15px", opacity: 0.5 }}>📡</div>
            <h3 style={{ marginBottom: "10px", color: "#e2e8f0" }}>Selecione um equipamento</h3>
            <p style={{ margin: 0, color: "#94a3b8" }}>Escolha um equipamento da lista para visualizar os dados.</p>
          </div>
        )}
      </div>

      {/* 📈 GRÁFICO COMBINADO (CHUVA, TEMPERATURA, UMIDADE) */}
      {agrupados.length > 0 && (
        <div style={styles.chartContainer}>
          <h3 style={styles.chartTitle}>📊 Gráfico Meteorológico Combinado</h3>
          <div style={styles.chartInnerContainer}>
            <Line 
              data={combinedChartData} 
              options={chartOptions}
            />
          </div>
          <div style={{
            marginTop: "15px",
            fontSize: "0.85rem",
            color: "#94a3b8",
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "15px", height: "15px", backgroundColor: "#3b82f6", borderRadius: "3px" }}></div>
              <span>Chuva (mm)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "15px", height: "2px", backgroundColor: "#60a5fa" }}></div>
              <span>Umidade (%)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "15px", height: "2px", backgroundColor: "#f87171" }}></div>
              <span>Temperatura (°C)</span>
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
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        button:hover {
          transform: translateY(-1px);
        }

        body {
          background: #0f172a;
          margin: 0;
          padding: 0;
        }

        .status-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
          border-color: rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
}
