from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, send
from flask_cors import CORS
import mysql.connector
from datetime import datetime

app = Flask(__name__)
CORS(app)

socketio = SocketIO(app)

# Database connection
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="cafeteria",
    port="4306"
)
cursor = db.cursor()

@app.route('/')
def index():
    return render_template('index.html')  # Your HTML file

@socketio.on('message')
def handle_message(msg):
    print(f"Message: {msg}")
    send(msg, broadcast=True)

def extract_items(order_items):
    items = []
    for item in order_items:
        item_name = item['item_name']
        quantity = item['quantity']
        items.append({"item_name": item_name, "quantity": quantity})
    return items

@app.route('/place_order', methods=['POST'])
def place_order():
    data = request.json
    table_number = data.get('table_number')
    items_ordered = extract_items(data.get('items', []))

    try:
        cursor.execute("INSERT INTO Orders (TableNumber, OrderDate) VALUES (%s, %s)", (table_number, datetime.now()))
        db.commit()
        order_id = cursor.lastrowid
        total_amount = 0

        for item in items_ordered:
            cursor.execute("SELECT ItemID, Price FROM Items WHERE ItemName = %s", (item['item_name'],))
            item_info = cursor.fetchone()
            if item_info:
                item_id, price = item_info
                quantity = item['quantity']
                cursor.execute("INSERT INTO OrderItems (OrderID, ItemID, Quantity) VALUES (%s, %s, %s)", 
                               (order_id, item_id, quantity))
                total_amount += price * quantity
            else:
                return jsonify({"error": f"Item '{item['item_name']}' not found"}), 404

        cursor.execute("UPDATE Orders SET TotalAmount = %s WHERE OrderID = %s", (total_amount, order_id))
        db.commit()

        return jsonify({"message": "Order placed successfully!", "order_id": order_id})

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    socketio.run(app, port=5000, allow_unsafe_werkzeug=True)
