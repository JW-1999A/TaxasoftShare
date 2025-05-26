let driverUserId;
let map;
let driverMarker;
let driverStatus = 'online';
let currentOrder = null;
let watchId;

// Prüfung des Login-Status und App-Initialisierung
window.onload = function() {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }
    
    driverUserId = userId;
    initDriverMap();
    checkForOrders();
};

function initDriverMap() {
    map = L.map('driverMap').setView([52.1657, 10.5406], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    driverMarker = L.marker([52.1657, 10.5406]).addTo(map);
    startPositionTracking();
}

function startPositionTracking() {
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            updatePosition,
            handleLocationError,
            { enableHighAccuracy: true }
        );
    }
}

function updatePosition(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    
    driverMarker.setLatLng([lat, lng]);
    
    fetch('http://localhost:8001/api/driver/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: driverUserId,
            lat: lat,
            lng: lng,
            status: driverStatus
        })
    });
}

document.getElementById('statusBtn').addEventListener('click', function() {
    driverStatus = driverStatus === 'online' ? 'offline' : 'online';
    this.textContent = driverStatus === 'online' ? 'Online' : 'Offline';
    this.className = driverStatus === 'online' ? 
        'btn btn-success btn-transition' : 
        'btn btn-danger btn-transition';
});

document.getElementById('acceptBtn').addEventListener('click', function() {
    if (currentOrder) {
        this.style.display = 'none';
        document.getElementById('completeBtn').style.display = 'block';
    }
});

document.getElementById('completeBtn').addEventListener('click', function() {
    if (currentOrder) {
        this.style.display = 'none';
        currentOrder = null;
        document.getElementById('orderDetails').innerHTML = 'Kein aktiver Auftrag';
    }
});

function handleLocationError(error) {
    console.error('Fehler bei der Standortbestimmung:', error);
    alert('Standortfreigabe erforderlich für die Fahrer-App');
}

function checkForOrders() {
    setInterval(() => {
        fetch('http://localhost:8001/api/driver/orders')
            .then(response => response.json())
            .then(data => {
                if (data.order && !currentOrder) {
                    showNewOrder(data.order);
                }
            });
    }, 10000);
}

function showNewOrder(order) {
    currentOrder = order;
    document.getElementById('orderDetails').innerHTML = `
        <div class="order-info">
            <p><strong>Kunde:</strong> ${order.customer_name}</p>
            <p><strong>Von:</strong> ${order.pickup_address}</p>
            <p><strong>Nach:</strong> ${order.dropoff_address}</p>
            <p><strong>Zeit:</strong> ${order.order_time}</p>
        </div>
    `;
    document.getElementById('acceptBtn').style.display = 'block';
}
