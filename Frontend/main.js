let map
let paradas
let marcadores = []
let marcadoresVisibles = []
let marcadoresBuses = []
let infoWindows = []
let paradaActive = false
let updateBuses = false
let updateBusesInterval
let updateBusesLinesInterval

function initMap() {
    const pos = {
        lat: -34.873261,
        lng: -56.172956
    }

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 17,
        center: pos,
    })

    map.setOptions({
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            },
            {
                featureType: 'transit.station',
                stylers: [{ visibility: 'off' }]
            }
        ]
    })

    google.maps.event.addListener(map, 'zoom_changed', function () {
        handleZoom()
    })

    google.maps.event.addListener(map, 'bounds_changed', function () {
        actualizarInfoMapa()
    })

    google.maps.event.addListener(map, 'click', function () {
        if (paradaActive == false) return
        paradaActive = false
        updateBuses = false
        clearInterval(updateBusesInterval)
        actualizarInfoMapa()
        hideListaLineas()
        handleZoom()
        hideBuses()
    })
}

async function loadParadas() {
    const requestParadas = await fetch("http://localhost:3000/busstops")
    paradas = await requestParadas.json()

    paradas.forEach(parada => {
        const position = { lat: parada.location.coordinates[1], lng: parada.location.coordinates[0] }

        const iconoParadas = {
            url: "./media/bus-stop.png",
            scaledSize: new google.maps.Size(50, 50)
        }

        const marker = new google.maps.Marker({
            position,
            icon: iconoParadas,
            stopId: parada.busstopId
        })

        google.maps.event.addListener(marker, 'click', () => getBuses(marker.stopId))

        marcadores.push(marker)
    })

    actualizarInfoMapa()
}

function actualizarInfoMapa() {
    if (paradaActive) return

    const mapZoom = map.getZoom()
    const bounds = map.getBounds()

    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()

    for (var i = 0; i < marcadores.length; i++) {
        if (
            marcadores[i].position.lat() >= sw.lat() - 0.005 &&
            marcadores[i].position.lat() <= ne.lat() + 0.005 &&
            marcadores[i].position.lng() >= sw.lng() - 0.005 &&
            marcadores[i].position.lng() <= ne.lng() + 0.005 &&
            marcadores[i].map == null &&
            mapZoom >= 17
        ) {
            marcadores[i].setMap(map)
            marcadoresVisibles.push(i)
        }
    }

    for (var i = 0; i < marcadoresVisibles.length; i++) {
        if (
            marcadores[marcadoresVisibles[i]].position.lat() <= sw.lat() - 0.005 ||
            marcadores[marcadoresVisibles[i]].position.lat() >= ne.lat() + 0.005 ||
            marcadores[marcadoresVisibles[i]].position.lng() <= sw.lng() - 0.005 ||
            marcadores[marcadoresVisibles[i]].position.lng() >= ne.lng() + 0.005
        ) {
            marcadores[marcadoresVisibles[i]].setMap(null)
        }
    }
}

function handleZoom() {
    if (paradaActive) return

    const mapZoom = map.getZoom()

    if (mapZoom >= 17) {
        return
    }

    for (var i = 0; i < marcadoresVisibles.length; i++) {
        marcadores[marcadoresVisibles[i]].setMap(null)
    }

    marcadoresVisibles = []
}

async function getBuses(stopId) {
    if (paradaActive) return

    const requestLineas = await fetch(`http://localhost:3000/busstops/${stopId}/lines`)
    lineas = await requestLineas.json()

    clearInterval(updateBusesInterval)
    clearInterval(updateBusesLinesInterval)

    listLines(lineas, stopId)

    const busesPosList = await getPosition(stopId)
    hideMarkers(stopId)
    showBuses(busesPosList)

    updateBuses = true
    showBusesDaemon(stopId)
}

function listLines(lineas, stopId) {
    const linesList = document.getElementById("buses-list")
    linesList.innerHTML = ""

    lineas.forEach(linea => {
        const lineButton = document.createElement("a")
        lineButton.classList.add("list-group-item")
        lineButton.classList.add("list-group-item-action")
        lineButton.innerText = linea.line
        lineButton.setAttribute("data-line", linea.line)
        linesList.appendChild(lineButton)
    })

    linesList.querySelectorAll("a").forEach(e => {
        e.addEventListener("click", (e) => handleSelection(e, stopId))
    })
}

function hideListaLineas() {
    document.getElementById("buses-list").innerHTML = ""
}

function hideMarkers(stopId) {
    for (var i = 0; i < marcadoresVisibles.length; i++) {
        if (marcadores[marcadoresVisibles[i]].stopId != stopId) {
            marcadores[marcadoresVisibles[i]].setMap(null)
        }
    }
}

async function getPosition(stopId) {
    const busesPos = await fetch(`http://localhost:3000/buses/${stopId}`)
    const busesPosList = await busesPos.json()

    return busesPosList
}

async function showBuses(busesPosList) {
    paradaActive = true

    busesPosList.forEach(bus => {
        const position = { lat: bus.location.coordinates[1], lng: bus.location.coordinates[0] }

        const iconoBus = {
            url: "./media/bus.png",
            scaledSize: new google.maps.Size(30, 30)
        }

        const infowindow = new google.maps.InfoWindow({
            content: `${bus.line} - ${bus.destination}`,
            busId: bus.busId
        });

        const marker = new google.maps.Marker({
            position,
            icon: iconoBus,
            map
        })

        google.maps.event.addListener(marker, 'click', function () {
            infowindow.open(map, marker)
            handleInfoWindow(bus.busId)
        })

        marcadoresBuses.push(marker)
        infoWindows.push(infowindow)
    })
}

function showBusesDaemon(stopId) {
    updateBusesInterval = setInterval(async () => {
        const busesPosList = await getPosition(stopId)
        hideMarkers(stopId)
        hideBuses()
        showBuses(busesPosList)
    }, 10000)
}

function hideBuses() {
    marcadoresBuses.forEach(marcador => {
        marcador.setMap(null)
    })

    marcadoresBuses = []
    infoWindows = []
}

function handleInfoWindow(busId) {
    infoWindows.forEach((infoWindow) => {
        if (infoWindow.busId != busId) {
            infoWindow.close()
        }
    })
}

async function busesLines(stopId) {
    const requestParadas = await fetch(`http://localhost:3000/buses/${stopId}/${item.target.getAttribute("data-line")}`)
    const buses = await requestParadas.json()

    return buses
}

async function handleSelection(item, stopId) {
    document.getElementById("buses-list").querySelectorAll("a").forEach(e => {
        e.classList.remove("active")
    })

    item.target.classList.add("active")

    const buses = await busesLines(stopId)
    console.log(buses)

    clearInterval(updateBusesInterval)
    hideMarkers(stopId)
    hideBuses()
    showBuses(buses)
    showBusesLinesDaemon(stopId)
}

function showBusesLinesDaemon(stopId) {
    updateBusesLinesInterval = setInterval(async () => {
        const busesPosList = await busesLines()
        hideMarkers(stopId)
        hideBuses()
        showBuses(busesPosList)
    }, 10000)
}

window.onload = () => {
    initMap()
    loadParadas()
}