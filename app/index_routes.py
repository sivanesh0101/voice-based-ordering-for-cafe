from flask import Blueprint, request, jsonify, render_template
from database import get_db_connection
from datetime import datetime

index_bp = Blueprint('index', __name__)

# Fallback extract_items function (replace with your actual utils.py version if different)
def extract_items(items):
    return items

@index_bp.route('/')
def index():
    return render_template('index.html')

@index_bp.route('/place_order', methods=['POST'])
def place_order():
    data = request.json
    print(f"Received data: {data}")
    
    # Extract and validate inputs
    session_id = data.get('session_id')
    table_number = int(data.get('table_number', 1))  # Convert to int, default to 1
    items_ordered = extract_items(data.get('items', []))
    print(f"Parsed: session_id={session_id}, table_number={table_number}, items={items_ordered}")

    # Input validation
    if not session_id or not items_ordered:
        return jsonify({"error": "Session ID and items are required"}), 400
    if not isinstance(items_ordered, list):
        return jsonify({"error": "Items must be a list"}), 400

    db = get_db_connection()
    cursor = db.cursor()

    try:
        # Insert into Orders table
        print("Inserting into Orders...")
        cursor.execute(
            "INSERT INTO Orders (SessionID, TableNumber, OrderDate, status) VALUES (%s, %s, %s, %s)",
            (session_id, table_number, datetime.now(), 'placed')
        )
        db.commit()
        order_id = cursor.lastrowid
        print(f"Order inserted, OrderID={order_id}")

        total_amount = 0
        for item in items_ordered:
            print(f"Querying item: {item['item_name']}")
            cursor.execute(
                "SELECT ItemID, Price FROM Items WHERE LOWER(ItemName) = LOWER(%s)",
                (item['item_name'],)
            )
            item_info = cursor.fetchone()
            if item_info:
                item_id, price = item_info
                quantity = int(item['quantity'])  # Ensure quantity is an integer
                print(f"Found item: ItemID={item_id}, Price={price}, Quantity={quantity}")
                cursor.execute(
                    "INSERT INTO OrderItems (OrderID, ItemID, Quantity) VALUES (%s, %s, %s)",
                    (order_id, item_id, quantity)
                )
                total_amount += price * quantity
            else:
                print(f"Item not found: {item['item_name']}")
                return jsonify({"error": f"Item '{item['item_name']}' not found"}), 404

        # Update TotalAmount
        print(f"Updating total_amount={total_amount} for OrderID={order_id}")
        cursor.execute("UPDATE Orders SET TotalAmount = %s WHERE OrderID = %s", (total_amount, order_id))
        db.commit()

        return jsonify({"message": "Order placed successfully!", "order_id": order_id})

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@index_bp.route('/cancel_order', methods=['POST'])
def cancel_order():
    data = request.json
    session_id = data.get('session_id')
    print(f"Received cancel request: session_id={session_id}")

    if not session_id:
        return jsonify({"error": "Session ID is required"}), 400

    db = get_db_connection()
    cursor = db.cursor()

    try:
        # Fetch order by SessionID
        print("Fetching order...")
        cursor.execute("SELECT OrderID, status FROM Orders WHERE SessionID = %s", (session_id,))
        result = cursor.fetchone()

        if not result:
            print("No order found for this session ID")
            return jsonify({"error": "No order found for this session ID"}), 404

        order_id, order_status = result
        print(f"Found order: OrderID={order_id}, status={order_status}")

        # Check if order can be canceled
        if order_status != 'placed':
            print("Order cannot be canceled due to status")
            return jsonify({"error": "Order cannot be canceled because it's not in 'placed' status."}), 400

        # Delete order items and order
        print("Deleting OrderItems...")
        cursor.execute("DELETE FROM OrderItems WHERE OrderID = %s", (order_id,))
        print("Deleting Order...")
        cursor.execute("DELETE FROM Orders WHERE OrderID = %s", (order_id,))
        db.commit()
        print("Order canceled successfully")

        return jsonify({"success": True}), 200

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()