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
    port="3306"
)
cursor = db.cursor()

@app.route('/')
def index():
    return render_template('index.html')  # Your HTML file

@app.route('/kitchen')
def kitchen():
    return render_template('kitchen.html')  # Ensure this points to your kitchen HTML file

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

# New route to fetch order details by order ID and table number
@app.route('/order_details/<int:order_id>/<int:table_number>', methods=['GET'])
def get_order_details(order_id, table_number):
    try:
        cursor.execute("""
            SELECT o.OrderID, o.TableNumber, o.OrderDate, oi.ItemID, i.ItemName, oi.Quantity, i.Price 
            FROM Orders o 
            JOIN OrderItems oi ON o.OrderID = oi.OrderID 
            JOIN Items i ON oi.ItemID = i.ItemID 
            WHERE o.OrderID = %s AND o.TableNumber = %s
        """, (order_id, table_number))
        
        order_details = cursor.fetchall()

        if not order_details:
            return jsonify({"error": "Order not found"}), 404
        
        response = {
            "order_id": order_id,
            "table_number": table_number,
            "items": [
                {
                    "item_name": item[4],
                    "quantity": item[5],
                    "price": item[6],
                    "total": item[5] * item[6]
                } for item in order_details
            ],
            "total_amount": sum(item[5] * item[6] for item in order_details),
            "order_date": order_details[0][2].strftime("%Y-%m-%d %H:%M:%S")
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)