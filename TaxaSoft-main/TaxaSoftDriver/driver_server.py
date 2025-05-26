from http.server import HTTPServer, SimpleHTTPRequestHandler
import mysql.connector
import json

class DriverAppHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            connection = mysql.connector.connect(
                host='localhost',
                database='taxasoft2',
                user='root'
            )
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, username, role 
                FROM users 
                WHERE username = %s AND password = %s
            """, (data['username'], data['password']))
            user = cursor.fetchone()
            
            if user:
                self.send_json_response(200, {
                    'success': True,
                    'user_id': user['id'],
                    'role': user['role']
                })
            else:
                self.send_json_response(200, {'success': False})

    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

def run_server():
    server_address = ('', 8001)
    httpd = HTTPServer(server_address, DriverAppHandler)
    print('Fahrer-App Server läuft auf Port 8001')
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
