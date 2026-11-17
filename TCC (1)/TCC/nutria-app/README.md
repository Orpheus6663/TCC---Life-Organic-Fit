# NutriIA — app React Native

## Executar o aplicativo

Na pasta `nutria-app`, inicie o Expo e abra o projeto no emulador Android:

```bash
npm start
```

## Ligar ao assistente Python

O app envia `POST http://10.0.2.2:8000/chat` com `{ "mensagem": "..." }`. Esse endereço é o IP especial que o emulador Android usa para acessar o computador host.

Em outro terminal, na pasta principal do projeto (a pasta que contém `assistente.py` e `api.py`), prepare e inicie a API:

```bash
python -m pip install ollama
ollama pull qwen3:0.6b
python api.py
```

Deixe esse terminal aberto enquanto usa o app. O serviço Ollama também precisa estar ativo no computador. A API escuta na porta `8000`.
