function Content({ produtos, carregando, adicionarProduto }) {
  return (
    <section className="catalogo" id="produtos">
      <div className="secao-cabecalho">
        <div>
          <p className="eyebrow">NOSSA COLEÇÃO</p>
          <h2>Produtos em destaque</h2>
        </div>
        {!carregando && <span className="contador-produtos">{produtos.length} {produtos.length === 1 ? "produto" : "produtos"}</span>}
      </div>

      {carregando ? (
        <p className="mensagem">Carregando produtos...</p>
      ) : produtos.length === 0 ? (
        <div className="vazio">
          <span aria-hidden="true">✿</span>
          <h3>A coleção está chegando</h3>
          <p>Assim que os produtos forem cadastrados, eles aparecerão aqui.</p>
        </div>
      ) : (
        <div className="produtos">
          {produtos.map((produto) => (
            <article className="produto" key={produto.id}>
              <div className="produto-imagem">
                {(produto.imgUrl || produto.imagem_url) ? (
                  <img src={produto.imgUrl || produto.imagem_url} alt={produto.nome} loading="lazy" />
                ) : <span aria-hidden="true">✿</span>}
                {Number(produto.estoque) <= 0 && <span className="esgotado">Esgotado</span>}
              </div>
              <div className="produto-info">
                <h3>{produto.nome}</h3>
                {produto.descricao && <p className="descricao">{produto.descricao}</p>}
                <p className="preco">R$ {Number(produto.preco).toFixed(2).replace(".", ",")}</p>
                <button
                  onClick={() => adicionarProduto(produto)}
                  disabled={Number(produto.estoque) <= 0}
                >
                  {Number(produto.estoque) > 0 ? "Adicionar ao carrinho" : "Indisponível"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default Content;
