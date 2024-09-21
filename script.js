let orderList = [];

function addToOrder(itemName) {
    // Item price mapping
    const itemPrices = {
        "Cappuccino": 165,
        "Flat White": 165,
        "Espresso": 165,
        "Filter Coffee": 415,
        "Cold Coffee": 165,
        "Cold Mocha": 165,
        "Belgian Chocolate": 165,
        "Chocolate Shake": 415,
        "Sandwich": 165,
        "Garlic Bread": 165,
        "Veg Burger": 165,
        "Veg Pizza": 415,
        "Cheescake": 165,
        "Vanilla Scoop": 165,
        "Strawberry Cake": 165,
        "Red Velvet Cake": 415
    };

    const itemPrice = itemPrices[itemName];
    
    // Check if item is already in the order list
    let existingItem = orderList.find(order => order.name === itemName);

    if (existingItem) {
        existingItem.qty += 1;
    } else {
        orderList.push({
            name: itemName,
            qty: 1,
            price: itemPrice
        });
    }

    updateOrderSummary();
}

function updateOrderSummary() {
    const orderSummary = document.querySelector(".order-summary table");
    const tbody = orderSummary.querySelector("tbody");

    // Clear current order list
    tbody.innerHTML = "";

    let totalAmount = 0;

    // Populate new order list
    orderList.forEach(order => {
        const row = document.createElement("tr");

        const itemName = document.createElement("td");
        itemName.textContent = order.name;

        const itemQty = document.createElement("td");
        itemQty.textContent = order.qty;

        const itemPrice = document.createElement("td");
        const price = order.qty * order.price;
        totalAmount += price;
        itemPrice.textContent = `₹${price}`;

        row.appendChild(itemName);
        row.appendChild(itemQty);
        row.appendChild(itemPrice);
        tbody.appendChild(row);
    });

    // Add total amount row
    const totalRow = document.createElement("tr");

    const totalLabel = document.createElement("td");
    totalLabel.textContent = "Total";

    const emptyCell = document.createElement("td");

    const totalPrice = document.createElement("td");
    totalPrice.textContent = `₹${totalAmount}`;

    totalRow.appendChild(totalLabel);
    totalRow.appendChild(emptyCell);
    totalRow.appendChild(totalPrice);
    tbody.appendChild(totalRow);
}

// Voice Recognition Setup
function startVoiceRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        alert("Speech recognition is not supported in this browser.");
        return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        processVoiceInput(transcript);
    };

    recognition.onerror = (event) => {
        console.error("Error occurred in recognition: " + event.error);
    };
}

function processVoiceInput(input) {
    const itemList = [
        "cappuccino", "flat white", "espresso", "filter coffee", 
        "cold coffee", "cold mocha", "belgian chocolate", "chocolate shake", 
        "sandwich", "garlic bread", "veg burger", "veg pizza",
        "cheescake", "vanilla scoop", "strawberry cake", "red velvet cake"
    ];

    const lowerCaseInput = input.toLowerCase();
    const matchedItem = itemList.find(item => lowerCaseInput.includes(item));

    if (matchedItem) {
        addToOrder(matchedItem.charAt(0).toUpperCase() + matchedItem.slice(1)); // Capitalize first letter
        addBotMessage(`${matchedItem.charAt(0).toUpperCase() + matchedItem.slice(1)} added. Anything else?`);
    } else {
        addBotMessage("Sorry, I couldn't find that item.");
    }
}

function addBotMessage(message) {
    const chat = document.querySelector(".chat");
    const botMessageDiv = document.createElement("div");
    botMessageDiv.classList.add("bot-message");

    const botMessageText = document.createElement("p");
    botMessageText.innerHTML = message;
    botMessageDiv.appendChild(botMessageText);
    
    chat.appendChild(botMessageDiv);

    // Scroll to the bottom of chatbox
    chat.scrollTop = chat.scrollHeight;
}
