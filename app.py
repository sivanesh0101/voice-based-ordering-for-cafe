from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, send
from flask_cors import CORS
import mysql.connector
from datetime import datetime

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

socketio = SocketIO(app)
db = mysql.connector.connect(
    host="localhost",
    port=3306,
    user="root",
    password="",
    database="cafeteria",
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

@app.route('/all_orders', methods=['GET'])
def get_all_orders():
    try:
        cursor.execute("""
            SELECT o.OrderID, o.TableNumber, o.OrderDate, oi.ItemID, i.ItemName, oi.Quantity, i.Price 
            FROM Orders o 
            JOIN OrderItems oi ON o.OrderID = oi.OrderID 
            JOIN Items i ON oi.ItemID = i.ItemID 
            ORDER BY o.OrderDate DESC
        """)
        
        orders = cursor.fetchall()
        order_dict = {}

        # Organize the data by OrderID
        for order in orders:
            order_id, table_number, order_date, item_id, item_name, quantity, price = order
            if order_id not in order_dict:
                order_dict[order_id] = {
                    "order_id": order_id,
                    "table_number": table_number,
                    "order_date": order_date.strftime("%Y-%m-%d %H:%M:%S"),
                    "items": [],
                    "total_amount": 0
                }
            order_dict[order_id]["items"].append({
                "item_name": item_name,
                "quantity": quantity,
                "price": price,
                "total": quantity * price
            })
            order_dict[order_id]["total_amount"] += quantity * price

        return jsonify(list(order_dict.values()))

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/orders/<status>', methods=['GET'])
def get_orders_by_status(status):
    try:
        cursor.execute("""
            SELECT o.OrderID, o.TableNumber, o.OrderDate, oi.ItemID, i.ItemName, oi.Quantity, i.Price 
            FROM Orders o 
            JOIN OrderItems oi ON o.OrderID = oi.OrderID 
            JOIN Items i ON oi.ItemID = i.ItemID 
            WHERE o.status = %s
            ORDER BY o.OrderDate DESC
        """, (status,))

        orders = cursor.fetchall()
        order_dict = {}

        for order in orders:
            order_id, table_number, order_date, item_id, item_name, quantity, price = order
            if order_id not in order_dict:
                order_dict[order_id] = {
                    "order_id": order_id,
                    "table_number": table_number,
                    "order_date": order_date.strftime("%Y-%m-%d %H:%M:%S"),
                    "items": [],
                    "total_amount": 0
                }
            order_dict[order_id]["items"].append({
                "item_name": item_name,
                "quantity": quantity,
                "price": price,
                "total": quantity * price
            })
            order_dict[order_id]["total_amount"] += quantity * price

        return jsonify(list(order_dict.values()))

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/update_order_status', methods=['POST'])
def update_order_status():
    data = request.json
    order_id = data.get('order_id')
    new_status = data.get('new_status')

    try:
        cursor.execute("UPDATE Orders SET status = %s WHERE OrderID = %s", (new_status, order_id))
        db.commit()
        return jsonify({"message": "Order status updated successfully."})

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)