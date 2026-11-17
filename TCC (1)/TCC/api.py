"""API local para conectar o app React Native ao assistente Ollama."""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer

from assistente import responder


class Handler(BaseHTTPRequestHandler):
    def _headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._headers(204)

    def do_POST(self):
        if self.path != "/chat":
            self._headers(404)
            self.wfile.write(b'{"erro":"Rota nao encontrada"}')
            return
        try:
            tamanho = int(self.headers.get("Content-Length", "0"))
            dados = json.loads(self.rfile.read(tamanho).decode("utf-8"))
            # O app principal envia o histórico em `messages`; o campo `mensagem`
            # continua aceito para manter compatibilidade com o app NutriIA antigo.
            mensagens = dados.get("messages")
            mensagem = dados.get("mensagem", "")
            if mensagens is None and isinstance(mensagem, str) and mensagem.strip():
                mensagens = [{"role": "user", "content": mensagem.strip()}]
            if not isinstance(mensagens, list) or not mensagens:
                self._headers(400)
                self.wfile.write('{"message":"Envie uma conversa válida em messages."}'.encode())
                return
            texto = responder(mensagens)
            self._headers()
            self.wfile.write(json.dumps({"reply": texto, "resposta": texto}, ensure_ascii=False).encode("utf-8"))
        except Exception as erro:
            print(f"Erro ao responder: {erro}")
            self._headers(500)
            self.wfile.write(json.dumps({"message": "Não foi possível obter resposta do assistente."}, ensure_ascii=False).encode("utf-8"))

    def log_message(self, formato, *args):
        print(f"{self.address_string()} - {formato % args}")


if __name__ == "__main__":
    servidor = HTTPServer(("0.0.0.0", 8000), Handler)
    print("NutriIA API disponível na porta 8000. Ctrl+C para encerrar.")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nAPI encerrada.")
        servidor.server_close()
