#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SingStudio - 高可用性本機伺服器 (Robust Multi-Threaded Local Server)
功能：
1. 多線程靜態檔案伺服器 (ThreadingTCPServer) - 支援高併發、客戶端斷開不中斷
2. YouTube 免費直連搜尋代理 (/api/yt/search?q=...) - 免 API Key、解析 ytInitialData
3. 自動靜默處理 /favicon.ico 與連線重設 (WinError 10054)
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import re
import sys
import os
import time

PORT = 8088

if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    DIRECTORY = sys._MEIPASS
    BASE_DIR = os.path.dirname(sys.executable)
else:
    DIRECTORY = os.path.dirname(os.path.abspath(__file__))
    BASE_DIR = DIRECTORY

TEMP_DIR = os.path.join(BASE_DIR, "temp_recordings")
os.makedirs(TEMP_DIR, exist_ok=True)

class SingStudioHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            
            # 靜音處理 favicon.ico
            if parsed.path == '/favicon.ico':
                self.send_response(204)
                self.end_headers()
                return

            # YouTube 搜尋端點
            if parsed.path == '/api/yt/search':
                self.handle_yt_search(parsed.query)
                return

            # 預設首頁導向
            if parsed.path == '/' or parsed.path == '':
                self.path = '/index.html'

            return super().do_GET()
        except (ConnectionResetError, BrokenPipeError):
            pass

    def handle_yt_search(self, query_string):
        params = urllib.parse.parse_qs(query_string)
        query = params.get('q', [''])[0].strip()

        if not query:
            self.send_json_response(400, {'error': 'Missing query parameter q'})
            return

        try:
            search_url = 'https://www.youtube.com/results?search_query=' + urllib.parse.quote(query)
            req = urllib.request.Request(search_url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
            })

            with urllib.request.urlopen(req, timeout=10) as resp:
                html = resp.read().decode('utf-8', errors='ignore')

            results = []
            match = re.search(r'var ytInitialData\s*=\s*({.+?});</script>', html)
            if match:
                data = json.loads(match.group(1))
                contents = data.get('contents', {}).get('twoColumnSearchResultsRenderer', {}).get('primaryContents', {}).get('sectionListRenderer', {}).get('contents', [])
                for sec in contents:
                    items = sec.get('itemSectionRenderer', {}).get('contents', [])
                    for it in items:
                        if 'videoRenderer' in it:
                            vr = it['videoRenderer']
                            vid = vr.get('videoId')
                            title = vr.get('title', {}).get('runs', [{}])[0].get('text', '')
                            duration = vr.get('lengthText', {}).get('simpleText', '')
                            channel = vr.get('ownerText', {}).get('runs', [{}])[0].get('text', '')
                            if vid and title:
                                results.append({
                                    'id': vid,
                                    'title': title,
                                    'duration': duration,
                                    'channel': channel
                                })

            if not results:
                vids = re.findall(r'/watch\?v=([a-zA-Z0-9_-]{11})', html)
                unique_vids = list(dict.fromkeys(vids))
                for vid in unique_vids[:10]:
                    results.append({
                        'id': vid,
                        'title': f'YouTube 影片 ({vid})',
                        'duration': '未知',
                        'channel': 'YouTube'
                    })

            self.send_json_response(200, results[:15])

        except Exception as e:
            self.send_json_response(500, {'error': str(e)})

    def send_json_response(self, code, data):
        try:
            body = json.dumps(data, ensure_ascii=False).encode('utf-8')
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
        except (ConnectionResetError, BrokenPipeError):
            pass

    def log_message(self, format, *args):
        # 保持日誌清爽，忽略 204 與 304 雜訊
        if len(args) >= 2 and (args[1] == '204' or args[1] == '304'):
            return
        sys.stderr.write(f"[SingStudio Server] {args[0]} {args[1]}\n")

class RobustThreadingServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def handle_error(self, request, client_address):
        # 吞掉客戶端主動斷開連線產生的 WinError 10054，防止伺服器崩潰
        pass

if __name__ == '__main__':
    print(f"==================================================")
    print(f"SingStudio 高可用伺服器啟動中: http://localhost:{PORT}")
    print(f"==================================================")

    import threading
    import webbrowser
    def auto_open_browser():
        time.sleep(1.2)
        try:
            webbrowser.open(f"http://localhost:{PORT}")
        except Exception:
            pass
    threading.Thread(target=auto_open_browser, daemon=True).start()

    while True:
        try:
            with RobustThreadingServer(("", PORT), SingStudioHandler) as httpd:
                print(f"伺服器已就緒 (多線程守護模式): http://localhost:{PORT}")
                httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n伺服器已正常停止")
            break
        except Exception as err:
            sys.stderr.write(f"伺服器重啟保護中: {err}\n")
            time.sleep(1)
