import mysql.connector
from mysql.connector import Error

def create_connection():
    connection = None
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='taxasoft2',
            user='root'
        )
        print("Successfully connected to the database")
    except Error as e:
        print(f"Error: '{e}'")
    
    return connection

def close_connection(connection):
    if connection:
        connection.close()
        print("Database connection closed")

def insert_user(connection, username, password):
    cursor = connection.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, password))
        connection.commit()
        return True
    except Error as e:
        print(f"Error: '{e}'")
        return False
    finally:
        cursor.close()

def check_user(connection, username, password):
    cursor = connection.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE username = %s AND password = %s", (username, password))
        result = cursor.fetchone()
        return result is not None
    except Error as e:
        print(f"Error: '{e}'")
        return False
    finally:
        cursor.close()

def insert_order(connection, customer, date, time, pickup, dropoff, trip_type, vehicle_type, notes):
    cursor = connection.cursor()
    try:
        query = """INSERT INTO orders 
                   (customer_name, order_date, order_time, pickup_address, dropoff_address, trip_type, vehicle_type, notes) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
        values = (customer, date, time, pickup, dropoff, trip_type, vehicle_type, notes)
        cursor.execute(query, values)
        connection.commit()
        return cursor.lastrowid
    except Error as e:
        print(f"Error: '{e}'")
        return None
    finally:
        cursor.close()

def get_orders(connection):
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM orders ORDER BY order_date DESC, order_time DESC")
        orders = cursor.fetchall()
        for order in orders:
            if 'order_date' in order:
                order['order_date'] = order['order_date'].strftime('%Y-%m-%d')
            if 'order_time' in order:
                total_minutes = int(order['order_time'].total_seconds() / 60)
                hours = total_minutes // 60
                minutes = total_minutes % 60
                order['order_time'] = f"{hours:02d}:{minutes:02d}"
        return orders if orders else []
    except Error as e:
        print(f"Error: '{e}'")
        return []
    finally:
        cursor.close()

def delete_order(connection, order_id):
    cursor = connection.cursor()
    try:
        cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
        connection.commit()
        return True
    except Error as e:
        print(f"Error: '{e}'")
        return False
    finally:
        cursor.close()

def update_order(connection, order_id, customer, date, time, pickup, dropoff, trip_type, vehicle_type, notes):
    cursor = connection.cursor()
    try:
        query = """UPDATE orders 
                   SET customer_name = %s, 
                       order_date = %s, 
                       order_time = %s, 
                       pickup_address = %s, 
                       dropoff_address = %s, 
                       trip_type = %s, 
                       vehicle_type = %s, 
                       notes = %s 
                   WHERE id = %s"""
        values = (customer, date, time, pickup, dropoff, trip_type, vehicle_type, notes, order_id)
        cursor.execute(query, values)
        connection.commit()
        return True
    except Error as e:
        print(f"Error: '{e}'")
        return False
    finally:
        cursor.close()

def update_driver_status(connection, user_id, latitude, longitude, status):
    cursor = connection.cursor()
    try:
        query = """INSERT INTO driver_status 
                   (user_id, latitude, longitude, status, last_update) 
                   VALUES (%s, %s, %s, %s, NOW())
                   ON DUPLICATE KEY UPDATE
                   latitude = VALUES(latitude),
                   longitude = VALUES(longitude),
                   status = VALUES(status),
                   last_update = NOW()"""
        values = (user_id, latitude, longitude, status)
        cursor.execute(query, values)
        connection.commit()
        return True
    except Error as e:
        print(f"Error: '{e}'")
        return False
    finally:
        cursor.close()

def get_driver_status(connection, user_id):
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM driver_status WHERE user_id = %s", (user_id,))
        return cursor.fetchone()
    except Error as e:
        print(f"Error: '{e}'")
        return None
    finally:
        cursor.close()

def get_all_active_drivers(connection):
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT d.*, u.username 
            FROM driver_status d 
            JOIN users u ON d.user_id = u.id 
            WHERE d.status != 'offline' 
            AND d.last_update >= NOW() - INTERVAL 5 MINUTE
        """)
        return cursor.fetchall()
    except Error as e:
        print(f"Error: '{e}'")
        return []
    finally:
        cursor.close()
