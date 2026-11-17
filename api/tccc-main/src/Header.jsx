function Header({ quantidade, conexao, tema, alternarTema }) {
  const rotuloConexao = {
    verificando: "Conectando...",
    conectado: "Catálogo atualizado",
    desconectado: "Supabase não configurado",
    erro: "Falha ao carregar catálogo",
  }[conexao];

  return (
    <header className="topbar">
      <a className="marca" href="#topo" aria-label="Empório das Bonecas, início">
        <span className="marca-icone" aria-hidden="true">✿</span>
        <span>Empório <strong>das Bonecas</strong></span>
      </a>
      <nav className="navegacao" aria-label="Navegação principal">
        <a href="#produtos">Produtos</a>
        <a href="#contato">Fale conosco</a>
      </nav>
      <div className="topbar-acoes">
        <span className={`status status-${conexao}`}><span className="status-ponto" />{rotuloConexao}</span>
        <button className="tema-botao" onClick={alternarTema} aria-label={`Mudar para tema ${tema === "claro" ? "escuro" : "claro"}`}>
          {tema === "claro" ? "☾" : "☀"}
          <span>{tema === "claro" ? "Escuro" : "Claro"}</span>
        </button>
        <a className="carrinho" href="#produtos" aria-label={`${quantidade} itens no carrinho`}>
          <span aria-hidden="true">♡</span> Carrinho <b>{quantidade}</b>
        </a>
      </div>
    </header>
  );
}

export default Header;
