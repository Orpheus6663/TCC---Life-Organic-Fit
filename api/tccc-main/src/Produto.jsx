import CardProduto from "./CardProduto";

function Produtos ({ produtos, adicionarProdutos}) {
    return(
        <section>

        <h2>Produtos</h2>

        <div className="prdutos">
            {produtos.map((produto) => (
                <CardProduto
                
                    key={produto.id}
                    produto={produto}
                    adicionarProdutos={adicionarProdutos}
                
                />
            ))}
        </div>

        </section>
    );
}

export default Produtos
