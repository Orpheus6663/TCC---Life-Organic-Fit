import { useEffect, useState } from "react";
import "./App.css";
import Content from "./Content";
import Header from "./Header";
import { supabase, supabaseConfigurado } from "./supabaseClient";

function App() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [conexao, setConexao] = useState("verificando");
  const [tema, setTema] = useState(() => localStorage.getItem("tema") || "claro");

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem("tema", tema);
  }, [tema]);

  useEffect(() => {
    async function buscarProdutos() {
      if (!supabaseConfigurado) {
        setErro("Configure as variáveis do Supabase no arquivo .env.local.");
        setConexao("desconectado");
        setCarregando(false);
        return;
      }

      const { data, error } = await supabase.from("produtos").select("*");
      if (error) {
        setErro(`Não foi possível carregar os produtos: ${error.message}`);
        setConexao("erro");
      } else {
        setProdutos(data ?? []);
        setErro("");
        setConexao("conectado");
      }
      setCarregando(false);
    }

    buscarProdutos();
  }, []);

  function adicionarProduto(produto) {
    setCarrinho((itens) => [...itens, produto]);
  }

  return (
    <div className="app" id="topo">
      <Header
        quantidade={carrinho.length}
        conexao={conexao}
        tema={tema}
        alternarTema={() => setTema((atual) => atual === "claro" ? "escuro" : "claro")}
      />
      <main>
        <section className="hero">
          <p className="eyebrow">FEITO COM CARINHO</p>
          <h2>Um mundo de encanto para descobrir</h2>
          <p>Encontre sua próxima boneca favorita na nossa lojinha.</p>
          <a className="hero-link" href="#produtos">Ver produtos <span aria-hidden="true">↓</span></a>
        </section>
        {erro && <p className="mensagem erro" role="alert">{erro}</p>}
        <Content
          produtos={produtos}
          carregando={carregando}
          adicionarProduto={adicionarProduto}
        />
      </main>
      <section className="contato" id="contato">
        <h2>Fale conosco</h2>
        <p>Tem alguma dúvida? Estamos aqui para ajudar.</p>
      </section>
      <footer>Empório das Bonecas <span>•</span> Feito com carinho</footer>
    </div>
  );
}

export default App;
