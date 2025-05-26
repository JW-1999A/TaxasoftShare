from database import create_connection, close_connection, insert_user, check_user

def login(username, password):
    connection = create_connection()
    if connection:
        success = check_user(connection, username, password)
        close_connection(connection)
        return success
    return False

def register(username, password):
    if not username or not password:
        return False
    
    connection = create_connection()
    if connection:
        success = insert_user(connection, username, password)
        close_connection(connection)
        return success
    return False

