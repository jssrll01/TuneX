#!/usr/bin/env python3
# Local server for TuneX (the YouTube player needs http://, not file://).
import http.server, socketserver, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 8080
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), H) as s:
    print("TuneX running: open http://localhost:%d in Chrome (Ctrl+C to stop)" % PORT)
    s.serve_forever()
