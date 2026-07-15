"""Aurora demo static server — multi-threaded + no-cache headers so browsers
always load the latest files (avoids stale HTML/JS/CSS mismatches).
Serves this folder on port 8138."""
import http.server, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 8138

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

# ThreadingHTTPServer handles the browser's parallel connections (html/css/js in flight together)
http.server.ThreadingHTTPServer.allow_reuse_address = True
with http.server.ThreadingHTTPServer(('', PORT), Handler) as httpd:
    print(f"Aurora demo (threaded, no-cache) on http://localhost:{PORT}")
    httpd.serve_forever()
