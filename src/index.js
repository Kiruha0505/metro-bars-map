import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';
import stationsData from './data/stations.csv';
import barsData from './data/bars.json';

let map;
let currentLayer = 'stations';
let markers = [];
let filteredData = [];
let presentationTimer = null;
let presentationIndex = 0;

//новые маркеты тк после импорта карты полетели стандартные
function createColoredIcon(color) {
    return L.divIcon({
        html: `<div style="
            background-color: ${color};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        "></div>`,
        className: 'custom-marker',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -13]
    });
}

function initMap() {
    let savedState = loadSavedState();
    if (savedState) {
        map = L.map('map').setView(savedState.center, savedState.zoom);
        currentLayer = savedState.layer;
        document.getElementById(currentLayer + 'Btn').checked = true;
        if (savedState.filter) {
            document.getElementById('searchInput').value = savedState.filter;
        }
    } else {
        map = L.map('map').setView([55.7558, 37.6173], 11);
    }
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    }).addTo(map);
    map.on('moveend', saveMapPosition);
    loadData();
}

function saveState() {
    let center = map.getCenter();
    let state = {
        center: [center.lat, center.lng],
        zoom: map.getZoom(),
        layer: currentLayer,
        filter: document.getElementById('searchInput').value
    };
    localStorage.setItem('mapState', JSON.stringify(state));
}
function loadSavedState() {
    let saved = localStorage.getItem('mapState');
    if (saved) {
        return JSON.parse(saved);
    }
    return null;
}
function saveMapPosition() {
    saveState();
}
//данные
function loadData(){
    if (currentLayer === 'stations'){
        filteredData = stationsData;
    } else{
        filteredData = barsData.features;
    }
    updateMap();
    updateTable();
}

function updateMap(){
    for (let i = 0; i < markers.length; i++) {
        map.removeLayer(markers[i]);
    }
    markers = [];
    //+ новые маркеры
    for (let i = 0; i < filteredData.length; i++){
        let item = filteredData[i];
        let lat, lng, name;
        
        if (currentLayer === 'stations'){
            lat = parseFloat(item.lat);
            lng = parseFloat(item.lon);
            name = item.name_ru;
        } else {  
            lng = item.geometry.coordinates[0];
            lat = item.geometry.coordinates[1];
            name = item.properties.name;
        }
        let icon;
        if (currentLayer === 'stations') {
            icon = createColoredIcon('#b70f0f');
        } else {
            icon = createColoredIcon('#8d9109');
        }
        let marker = L.marker([lat, lng], { icon }).addTo(map);
        let popupText = '';
        if (currentLayer === 'stations') {
            popupText =`
            <b>${name}</b>
            <hr>
            <div>Английское названеи: ${item.name_en}</div>
            <div>Линия: ${item.id_line}</div>
            <div>Координаты: ${item.lat}, ${item.lon}</div>`;
        } else {
            let note = item.properties.note ? item.properties.note : 'нет';
            popupText =`
            <b>${name}</b>
            <hr>
            <div>Адрес: ${item.properties.address}</div>
            <div>Примечание: ${note}</div>
            <div>Координаты: ${item.geometry.coordinates[1].toFixed(6)}, ${item.geometry.coordinates[0].toFixed(6)}</div>`;
        }
        marker.bindPopup(popupText);
        markers.push(marker);
    }
}

function updateTable(){
    let tableBody = document.getElementById('tableBody');
    let tableHeader = document.getElementById('tableHeader');
    tableBody.innerHTML = '';    
    if (currentLayer === 'stations'){
        tableHeader.innerHTML = `
            <th>Название (рус)</th>
            <th>Название (англ)</th>
            <th>Ветка метро</th>
            <th>Координаты</th>
        `;
        for (let i = 0; i < filteredData.length; i++) {
            let item = filteredData[i];
            let row = document.createElement('tr');
            row.onclick = function() { zoomToItem(i); };
            row.innerHTML = `
                <td><strong>${item.name_ru}</strong></td>
                <td>${item.name_en}</td>
                <td>Линия ${item.id_line}</td>
                <td>${parseFloat(item.lat).toFixed(6)}, ${parseFloat(item.lon).toFixed(6)}</td>
            `;
            
            tableBody.appendChild(row);
        }
    }
    else if (currentLayer === 'bars'){
        tableHeader.innerHTML = `
            <th>Название бара</th>
            <th>Адрес</th>
            <th>Примечание</th>
            <th>Координаты</th>
        `;
        for (let i = 0; i < filteredData.length; i++){
            let item = filteredData[i];
            let row = document.createElement('tr');
            row.onclick = function() { zoomToItem(i); };
            let lat = item.geometry.coordinates[1];
            let lng = item.geometry.coordinates[0];
            let note = item.properties.note || '—';
            row.innerHTML = `
                <td><strong>${item.properties.name}</strong></td>
                <td>${item.properties.address}</td>
                <td>${note}</td>
                <td>${lat.toFixed(6)}, ${lng.toFixed(6)}</td>`;
            tableBody.appendChild(row);
        }
    }
}
//зум
function zoomToItem(index){
    if (index < 0 || index >= markers.length) return;
    
    let marker = markers[index];
    map.setView(marker.getLatLng(), 16);
    marker.openPopup();
    saveState();
}
//филтр
function filterData(){
let searchText = document.getElementById('searchInput').value.toLowerCase();  
    if (searchText === '') {
        loadData();
    } else {
        if (currentLayer === 'stations'){
            filteredData = stationsData.filter(function(station){
                return station.name_ru.toLowerCase().includes(searchText) ||
                       station.name_en.toLowerCase().includes(searchText);
            });
        } else{
            filteredData = barsData.features.filter(function(bar){
                return bar.properties.name.toLowerCase().includes(searchText);
            });
        }
        updateMap();
        updateTable();
    }
    saveState();
} 

function startPresentation(){    
    document.getElementById('presentBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-block';
    presentationIndex = 0;
    zoomToItem(presentationIndex);
    presentationTimer = setInterval(function() {
        presentationIndex++;
        if (presentationIndex >= filteredData.length){
            presentationIndex = 0;
        }
        zoomToItem(presentationIndex);
    }, 3000);
}

function stopPresentation(){
    if (presentationTimer) {
        clearInterval(presentationTimer);
        presentationTimer = null;
    }
    document.getElementById('presentBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';
}


initMap();

document.getElementById('stationsBtn').onclick = function(){
    currentLayer = 'stations';
    loadData();
    document.getElementById('searchInput').value = '';
    saveState();
};

document.getElementById('barsBtn').onclick = function(){
    currentLayer = 'bars';
    loadData();
    document.getElementById('searchInput').value = '';
    saveState();
};

document.getElementById('searchInput').oninput = filterData;
document.getElementById('presentBtn').onclick = startPresentation;
document.getElementById('stopBtn').onclick = stopPresentation;