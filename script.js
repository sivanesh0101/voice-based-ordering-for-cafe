function startVoiceRecognition() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-IN';  // Set language to English (India)
    recognition.interimResults = false;

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.toLowerCase();
        processOrder(transcript);
    };

    recognition.start();
}

function updateChat(sender, message) {
    const chatMessage = document.createElement('div');
    chatMessage.classList.add(sender);
    chatMessage.innerText = message;
    document.getElementById('chat').appendChild(chatMessage);
}

function processOrder(transcript) {
    const items = {
        "cappuccino": 50, 
        "espresso": 60, 
        "cold coffee": 120, 
        "cold mocha": 150, 
        "red velvet cake": 415,
        "filter coffee": 70, 
        "flat white": 40,
        "belgian chocolate": 180,
        "chocolate shake": 200,
        "sandwich": 70,
        "garlic bread": 60,
        "veg burger": 120,
        "veg pizza": 150,
        "cheesecake": 165,
        "vanilla scoop": 165,
        "strawberry cake": 165 
        // Add more items as needed
    };

    let matchedItem = null;
    let quantity = 1;

    // Print user's voice input
    updateChat('user', transcript);

    // Check if the transcript contains an item
    for (const item in items) {
        if (transcript.includes(item)) {
            matchedItem = item;
            break;
        }
    }

    // Check for quantity in transcript (optional)
    const qtyMatch = transcript.match(/\d+/);
    if (qtyMatch) {
        quantity = parseInt(qtyMatch[0]);
    }

    // Check if user finalizes the order
    if (transcript.includes("finalize") || transcript.includes("enough")) {
        finalizeOrder();
        return;
    }

    if (matchedItem) {
        addToOrder(matchedItem, quantity, items[matchedItem]);
        updateChat('app', `Added ${quantity} ${matchedItem} to your order.`);
    } else {
        updateChat('app', "Sorry, item not found.");
    }
}

function addToOrder(itemName, quantity, price) {
    const orderItem = document.createElement('tr');
    orderItem.innerHTML = `<td>${itemName}</td><td>${quantity}</td><td>${price * quantity}</td>`;
    document.getElementById('order-items').appendChild(orderItem);
}

function finalizeOrder() {
    const orderItems = [];
    document.querySelectorAll('#order-items tr').forEach(row => {
        const item = row.querySelector('td:first-child').innerText;
        const quantity = row.querySelector('td:nth-child(2)').innerText;
        orderItems.push({ item_name: item, quantity: parseInt(quantity) });
    });

    // Corrected URL for the Flask backend
    fetch('http://127.0.0.1:5000/place_order', {  // Flask app running on port 5000
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ table_number: 1, items: orderItems })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Network response was not ok " + response.statusText); // Improved error handling
        }
        return response.json(); // Return JSON data
    })
    .then(data => {
        updateChat('app', "Your order has been placed successfully!");
        console.log(data);
    })
    .catch(error => {
        updateChat('app', "Sorry, there was an issue placing your order.");
        console.error(error);
    });
}

