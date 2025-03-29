from database import get_db_connection

try:
    db = get_db_connection()
    print("Connection successful!")
    cursor = db.cursor()
    cursor.execute("SELECT DATABASE();")  # Get current database name
    db_name = cursor.fetchone()
    print(f"Connected to database: {db_name}")
    db.close()
except Exception as e:
    print(f"Connection failed: {str(e)}")