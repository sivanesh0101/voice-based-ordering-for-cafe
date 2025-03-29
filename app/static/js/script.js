// Select the mic button element
const micButton = document.getElementById('activate-voice-assistant');
const voices = [];

const welcomeMessages = [
    "Welcome to our cafeteria! How can I assist you today?",
    "Hello there! Ready to place your order?",
    "Hi! Check out our delicious menu items!",
    "Welcome back! What's your craving today?",
    "Greetings! Let's get started with your order."
];

// Load available voices
window.speechSynthesis.onvoiceschanged = function () {
    voices.length = 0;
    voices.push(...window.speechSynthesis.getVoices());
    const randomMessage = getRandomMessage();
    speakMessage(randomMessage);
};

// Function to get a random welcome message
function getRandomMessage() {
    return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
}

// Function to speak a message using Zira voice
function speakMessage(message, rate = 1.2) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'en-IN';
        utterance.rate = rate;
        const ziraVoice = voices.find(voice => voice.name.toLowerCase().includes("zira"));
        if (ziraVoice) utterance.voice = ziraVoice;
        window.speechSynthesis.speak(utterance);
    } else {
        console.log("Speech synthesis not supported in this browser.");
    }
}

// Function to convert text to speech
function speakText(text, rate = 1.3) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = rate;
    const ziraVoice = voices.find(voice => voice.name.toLowerCase().includes("zira"));
    if (ziraVoice) utterance.voice = ziraVoice;
    window.speechSynthesis.speak(utterance);
}

// Voice recognition setup
let recognition;
let isRecognitionActive = false;

function startVoiceRecognition() {
    if (!recognition) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-IN';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onresult = function(event) {
            let transcript = event.results[0][0].transcript.toLowerCase();
            transcript = transcript.replace(/\bto\b/g, "two")
                                 .replace(/\bfor\b/g, "four")
                                 .replace(/\bon\b/g, "one");
            processOrder(transcript);
            stopVoiceRecognition();
        };

        recognition.onerror = function(event) {
            console.error('Voice recognition error:', event.error);
            stopVoiceRecognition();
        };

        recognition.onend = function() {
            stopVoiceRecognition();
        };
    }

    if (isRecognitionActive) {
        stopVoiceRecognition();
    } else {
        micButton.classList.add('active');
        recognition.start();
        isRecognitionActive = true;
    }
}

function stopVoiceRecognition() {
    if (recognition) recognition.stop();
    micButton.classList.remove('active');
    isRecognitionActive = false;
}

// Update chat UI
function updateChat(sender, message) {
    if (sender === 'user') message = message.replace(/\bfor\b/g, 'four');
    const chatMessage = document.createElement('div');
    chatMessage.classList.add(sender);
    chatMessage.innerText = message;
    document.getElementById('chat').appendChild(chatMessage);
    const chatContainer = document.getElementById('chat');
    chatContainer.scrollTop = chatContainer.scrollHeight;
    if (sender !== 'user') speakText(message);
}

