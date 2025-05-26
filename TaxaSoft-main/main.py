from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
from user_management import login, register
from map_functions import show_html_page
from database import create_connection, close_connection, insert_order, get_orders, delete_order, update_order

class RequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            if self.is_driver():
                self.path = '/driver.html'
            else:
                self.path = '/loginregister.html'
            return SimpleHTTPRequestHandler.do_GET(self)
        elif self.path == '/api/get_orders':
            self.handle_get_orders()
            return
        elif self.path == '/api/driver/status':
            self.handle_get_driver_status()
            return
        return SimpleHTTPRequestHandler.do_GET(self)

    def is_driver(self):
        # Hier können wir später Session-Management implementieren
        return False

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))

        if self.path == '/login':
            self.handle_login(data)
        elif self.path == '/register':
            self.handle_register(data)
        elif self.path == '/api/save_order':
            self.handle_save_order(data)
        elif self.path == '/api/driver/update':
            self.handle_driver_update(data)

    def handle_login(self, data):
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, username, role 
                FROM users 
                WHERE username = %s AND password = %s
            """, (data['username'], data['password']))
            user = cursor.fetchone()
            close_connection(connection)
            
            if user:
                response_data = {
                    'success': True,
                    'user_id': user['id'],
                    'role': user['role']
                }
                if user['role'] == 'Fahrer':
                    response_data['redirect'] = '/driver.html'
                else:
                    response_data['redirect'] = '/dashboard.html'
                self.send_json_response(200, response_data)
            else:
                self.send_json_response(200, {'success': False})
        else:
            self.send_json_response(500, {'success': False, 'error': 'Datenbankverbindung fehlgeschlagen'})

    def handle_register(self, data):
        success = register(data['username'], data['password'])
        self.send_json_response(200, {'success': success})

    def handle_save_order(self, data):
        connection = create_connection()
        if connection:
            order_id = insert_order(
                connection,
                data['customer_name'],
                data['order_date'],
                data['order_time'],
                data['pickup_address'],
                data['dropoff_address'],
                data['trip_type'],
                data['vehicle_type'],
                data['notes']
            )
            close_connection(connection)
            success = order_id is not None
            self.send_json_response(200, {'success': success, 'order_id': order_id})
        else:
            self.send_json_response(500, {'success': False, 'error': 'Datenbankverbindung fehlgeschlagen'})

    def handle_get_orders(self):
        connection = create_connection()
        if connection:
            orders = get_orders(connection) or []
            close_connection(connection)
            self.send_json_response(200, orders)
        else:
            self.send_json_response(500, {'success': False, 'error': 'Datenbankverbindung fehlgeschlagen'})

    def handle_driver_update(self, data):
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            try:
                cursor.execute("""
                    INSERT INTO driver_status (user_id, latitude, longitude, status, last_update)
                    VALUES (%s, %s, %s, %s, NOW())
                    ON DUPLICATE KEY UPDATE
                    latitude = VALUES(latitude),
                    longitude = VALUES(longitude),
                    status = VALUES(status),
                    last_update = NOW()
                """, (data['user_id'], data['lat'], data['lng'], data['status']))
                connection.commit()
                self.send_json_response(200, {'success': True})
            except Exception as e:
                self.send_json_response(500, {'error': str(e)})
            finally:
                cursor.close()
                close_connection(connection)
        else:
            self.send_json_response(500, {'error': 'Datenbankverbindung fehlgeschlagen'})

    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

def run_server():
    connection = create_connection()
    if connection:
        server_address = ('', 8000)
        httpd = HTTPServer(server_address, RequestHandler)
        print('Server läuft auf Port 8000')
        try:
            httpd.serve_forever()
        finally:
            close_connection(connection)
    else:
        print('Konnte keine Verbindung zur Datenbank herstellen. Server wird nicht gestartet.')

if __name__ == '__main__':
    run_server()
