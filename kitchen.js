async function loadOrders(status) {
    const response = await fetch(`http://127.0.0.1:5000/orders/${status}`);
    if (!response.ok) {
        document.getElementById('order-details').innerText = "Error loading orders";
        return;
    }

    const orders = await response.json();
    displayOrders(orders, status);
}

function displayOrders(orders, status) {
    const detailsDiv = document.getElementById('order-details');
    detailsDiv.innerHTML = ""; // Clear previous content

    orders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.classList.add('order');

        let buttonHTML = '';
        if (status === 'placed') {
            buttonHTML = `<button onclick="updateOrderStatus(${order.order_id}, 'picked')">Pick</button>`;
        } else if (status === 'picked') {
            buttonHTML = `<button onclick="updateOrderStatus(${order.order_id}, 'delivered')">Deliver</button>`;
        }

        orderDiv.innerHTML = `<h3>Order ID: ${order.order_id}</h3>
                              <p>Table Number: ${order.table_number}</p>
                              <p>Order Date: ${order.order_date}</p>
                              <h4>Items:</h4>
                              <ul>${order.items.map(item =>
                                  `<li>${item.quantity} x ${item.item_name} - ₹ ${item.total}</li>`
                              ).join('')}</ul>
                              <h4>Total Amount: ₹ ${order.total_amount}</h4>
                              ${buttonHTML}<hr>`;

        detailsDiv.appendChild(orderDiv);
    });
}

async function updateOrderStatus(orderId, newStatus) {
    const response = await fetch('http://127.0.0.1:5000/update_order_status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_id: orderId, new_status: newStatus })
    });

    if (response.ok) {
        loadOrders(newStatus === 'picked' ? 'placed' : 'picked');  // Reload orders for the current tab
    } else {
        console.error("Error updating order status");
    }
}

// Load 'placed' orders initially
loadOrders('placed');