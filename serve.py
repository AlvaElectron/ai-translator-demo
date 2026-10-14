"""体験版を、この PC だけで開くための小さなサーバー（Windows の Python は、.js を text/plain で配ってしまうため、種類を直す）。"""
import http.server
import socketserver
import sys
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".wasm": "application/wasm",
        ".json": "application/json",
        ".zip": "application/zip",
        ".html": "text/html; charset=utf-8",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


with Server(("127.0.0.1", PORT), Handler) as httpd:
    print(f"http://localhost:{PORT}/ で動いています。終わるときは、この画面を閉じてください。")
    httpd.serve_forever()