// Process voice commands
function processOrder(transcript) {
    const items = {
        "cappuccino": 50, "espresso": 60, "cold coffee": 120, "cold mocha": 150,
        "red velvet cake": 415, "filter coffee": 70, "flat white": 40,
        "belgian chocolate": 180, "chocolate shake": 200, "sandwich": 70,
        "garlic bread": 60, "veg burger": 120, "veg pizza": 150,
        "cheesecake": 165, "vanilla scoop": 165, "strawberry cake": 165
    };

    const numberMap = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
    };

    updateChat('user', transcript);

    const orderRegex = new RegExp(`(\\b(?:${Object.keys(numberMap).join('|')}|\\d+)\\b)?\\s*(\\b${Object.keys(items).join('\\b|\\b')}\\b)`, 'gi');
    const orders = [...transcript.matchAll(orderRegex)];

    function normalizeQuantity(quantityStr) {
        const normalized = quantityStr.toLowerCase().trim();
        if (numberMap[normalized]) return numberMap[normalized];
        const numericValue = parseInt(normalized);
        if (!isNaN(numericValue)) return numericValue;
        const ambiguousNumbers = { "on": 1, "to": 2, "for": 4 };
        return ambiguousNumbers[normalized] || 1;
    }

    const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"];
    if (greetings.some(greet => transcript.includes(greet))) {
        updateChat('app', "Hello! Order something you like.");
        return;
    }

    if (["finalize", "final", "enough", "that's all", "finish the order", "confirm the order", "wrap it up", "that's it"].some(phrase => transcript.includes(phrase))) {
        finalizeOrder();
        return;
    }

    if (["cancel the order", "cancel order", "remove all items", "clear the order", "discard the order"].some(phrase => transcript.includes(phrase))) {
        clearOrder();
        updateChat('app', "All items have been removed from your order.");
        return;
    }

    if (transcript.includes("remove")) {
        const removeMatch = transcript.match(/remove (\d+|one|two|three|four|five|six|seven|eight|nine|ten)?\s*(.*)/i);
        if (removeMatch) {
            const removeQtyStr = removeMatch[1] ? removeMatch[1].toLowerCase() : "one";
            const removeItem = removeMatch[2].toLowerCase();
            const removeQuantity = normalizeQuantity(removeQtyStr);
            removeItemFromOrder(removeItem, removeQuantity);
        } else {
            updateChat('app', "Please specify the item and quantity to remove.");
        }
        return;
    }

    if (orders.length > 0) {
        orders.forEach(order => {
            let quantityStr = order[1] ? order[1].toLowerCase() : "one";
            const item = order[2].toLowerCase();
            const quantity = normalizeQuantity(quantityStr);

            if (items[item]) {
                addToOrder(item, quantity, items[item]);
                updateChat('app', `${quantity} ${item}${quantity > 1 ? 's' : ''} added to your order.`);
            } else {
                updateChat('app', `Sorry, ${item} is not available.`);
            }
        });

        const additionalPrompts = [
            "Anything else?", "Anything more you'd like?", "Can I get you anything else?",
            "Shall I add something else to your order?", "Would you like something more with that?"
        ];
        updateChat('app', additionalPrompts[Math.floor(Math.random() * additionalPrompts.length)]);
    } else {
        updateChat('app', "Can you repeat again?");
    }
}

// Clear order
function clearOrder() {
    const sessionId = getSessionId();
    if (!sessionId) {
        updateChat('app', "Session ID is required to cancel the order.");
        return;
    }

    fetch('http://127.0.0.1:5000/cancel_order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateChat('app', "Your order has been canceled successfully.");
            document.getElementById('order-items').innerHTML = '';
            isOrderFinalized = false;
            clearTotalAmount();
            clearQRCode();
        } else {
            updateChat('app', "Sorry, your order cannot be canceled. It is not in 'placed' status.");
        }
    })
    .catch(error => {
        console.error('Error:', error);
        updateChat('app', "An error occurred while clearing the order. Please try again.");
    });
}

// UI helper functions
function clearTotalAmount() {
    document.getElementById('totalPrice').innerHTML = "";
}

function removeItemFromOrderClick(iconElement) {
    const row = iconElement.closest('tr');
    if (!row) {
        console.error('Row not found');
        return;
    }
    
    const itemName = row.cells[0].innerText.trim();
    const quantity = parseInt(row.cells[1].innerText.trim());
    
    if (itemName && quantity) {
        removeItemFromOrder(itemName, quantity);
        row.remove();
    } else {
        console.error('Invalid row data', itemName, quantity);
    }
}

function removeItemFromOrder(itemName, quantity) {
    const orderItems = document.getElementById('order-items');
    let existingRow = Array.from(orderItems.rows).find(row => row.cells[0].innerText.toLowerCase() === itemName.toLowerCase());

    if (existingRow) {
        const quantityCell = existingRow.cells[1];
        const priceCell = existingRow.cells[2];
        const currentQty = parseInt(quantityCell.innerText);

        if (currentQty >= quantity) {
            const newQty = currentQty - quantity;
            if (newQty > 0) {
                quantityCell.innerText = newQty;
                priceCell.innerText = newQty * parseInt(priceCell.innerText) / currentQty;
            } else {
                existingRow.remove();
            }
            updateChat('app', `${quantity} ${itemName}${quantity > 1 ? 's' : ''} removed from your order.`);
        } else {
            updateChat('app', `You only have ${currentQty} ${itemName}${quantity > 1 ? 's' : ''} in your order.`);
        }
    } else {
        updateChat('app', `No ${itemName}s found in your order.`);
    }
}

