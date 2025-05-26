let map;
let taxis = [
    {id: 1, lat: 52.1657, lng: 10.5406},  // Near Ahlumer Straße
    {id: 2, lat: 52.1614, lng: 10.5367},  // City center
    {id: 3, lat: 52.1701, lng: 10.5528},  // Near railway station
];
let phoneMarker;
let orders = [];
let assignedRoutes = {};
let pickupMarker, dropoffMarker, routeLayer;

function initMap() {
    map = L.map('map').setView([52.1657, 10.5406], 14);  // Centered on Ahlumer Straße 38
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    taxis.forEach(taxi => {
        taxi.marker = L.marker([taxi.lat, taxi.lng])
            .addTo(map)
            .bindPopup('Taxi ' + taxi.id);
    });

    // Add a marker for Ahlumer Straße 38
    L.marker([52.1657, 10.5406]).addTo(map)
        .bindPopup('Ahlumer Straße 38, Wolfenbüttel')
        .openPopup();

    updateTaxiList();
}

function updateTaxiList() {
    const taxiList = document.getElementById('taxiList');
    taxiList.innerHTML = '';
    taxis.forEach(taxi => {
        const li = document.createElement('li');
        const assignedRoute = assignedRoutes[taxi.id];
        if (assignedRoute) {
            const order = orders.find(o => o.id == assignedRoute.orderId);
            if (order) {
                li.textContent = `Taxi ${taxi.id}: Auftrag ${order.id} - ${order.customer} - Von: ${order.pickup} Nach: ${order.dropoff}`;
            } else {
                li.textContent = `Taxi ${taxi.id}: Zugewiesener Auftrag nicht gefunden`;
            }
        } else {
            li.textContent = `Taxi ${taxi.id}: Verfügbar`;
        }
        li.classList.add('list-group-item', 'droppable');
        li.addEventListener('dragover', allowDrop);
        li.addEventListener('drop', (event) => drop(event, taxi.id));
        li.addEventListener('click', () => focusOnTaxi(taxi.id));
        taxiList.appendChild(li);
        
        if (taxi.marker) {
            taxi.marker.setLatLng([taxi.lat, taxi.lng]);
        }
    });
}

function focusOnTaxi(taxiId) {
    console.log("Focusing on Taxi", taxiId);
    const taxi = taxis.find(t => t.id == taxiId);
    if (taxi && taxi.marker) {
        map.setView([taxi.lat, taxi.lng], 15);
        taxi.marker.openPopup();
    } else {
        console.log("Taxi or marker not found", taxi);
    }
}

function drop(event, taxiId) {
    event.preventDefault();
    const data = event.dataTransfer.getData("text");
    const orderId = data.split(':')[1].split('-')[0].trim();
    const order = orders.find(o => o.id == orderId);
    
    if (order) {
        assignedRoutes[taxiId] = {
            orderId: orderId,
            pickup: {lat: parseFloat(order.pickup.split(',')[0]), lng: parseFloat(order.pickup.split(',')[1])},
            dropoff: {lat: parseFloat(order.dropoff.split(',')[0]), lng: parseFloat(order.dropoff.split(',')[1])}
        };
        
        orders = orders.filter(o => o.id != orderId);
        updateOrderList();
        updateTaxiList();
        
        calculateAndDisplayRoute(taxiId, assignedRoutes[taxiId].pickup, assignedRoutes[taxiId].dropoff);
        
        alert(`Auftrag ${orderId} wurde Taxi ${taxiId} zugewiesen`);
    }
}

function calculateAndDisplayRoute(taxiId, pickup, dropoff) {
    console.log("Berechne Route für Taxi", taxiId, "von", pickup, "nach", dropoff);
    const taxi = taxis.find(t => t.id == taxiId);
    if (taxi) {
        if (taxi.routeLayer) {
            map.removeLayer(taxi.routeLayer);
        }
        
        const routeCoordinates = [
            [taxi.lat, taxi.lng],
            [pickup.lat, pickup.lng],
            [dropoff.lat, dropoff.lng]
        ];
        
        taxi.routeLayer = L.polyline(routeCoordinates, {color: 'red'}).addTo(map);
        map.fitBounds(taxi.routeLayer.getBounds());
    }
}

function addOrder(event) {
    event.preventDefault();
    const order = {
        customer_name: document.getElementById('customerName').value,
        order_date: document.getElementById('orderDate').value,
        order_time: document.getElementById('orderTime').value,
        pickup_address: document.getElementById('pickupAddress').value,
        dropoff_address: document.getElementById('dropoffAddress').value,
        trip_type: document.getElementById('tripType').value,
        vehicle_type: document.getElementById('vehicleType').value,
        notes: document.getElementById('orderNotes').value
    };

    fetch('/api/save_order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateOrderList();
            document.getElementById('orderForm').reset();
            alert('Auftrag erfolgreich gespeichert!');
        } else {
            alert('Fehler beim Speichern des Auftrags: ' + data.message);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    });
}

