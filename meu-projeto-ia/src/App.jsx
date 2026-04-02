import { useState, useRef } from 'react'
import { GoogleGenerativeAI } from "@google/generative-ai";

function App() {
  const [imagem, setImagem] = useState(null);
  const [imagemBase64, setImagemBase64] = useState(null);
  const [resultado, setResultado] = useState("");
  const [carregando, setCarregando] = useState(false);
  const fileInputRef = useRef(null);

  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const falarTexto = (texto) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const mensagem = new SpeechSynthesisUtterance(texto);
      mensagem.lang = "pt-BR";
      mensagem.rate = 0.9; // Um pouco mais lento para melhor compreensão
      window.speechSynthesis.speak(mensagem);
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagem(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        setImagemBase64(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  async function analisarImagem() {
  if (!imagemBase64) return alert("Selecione uma imagem primeiro!");

  setCarregando(true);
  setResultado("Conectando aos servidores de IA...");

  const MINHA_CHAVE = import.meta.env.VITE_CHAVE_ACESSO

  // TENTE ESTES MODELOS NA ORDEM SE O PRIMEIRO FALHAR:
  // 1. "gemini-1.5-flash"
  // 2. "gemini-1.5-flash-latest" 
  // 3. "gemini-pro-vision" (antigo mas estável)
  const MODELO = "gemini-robotics-er-1.5-preview"; 

  // URL correta para v1beta (onde o 1.5 Flash mora)
  const URL_API = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${MINHA_CHAVE}`;

  // IMPORTANTE: Via Fetch (REST API), o Google exige snake_case (inline_data)
  const corpoDaRequisicao = {
    contents: [{
      parts: [
        { text: "Identifique o objeto e descreva-o em português de forma clara e breve e sem markdown (máximo 3 linhas)." },
        {
          inline_data: { // Note o underline aqui, é vital para o Fetch!
            mime_type: "image/jpeg", // Underline aqui também
            data: imagemBase64
          }
        }
      ]
    }]
  };

  try {
    const resposta = await fetch(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpoDaRequisicao)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      // Se der erro, vamos mostrar a mensagem REAL que o Google devolveu
      throw new Error(dados.error?.message || "Erro desconhecido");
    }

    if (dados.candidates && dados.candidates[0].content.parts[0].text) {
      const textoGerado = dados.candidates[0].content.parts[0].text;
      setResultado(textoGerado);
      falarTexto(textoGerado);
    } else {
      setResultado("O Google não conseguiu analisar esta imagem no momento.");
    }

  } catch (error) {
    console.error("ERRO:", error.message);
    
    // Se o erro for 404, sugere trocar o modelo
    if (error.message.includes("not found")) {
      setResultado("Erro: O modelo " + MODELO + " não foi encontrado na sua região. Tente mudar o nome do modelo no código.");
    } else {
      setResultado("Falha: " + error.message);
    }
  } finally {
    setCarregando(false);
  }
}

  return (
    // Fundo claro com alto contraste para leitura fácil
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-4 md:p-8 flex flex-col items-center">
      
      <header className="w-full max-w-2xl mb-8 border-b-4 border-blue-600 pb-4">
        <h1 className="text-4xl font-black text-blue-800 tracking-tight uppercase">
          Vision Assist
        </h1>
        <p className="text-xl font-bold text-slate-600 mt-1">
          Tecnologia Assistiva e Inclusiva
        </p>
      </header>

      <main className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden border-2 border-slate-200">
        
        {/* Seção de Upload - Grande e Intuitiva */}
        <div className="p-6 bg-slate-50 border-b-2 border-slate-100">
          <label className="block text-xl font-bold mb-4 text-slate-700">
            1. Carregar Foto ou Objeto:
          </label>
          <button 
            onClick={() => fileInputRef.current.click()}
            className="w-full h-24 border-4 border-dashed border-blue-300 rounded-xl flex items-center justify-center bg-blue-50 hover:bg-blue-100 transition-colors focus:ring-4 ring-blue-500 outline-none"
          >
            <span className="text-xl font-black text-blue-700 uppercase tracking-wide">Selecionar Imagem</span>
          </button>
          <input 
            type="file" 
            accept="image/*"
            onChange={handleUpload}
            ref={fileInputRef}
            className="hidden"
          />
        </div>

        {/* Preview da Imagem com Contraste */}
        {imagem && (
          <div className="p-6 bg-white flex justify-center">
            <div className="relative border-8 border-slate-100 rounded-lg overflow-hidden shadow-inner">
              <img src={imagem} alt="Objeto selecionado para análise" className="max-h-72 w-full object-contain" />
            </div>
          </div>
        )}

        {/* Área de Resultado - Foco Total no Texto */}
        <div className={`p-8 ${resultado ? 'bg-yellow-50' : 'bg-slate-50'} transition-colors`}>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4">
            Resultado da Descrição:
          </h2>
          
          <div className="min-h-[100px]">
            {carregando ? (
              <div className="flex items-center gap-4">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                <p className="text-2xl font-bold text-blue-800 italic">Processando...</p>
              </div>
            ) : (
              <p className="text-2xl md:text-3xl font-bold leading-tight text-slate-800">
                {resultado || "Aguardando imagem..."}
              </p>
            )}
          </div>

          {resultado && !carregando && (
            <button 
              onClick={() => falarTexto(resultado)}
              className="mt-8 flex items-center gap-3 bg-slate-800 text-white px-6 py-4 rounded-xl hover:bg-black transition-all active:scale-95 focus:ring-4 ring-slate-400"
            >
              <span className="text-3xl">🔊</span>
              <span className="text-xl font-black uppercase tracking-wider">Ouvir Novamente</span>
            </button>
          )}
        </div>

        {/* Botão de Ação Principal - Gigante e Chamativo */}
        <div className="p-6 bg-white">
          <button 
            onClick={analisarImagem}
            disabled={carregando || !imagemBase64}
            className={`w-full py-6 rounded-2xl font-black text-2xl uppercase tracking-tighter transition-all shadow-lg shadow-blue-200 ${
              carregando || !imagemBase64 
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 ring-offset-2 focus:ring-4 ring-blue-600'
            }`}
          >
            {carregando ? "Analisando..." : "Analisar Agora"}
          </button>
        </div>

      </main>

      <footer className="mt-12 text-center max-w-2xl">
        <div className="bg-blue-800 text-white p-4 rounded-lg inline-block shadow-md">
          <p className="font-bold text-sm tracking-widest uppercase">
            Sistema de Apoio Visual v2.0
          </p>
        </div>
        <p className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-widest leading-loose">
          Interface otimizada para alto contraste e leitores de tela.<br/>
          TCC 2026 - Tecnologia Assistiva.
        </p>
      </footer>
    </div>
  );
}

export default App;