function addToOrder(itemName, quantity, price) {
    const orderItems = document.getElementById('order-items');
    let existingRow = Array.from(orderItems.rows).find(row => row.cells[0].innerText === itemName);

    if (existingRow) {
        const quantityCell = existingRow.cells[1];
        const priceCell = existingRow.cells[2];
        const currentQty = parseInt(quantityCell.innerText);
        const newQty = currentQty + quantity;
        quantityCell.innerText = newQty;
        priceCell.innerText = newQty * price;
    } else {
        const orderItem = document.createElement('tr');
        orderItem.innerHTML = `<td>${itemName}</td><td>${quantity}</td><td>${price * quantity}</td><td><i class="fas fa-trash-alt" style="cursor: pointer;" onclick="removeItemFromOrderClick(this)"></i></td>`;
        orderItems.appendChild(orderItem);
    }
}

// Finalize order
let isOrderFinalized = false;
function finalizeOrder() {
    const orderItems = [];
    let totalAmount = 0;

    document.querySelectorAll('#order-items tr').forEach(row => {
        const item = row.querySelector('td:first-child').innerText;
        const quantity = parseInt(row.querySelector('td:nth-child(2)').innerText);
        const price = parseInt(row.querySelector('td:nth-child(3)').innerText);
        orderItems.push({ item_name: item, quantity: quantity });
        totalAmount += price;
    });

    if (totalAmount === 0) {
        updateChat('app', "Please order something!");
        return;
    }

    fetch('http://127.0.0.1:5000/place_order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_id: getSessionId() || sessionId,
            table_number: 1,
            items: orderItems
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || response.statusText); });
        }
        return response.json();
    })
    .then(data => {
        updateChat('app', "Your order has been placed successfully!");
        console.log(data);
        displayTotalAmount(totalAmount);
        isOrderFinalized = true;
    })
    .catch(error => {
        updateChat('app', `Sorry, there was an issue: ${error.message}`);
        console.error(error);
    });
}

// Display total and QR code
function displayTotalAmount(total) {
    const totalPriceContainer = document.getElementById('totalPrice');
    totalPriceContainer.innerHTML = "";
    const totalMessage = document.createElement('div');
    totalMessage.innerText = `₹${total}`;
    totalPriceContainer.appendChild(totalMessage);
    speakText("Your order is on the way!");
    generateQRCode(total);
}

function clearQRCode() {
    document.getElementById("qrCodeContainer").innerHTML = "";
}

function generateQRCode(total) {
    const upiID = "sivaneshkumar50@oksbi";
    const payeeName = "KOVAI KULAMBI";
    const upiLink = `upi://pay?pa=${upiID}&pn=${payeeName}&mc=1234&tid=transactionId&am=${total}&cu=INR&url=https://your-merchant-website.com`;

    const qrContainer = document.getElementById("qrCodeContainer");
    qrContainer.innerHTML = "";
    const canvas = document.createElement("canvas");
    qrContainer.appendChild(canvas);

    QRCode.toCanvas(canvas, upiLink, function (error) {
        if (error) {
            console.error(error);
        } else {
            console.log("QR Code generated!");
            const orderSection = document.getElementById("order-section");
            if (orderSection) orderSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
}

// Session management
let sessionId = initializeSession();

function getSessionId() {
    const storedSessionId = localStorage.getItem('session_id');
    if (!storedSessionId) {
        console.log("No session ID found. Generating new one.");
        return generateSessionId();
    }
    console.log("Session ID found:", storedSessionId);
    return storedSessionId;
}

function generateSessionId() {
    const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('session_id', newSessionId);
    return newSessionId;
}

function initializeSession() {
    localStorage.removeItem('session_id');
    const newSessionId = generateSessionId();
    console.log("New session ID generated:", newSessionId);
    return newSessionId;
}

// New order button
document.getElementById('newOrderButton').addEventListener('click', function() {
    localStorage.removeItem('session_id');
    sessionStorage.clear();
    window.location.reload();
});