function updateOrderList() {
    fetch('/api/get_orders')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            orders = data;
            const orderList = document.getElementById('orderList');
            orderList.innerHTML = '';
            orders.forEach(order => {
                const li = document.createElement('li');
                li.textContent = `Auftrag ${order.id}: ${order.customer_name} - ${order.order_date} ${order.order_time} - ${order.trip_type} - ${order.vehicle_type} - Von: ${order.pickup_address} Nach: ${order.dropoff_address}`;
                li.title = `Notizen: ${order.notes}`;
                li.classList.add('list-group-item', 'draggable');
                li.draggable = true;
                li.addEventListener('dragstart', drag);
                orderList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Fehler beim Laden der Aufträge. Bitte versuchen Sie es später erneut.');
        });
}

function drag(event) {
    event.dataTransfer.setData("text", event.target.textContent);
}

function allowDrop(event) {
    event.preventDefault();
}

function openNav() {
    document.getElementById("mySidebar").style.width = "250px";
}

function closeNav() {
    document.getElementById("mySidebar").style.width = "0";
}

function getSuggestions(input, datalist) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${input}`)
        .then(response => response.json())
        .then(data => {
            datalist.innerHTML = '';
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.display_name;
                datalist.appendChild(option);
            });
        });
}

function updateMap(address, marker) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${address}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                if (marker) {
                    marker.setLatLng([lat, lon]);
                } else {
                    marker = L.marker([lat, lon]).addTo(map);
                }
                map.setView([lat, lon], 15);
                updateRoute();
            }
        });
}

function editOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        // Formularfelder mit den bestehenden Daten füllen
        document.getElementById('customerName').value = order.customer_name;
        document.getElementById('orderDate').value = order.order_date;
        document.getElementById('orderTime').value = order.order_time;
        document.getElementById('pickupAddress').value = order.pickup_address;
        document.getElementById('dropoffAddress').value = order.dropoff_address;
        document.getElementById('tripType').value = order.trip_type;
        document.getElementById('vehicleType').value = order.vehicle_type;
        document.getElementById('orderNotes').value = order.notes;

        // Formular in Bearbeitungsmodus versetzen
        const submitButton = document.querySelector('#orderForm button[type="submit"]');
        submitButton.textContent = 'Auftrag aktualisieren';
        submitButton.dataset.editMode = 'true';
        submitButton.dataset.orderId = orderId;
    }
}

function updateRoute() {
    console.log("updateRoute aufgerufen");
    console.log("pickupMarker:", pickupMarker);
    console.log("dropoffMarker:", dropoffMarker);
    if (pickupMarker && dropoffMarker) {
        const pickup = pickupMarker.getLatLng();
        const dropoff = dropoffMarker.getLatLng();
        console.log("Routenanfrage gesendet:", pickup, dropoff);
        fetch(`https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`)
            .then(response => response.json())
            .then(data => {
                if (routeLayer) {
                    map.removeLayer(routeLayer);
                }
                routeLayer = L.geoJSON(data.routes[0].geometry).addTo(map);
                map.fitBounds(routeLayer.getBounds());
            });
    } else {
        console.log("Nicht genügend Marker für Routenberechnung");
    }
}

document.getElementById('pickupAddress').addEventListener('input', function() {
    getSuggestions(this.value, document.getElementById('pickupSuggestions'));
});

document.getElementById('dropoffAddress').addEventListener('input', function() {
    getSuggestions(this.value, document.getElementById('dropoffSuggestions'));
});

document.getElementById('pickupAddress').addEventListener('change', function() {
    updateMap(this.value, pickupMarker);
});

document.getElementById('dropoffAddress').addEventListener('change', function() {
    updateMap(this.value, dropoffMarker);
});

document.getElementById('orderForm').addEventListener('submit', addOrder);

let isDragging = false;
let startY;
let startHeight;

document.querySelector('.order-list-header').addEventListener('mousedown', function(e) {
    isDragging = true;
    startY = e.clientY;
    startHeight = parseInt(document.defaultView.getComputedStyle(document.querySelector('.order-list')).height, 10);
    
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
});

function resize(e) {
    if (isDragging) {
        const newHeight = startHeight + startY - e.clientY;
        document.querySelector('.order-list').style.height = newHeight + 'px';
    }
}

function stopResize() {
    isDragging = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
}

window.onload = function() {
    initMap();
    updateOrderList();
};

function deleteOrder(orderId) {
    if (confirm('Möchten Sie diesen Auftrag wirklich löschen?')) {
        fetch(`/api/delete_order/${orderId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateOrderList();
                alert('Auftrag erfolgreich gelöscht');
            } else {
                alert('Fehler beim Löschen des Auftrags');
            }
        });
    }
}

function updateOrderList() {
    fetch('/api/get_orders')
        .then(response => response.json())
        .then(data => {
            orders = data;
            const orderList = document.getElementById('orderList');
            orderList.innerHTML = '';
            orders.forEach(order => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span>Auftrag ${order.id}: ${order.customer_name} - ${order.order_date} ${order.order_time} - ${order.trip_type} - ${order.vehicle_type}</span>
                        <div>
                            <button class="btn btn-primary btn-sm me-2" onclick="editOrder(${order.id})">Bearbeiten</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteOrder(${order.id})">Löschen</button>
                        </div>
                    </div>
                    <div class="small text-muted">
                        Von: ${order.pickup_address}<br>
                        Nach: ${order.dropoff_address}
                    </div>`;
                li.title = `Notizen: ${order.notes}`;
                li.classList.add('list-group-item', 'draggable');
                li.draggable = true;
                li.addEventListener('dragstart', drag);
                orderList.appendChild(li);
            });
        });
}

