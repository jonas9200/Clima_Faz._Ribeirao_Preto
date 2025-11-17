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
  
  // Estados para o mapa e cadastro de equipamentos
  const [showMap, setShowMap] = useState(false);
  const [novoEquipamento, setNovoEquipamento] = useState({
    nome: "",
    latitude: "",
    longitude: ""
  });
  const [cadastrando, setCadastrando] = useState(false);

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

  // 🔄 Aplicar filtro das 24h automaticamente quando equipamento estiver disponível
  useEffect(() => {
    if (equipamento && equipamento !== "") {
      setTimeout(() => {
        calcularPeriodoRapido("24h");
      }, 100);
    }
  }, [equipamento]);

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
      const listaPadrao = ["Pluviometro_01", "Pluviometro_02", "Estacao_Central"];
      setEquipamentos(listaPadrao);
      setEquipamento(listaPadrao[0]);
    } finally {
      setLoadingEquipamentos(false);
    }
  }

  // 🗺️ Funções para o mapa e cadastro de equipamentos
  const handleCadastrarEquipamento = async () => {
    if (!novoEquipamento.nome || !novoEquipamento.latitude || !novoEquipamento.longitude) {
      setErro("Preencha todos os campos para cadastrar o equipamento");
      return;
    }

    setCadastrando(true);
    try {
      // Simulação de cadastro - substitua pela sua API real
      const response = await fetch(`${baseUrl}/api/equipamentos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(novoEquipamento),
      });

      if (response.ok) {
        setNovoEquipamento({ nome: "", latitude: "", longitude: "" });
        setErro("");
        carregarEquipamentos();
        setShowMap(false);
        alert("Equipamento cadastrado com sucesso!");
      } else {
        throw new Error("Erro ao cadastrar equipamento");
      }
    } catch (error) {
      setErro("Erro ao cadastrar equipamento: " + error.message);
    } finally {
      setCadastrando(false);
    }
  };

  const handleMapClick = (e) => {
    if (!showMap) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calcula coordenadas baseadas na posição do clique
    const lat = (-14.2350 + ((y / rect.height) - 0.5) * 0.2).toFixed(6);
    const lng = (-51.9253 + ((x / rect.width) - 0.5) * 0.2).toFixed(6);
    
    setNovoEquipamento(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

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
    setTimeout(() => {
      calcularPeriodoRapido("24h");
    }, 100);
  }

  // 🧮 Agrupar por hora
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
  const labels = agrupados.map(() => "");
  const temperatura = agrupados.map((d) => d.temperatura);
  const umidade = agrupados.map((d) => d.umidade);
  const chuva = agrupados.map((d) => d.chuva);

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

  // Estilos DARK MODE com tema azul
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
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
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
    },
    // 🗺️ Estilos para o mapa
    mapCard: {
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "15px",
      padding: isMobile ? "20px" : "25px",
      marginBottom: isMobile ? "20px" : "25px",
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(100, 116, 139, 0.2)"
    },
    mapContainer: {
      position: "relative",
      width: "100%",
      height: isMobile ? "300px" : "400px",
      background: `
        linear-gradient(45deg, 
          #1e3a8a 0%, 
          #3b82f6 20%, 
          #60a5fa 40%, 
          #93c5fd 60%, 
          #bfdbfe 80%, 
          #dbeafe 100%
        )
      `,
      borderRadius: "12px",
      overflow: "hidden",
      border: "2px solid #475569",
      cursor: showMap ? "crosshair" : "default",
      marginBottom: "20px",
    },
    mapGrid: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundImage: `
        linear-gradient(rgba(30, 41, 59, 0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30, 41, 59, 0.3) 1px, transparent 1px)
      `,
      backgroundSize: "50px 50px",
    },
    mapOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: isMobile ? "1rem" : "1.2rem",
      fontWeight: "500",
      textAlign: "center",
      padding: "20px",
      background: showMap ? "rgba(30, 41, 59, 0.7)" : "rgba(30, 41, 59, 0.4)",
      transition: "all 0.3s ease",
    },
    mapMarker: {
      position: "absolute",
      width: "24px",
      height: "24px",
      background: "#ef4444",
      border: "3px solid white",
      borderRadius: "50%",
      transform: "translate(-50%, -50%)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      cursor: "pointer",
      zIndex: 10,
    },
    mapMarkerPulse: {
      position: "absolute",
      width: "40px",
      height: "40px",
      background: "rgba(239, 68, 68, 0.4)",
      borderRadius: "50%",
      transform: "translate(-50%, -50%)",
      animation: "pulse 1.5s infinite",
    },
    mapControls: {
      display: "flex",
      gap: "10px",
      marginBottom: "15px",
      flexWrap: "wrap",
    },
    mapForm: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
      gap: "15px",
      marginBottom: "20px",
    },
    equipmentList: {
      marginTop: "20px",
      padding: "15px",
      background: "rgba(30, 41, 59, 0.6)",
      borderRadius: "10px",
      border: "1px solid rgba(100, 116, 139, 0.2)"
    },
    equipmentItem: {
      padding: "10px 15px",
      marginBottom: "8px",
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "8px",
      border: "1px solid rgba(100, 116, 139, 0.3)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    coordinatesDisplay: {
      background: "rgba(30, 41, 59, 0.8)",
      padding: "10px 15px",
      borderRadius: "8px",
      border: "1px solid #475569",
      marginBottom: "15px",
      fontSize: "0.9rem",
      color: "#cbd5e1",
    },
    mapFeatures: {
      position: "absolute",
      width: "100%",
      height: "100%",
    },
    mapFeature: {
      position: "absolute",
      background: "rgba(34, 197, 94, 0.3)",
      border: "2px solid #22c55e",
      borderRadius: "8px",
      padding: "5px 10px",
      fontSize: "0.8rem",
      color: "white",
      fontWeight: "bold",
    },
    river: {
      position: "absolute",
      background: "rgba(59, 130, 246, 0.5)",
      borderRadius: "20px",
    }
  };

  // Função para renderizar o gráfico ativo
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
                  backgroundColor: "rgba(96, 165, 250, 0.8)",
                  borderColor: "#60a5fa",
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
                  borderColor: "#f87171",
                  backgroundColor: "rgba(248, 113, 113, 0.1)",
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
                  borderColor: "#60a5fa",
                  backgroundColor: "rgba(96, 165, 250, 0.1)",
                  borderWidth: 3,
                  tension: 0.4,
                  fill: true,
                },
              ],
            }}
            options={chartOptions}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* 🎯 HEADER */}
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
              {!isMobile && (
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{equipamento}</div>
                  <div style={styles.statLabel}>Equipamento</div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 🗺️ CARD DO MAPA */}
      <div style={styles.mapCard}>
        <h3 style={styles.cardTitle}>🗺️ Mapa de Equipamentos</h3>
        
        <div style={styles.mapControls}>
          <button 
            style={{
              ...styles.primaryButton,
              background: showMap ? "#ef4444" : "linear-gradient(135deg, #1e40af, #3b82f6)"
            }}
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? "❌ Cancelar Seleção" : "📍 Adicionar Equipamento no Mapa"}
          </button>
          
          {showMap && (
            <button 
              style={styles.secondaryButton}
              onClick={() => {
                setNovoEquipamento({ nome: "", latitude: "", longitude: "" });
              }}
            >
              🗑️ Limpar Localização
            </button>
          )}
        </div>

        {/* COORDENADAS SELECIONADAS */}
        {(novoEquipamento.latitude || novoEquipamento.longitude) && (
          <div style={styles.coordinatesDisplay}>
            <strong>📍 Coordenadas Selecionadas:</strong><br />
            Latitude: {novoEquipamento.latitude} | 
            Longitude: {novoEquipamento.longitude}
          </div>
        )}

        {/* MAPA INTERATIVO */}
        <div 
          style={styles.mapContainer}
          onClick={handleMapClick}
        >
          {/* Grade do mapa */}
          <div style={styles.mapGrid} />
          
          {/* Elementos do mapa */}
          <div style={styles.mapFeatures}>
            {/* Rio */}
            <div style={{
              ...styles.river,
              top: '30%',
              left: '10%',
              width: '80%',
              height: '40px',
              transform: 'rotate(-5deg)'
            }} />
            
            {/* Áreas da fazenda */}
            <div style={{
              ...styles.mapFeature,
              top: '20%',
              left: '20%',
              background: 'rgba(34, 197, 94, 0.4)'
            }}>🌾 Plantação</div>
            
            <div style={{
              ...styles.mapFeature,
              top: '60%',
              left: '60%',
              background: 'rgba(234, 179, 8, 0.4)'
            }}>🏠 Sede</div>
            
            <div style={{
              ...styles.mapFeature,
              top: '40%',
              left: '40%',
              background: 'rgba(168, 85, 247, 0.4)'
            }}>📡 Estação</div>
          </div>

          {/* Overlay com instruções */}
          {showMap && (
            <div style={styles.mapOverlay}>
              <div>
                <div style={{fontSize: "3rem", marginBottom: "10px"}}>📍</div>
                <div style={{fontSize: isMobile ? "1.1rem" : "1.3rem", marginBottom: "10px"}}>
                  Clique no mapa para selecionar a localização
                </div>
                <div style={{fontSize: "0.9rem", opacity: 0.8}}>
                  As coordenadas serão automaticamente preenchidas no formulário
                </div>
              </div>
            </div>
          )}

          {/* Marcador no mapa */}
          {novoEquipamento.latitude && novoEquipamento.longitude && (
            <>
              <div style={{
                ...styles.mapMarkerPulse,
                left: "50%",
                top: "50%"
              }} />
              <div 
                style={{
                  ...styles.mapMarker,
                  left: "50%",
                  top: "50%"
                }}
                title={`Lat: ${novoEquipamento.latitude}, Lng: ${novoEquipamento.longitude}`}
              />
            </>
          )}

          {/* Mensagem quando não está no modo de seleção */}
          {!showMap && !novoEquipamento.latitude && (
            <div style={styles.mapOverlay}>
              <div>
                <div style={{fontSize: "3rem", marginBottom: "10px"}}>🗺️</div>
                <div style={{fontSize: isMobile ? "1.1rem" : "1.3rem"}}>
                  Mapa da Fazenda Ribeirão Preto
                </div>
                <div style={{fontSize: "0.9rem", opacity: 0.8, marginTop: "10px"}}>
                  Clique em "Adicionar Equipamento" para posicionar um novo sensor
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FORMULÁRIO DE CADASTRO */}
        {showMap && (
          <div>
            <div style={styles.mapForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>📝 Nome do Equipamento</label>
                <input
                  type="text"
                  style={styles.input}
                  value={novoEquipamento.nome}
                  onChange={(e) => setNovoEquipamento(prev => ({...prev, nome: e.target.value}))}
                  placeholder="Ex: Pluviometro_01"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>📍 Latitude</label>
                <input
                  type="text"
                  style={styles.input}
                  value={novoEquipamento.latitude}
                  readOnly
                  placeholder="Clique no mapa para definir"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>📍 Longitude</label>
                <input
                  type="text"
                  style={styles.input}
                  value={novoEquipamento.longitude}
                  readOnly
                  placeholder="Clique no mapa para definir"
                />
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button 
                style={{
                  ...styles.primaryButton,
                  opacity: (!novoEquipamento.nome || !novoEquipamento.latitude) ? 0.6 : 1
                }}
                onClick={handleCadastrarEquipamento}
                disabled={cadastrando || !novoEquipamento.nome || !novoEquipamento.latitude}
              >
                {cadastrando ? (
                  <>
                    <div style={{...styles.spinner, width: "16px", height: "16px", marginRight: "8px"}}></div>
                    Cadastrando...
                  </>
                ) : (
                  "💾 Cadastrar Equipamento"
                )}
              </button>
            </div>
          </div>
        )}

        {/* LISTA DE EQUIPAMENTOS CADASTRADOS */}
        <div style={styles.equipmentList}>
          <h4 style={{...styles.cardTitle, marginBottom: "15px", fontSize: "1.1rem"}}>
            📋 Equipamentos Cadastrados ({equipamentos.length})
          </h4>
          {equipamentos.length === 0 ? (
            <div style={{textAlign: "center", padding: "20px", color: "#94a3b8"}}>
              Nenhum equipamento cadastrado ainda
            </div>
          ) : (
            equipamentos.map((eqp, index) => (
              <div key={index} style={styles.equipmentItem}>
                <span>📡 {eqp}</span>
                <button 
                  style={{
                    ...styles.secondaryButton,
                    padding: "6px 12px",
                    fontSize: "0.8rem"
                  }}
                  onClick={() => setEquipamento(eqp)}
                >
                  Selecionar
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 🎛️ PAINEL DE CONTROLE */}
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

      {/* ⏱️ FILTROS RÁPIDOS */}
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
              disabled={!equipamento}
            >
              {p === "24h" && "⏰ Últimas 24h"}
              {p === "7d" && "📅 Última Semana"}
              {p === "30d" && "📊 Último Mês"}
            </button>
          ))}
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

      {/* 📈 GRÁFICOS COM ABAS */}
      {agrupados.length > 0 && (
        <div style={styles.chartsSection}>
          {/* ABAS DE NAVEGAÇÃO */}
          <div style={styles.tabsContainer}>
            {[
              { id: "chuva", label: "🌧️ Chuva", emoji: "🌧️" },
              { id: "temperatura", label: "🌡️ Temperatura", emoji: "🌡️" },
              { id: "umidade", label: "💧 Umidade", emoji: "💧" }
            ].map((tab) => (
              <div
                key={tab.id}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab.id ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {isMobile ? tab.emoji : tab.label}
              </div>
            ))}
          </div>

          {/* GRÁFICO ATIVO */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>
                {activeTab === "chuva" && "🌧️ Precipitação por Hora (mm)"}
                {activeTab === "temperatura" && "🌡️ Temperatura (°C)"}
                {activeTab === "umidade" && "💧 Umidade Relativa (%)"}
              </h3>
            </div>
            <div style={styles.chartContainer}>
              {renderActiveChart()}
            </div>
          </div>

          {/* RESUMO DO PERÍODO */}
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
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
                  gap: "15px" 
                }}>
                  <div><strong>📡 Equipamento:</strong> {equipamento}</div>
                  <div><strong>🕐 Data Inicial:</strong> {new Date(agrupados[0].hora).toLocaleString('pt-BR')}</div>
                  <div><strong>🕐 Data Final:</strong> {new Date(agrupados[agrupados.length - 1].hora).toLocaleString('pt-BR')}</div>
                  <div><strong>🌧️ Chuva Total:</strong> {totalChuva.toFixed(2)} mm</div>
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
        
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
          }
          70% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
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
      `}</style>
    </div>
  );
}
