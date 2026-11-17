

function CardProduto ({ produto, adicionarProduto }) {
    return (
        <div className="Card">
            <h3>{produto.nome}</h3>

            <p>
                R$ {produto.preco.toFixed(2)}
            </p>

            <button onClick={() => adicionarProduto(produto)}>
                adicionar ao carrinho
            </button>
        </div>
    );
}

export default CardProduto