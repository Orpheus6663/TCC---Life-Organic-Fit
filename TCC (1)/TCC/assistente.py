"""Lógica da NutriIA, compartilhada pelo terminal e pela API do aplicativo."""

import ollama


SISTEMA = """
Você é a NutriIA, uma assistente virtual focada em educação nutricional.

Seu objetivo é conversar com o usuário e explicar assuntos relacionados a alimentação,
nutrientes, proteínas, carboidratos, gorduras, vitaminas e minerais, hidratação,
hábitos alimentares e atividade física de forma geral.

Regras:
- Responda sempre em português do Brasil, com linguagem simples e amigável.
- Explique o motivo das respostas quando necessário e não invente informações.
- Não faça diagnósticos médicos nem prescreva dietas ou tratamentos personalizados.
- Não substitua um nutricionista ou médico. Recomende um profissional quando a
  situação exigir avaliação individual.
- Não faça comentários sobre aparência ou peso que incentivem insatisfação corporal.
""".strip()


def responder(conversa: str | list[dict[str, str]]) -> str:
    """Envia uma pergunta ou o histórico do chat ao modelo local Ollama."""
    historico = (
        [{"role": "user", "content": conversa}]
        if isinstance(conversa, str)
        else [
            {"role": mensagem["role"], "content": mensagem["content"].strip()}
            for mensagem in conversa
            if mensagem.get("role") in ("user", "assistant")
            and isinstance(mensagem.get("content"), str)
            and mensagem["content"].strip()
        ]
    )
    if not historico or historico[-1]["role"] != "user":
        raise ValueError("A conversa precisa terminar com uma mensagem do usuário.")

    resposta = ollama.chat(
        model="qwen3:0.6b",
        messages=[{"role": "system", "content": SISTEMA}, *historico],
    )
    return resposta["message"]["content"].strip()


if __name__ == "__main__":
    print("================================")
    print("            NUTRIA")
    print("     Assistente de Nutrição")
    print("================================")
    while True:
        pergunta = input("\nVocê: ").strip()
        if pergunta.lower() == "sair":
            print("\nNutriIA encerrada.")
            break
        if pergunta:
            print("\nNutriIA:")
            print(responder(pergunta))
    
