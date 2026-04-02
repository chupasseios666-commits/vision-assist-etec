import { useState, useRef } from 'react'
import { GoogleGenerativeAI } from "@google/generative-ai";

function App() {
  const [imagem, setImagem] = useState(null);
  const [imagemBase64, setImagemBase64] = useState(null);
  const [resultado, setResultado] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [bloqueio, setBloqueio] = useState(false);
  
  // ACESSIBILIDADE
  const [velocidade, setVelocidade] = useState(1.0);
  const [altoContraste, setAltoContraste] = useState(false);
  const [historico, setHistorico] = useState([]);

  const fileInputRef = useRef(null);
  const API_KEY = import.meta.env.VITE_GEMINI_KEY; 

  const pararAudio = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };

  const falarTexto = (texto) => {
    if ('speechSynthesis' in window) {
      pararAudio();
      const mensagem = new SpeechSynthesisUtterance(texto);
      mensagem.lang = "pt-BR";
      mensagem.rate = velocidade;
      window.speechSynthesis.speak(mensagem);
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagem(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemBase64(reader.result.split(',')[1]);
        setResultado("");
        pararAudio();
      };
      reader.readAsDataURL(file);
    }
  };

  async function analisarImagem() {
    if (!imagemBase64 || carregando || bloqueio) return;
    setCarregando(true);
    setResultado("");
    pararAudio();

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const result = await model.generateContent([
        "Descreva este objeto em português de forma clara e breve (máximo 3 linhas).",
        { inlineData: { data: imagemBase64, mimeType: "image/jpeg" } },
      ]);
      const texto = result.response.text();
      setResultado(texto);
      falarTexto(texto);
      setHistorico(prev => [texto, ...prev].slice(0, 3));
    } catch (e) {
      setResultado("ERRO NA CONEXÃO. TENTE NOVAMENTE.");
    } finally {
      setCarregando(false);
      setBloqueio(true);
      setTimeout(() => setBloqueio(false), 3000);
    }
  }

  // Definição das cores para alternar entre Alto Contraste e Padrão
  const tema = {
    bg: altoContraste ? "bg-black" : "bg-slate-100",
    texto: altoContraste ? "text-yellow-400" : "text-slate-900",
    card: altoContraste ? "bg-black border-yellow-400 border-4" : "bg-white border-slate-200 border-2 shadow-xl",
    botao: altoContraste ? "bg-yellow-400 text-black" : "bg-blue-700 text-white",
    spinner: altoContraste ? "text-yellow-400" : "text-blue-700"
  };

  return (
    <div className={`min-h-screen p-4 md:p-10 flex flex-col items-center ${tema.bg} ${tema.texto} transition-colors`}>

      {/* PAINEL DE ACESSIBILIDADE */}
      <div className={`w-full max-w-2xl p-6 rounded-3xl mb-8 flex flex-wrap items-center justify-between gap-6 ${tema.card}`}>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black uppercase">Velocidade da Voz: {velocidade}x</label>
          <input 
            type="range" min="0.5" max="2" step="0.1" value={velocidade} 
            onChange={(e) => setVelocidade(parseFloat(e.target.value))}
            className="w-48 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
        <button 
          onClick={() => setAltoContraste(!altoContraste)}
          className={`px-6 py-3 rounded-xl font-black text-xs uppercase border-2 ${altoContraste ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-slate-900 text-white border-slate-900'}`}
        >
          {altoContraste ? "Modo Padrão" : "Alto Contraste"}
        </button>
      </div>

      {/* TÍTULO CENTRALIZADO */}
      <header className="mb-10 text-center">
        <h1 className={`text-6xl font-black uppercase tracking-tighter italic ${altoContraste ? 'text-yellow-400' : 'text-blue-800'}`}>
          Vision Assist
        </h1>
        <p className="text-lg font-bold opacity-60 uppercase tracking-widest mt-2">Tecnologia Assistiva Inteligente</p>
      </header>

      {/* CARD PRINCIPAL */}
      <main className={`w-full max-w-2xl rounded-[3rem] overflow-hidden ${tema.card}`}>
        
        {/* ÁREA DE UPLOAD */}
        <div className={`p-8 border-b-2 ${altoContraste ? 'border-yellow-400 bg-black' : 'border-slate-100 bg-slate-50'}`}>
          <label className="block text-xs font-black mb-4 uppercase opacity-60 tracking-widest">1. Carregar imagem do objeto:</label>
          <button 
            onClick={() => fileInputRef.current.click()}
            className={`w-full h-24 rounded-2xl border-4 border-dashed flex items-center justify-center transition-all active:scale-95 ${altoContraste ? 'border-yellow-400' : 'border-blue-300 bg-blue-50'}`}
          >
            <span className="text-2xl font-black uppercase tracking-tighter">{imagem ? "Trocar Imagem" : "Selecionar Arquivo"}</span>
          </button>
          <input type="file" accept="image/*" onChange={handleUpload} ref={fileInputRef} className="hidden" />
        </div>

        {/* PREVIEW DA IMAGEM */}
        {imagem && (
          <div className="p-4 flex justify-center bg-black/5">
            <img src={imagem} alt="Objeto" className="max-h-64 rounded-2xl border-4 border-white shadow-md" />
          </div>
        )}

        {/* RESULTADO E CARREGAMENTO */}
        <div className="p-10 text-center min-h-[220px] flex flex-col justify-center">
          {carregando ? (
            <div className="flex flex-col items-center gap-4">
              <svg className={`animate-spin h-14 w-14 ${tema.spinner}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-2xl font-black uppercase italic animate-pulse">Processando dados...</span>
            </div>
          ) : (
            <>
              <p className="text-3xl md:text-4xl font-black leading-tight uppercase italic break-words mb-8">
                {resultado || "Aguardando entrada de imagem..."}
              </p>
              
              {resultado && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => falarTexto(resultado)} className={`flex-1 p-6 rounded-2xl font-black text-xl uppercase flex items-center justify-center gap-3 active:scale-95 ${altoContraste ? 'bg-yellow-400 text-black' : 'bg-slate-800 text-white'}`}>
                    <span className="text-4xl">🔊</span> Ouvir
                  </button>
                  <button onClick={pararAudio} className="flex-1 bg-red-600 text-white p-6 rounded-2xl font-black text-xl uppercase flex items-center justify-center gap-3 active:scale-95">
                    <span className="text-4xl">🛑</span> Parar
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* BOTÃO PRINCIPAL DE AÇÃO */}
        <div className="p-8 pt-0">
          <button 
            onClick={analisarImagem}
            disabled={carregando || !imagemBase64 || bloqueio}
            className={`w-full py-10 rounded-[2.5rem] font-black text-4xl uppercase transition-all shadow-2xl ${
              carregando || !imagemBase64 || bloqueio
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60' 
              : `${tema.botao} hover:scale-[1.02] active:scale-95`
            }`}
          >
            {bloqueio ? "Aguarde..." : "Analisar Agora"}
          </button>
        </div>
      </main>

      {/* HISTÓRICO DE SESSÃO */}
      {historico.length > 0 && (
        <div className={`w-full max-w-2xl mt-10 p-8 rounded-[3rem] ${tema.card}`}>
          <h3 className="text-xs font-black uppercase mb-6 tracking-widest opacity-60">Histórico de análise:</h3>
          <ul className="space-y-6">
            {historico.map((item, index) => (
              <li key={index} className={`border-l-8 pl-6 py-2 italic font-bold text-xl opacity-80 ${altoContraste ? 'border-yellow-400' : 'border-blue-600'}`}>
                "{item}"
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* RODAPÉ ACADÊMICO */}
      <footer className="mt-16 text-center opacity-40 text-[10px] font-black uppercase tracking-[0.4em] pb-10">
        TCC 2026  -  Etec de São Roque  -  Informática
      </footer>
    </div>
  );
}

export default App;