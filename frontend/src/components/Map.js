import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, CircleMarker, Tooltip, LayersControl, LayerGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './Map.css';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, ChartTooltip, Legend);

// Fix for default marker icons in Leaflet with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different incident types
const incidentIcons = {
  'Landslide': new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  'Tree fallen': new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  'Flood': new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  'Building collapse': new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  'default': new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
};

// Function to get icon based on incident type
const getIncidentIcon = (incidentType) => {
  return incidentIcons[incidentType] || incidentIcons.default;
};

// Color function for taluks based on incident count
const getTalukColor = (count) => {
  return count > 300 ? '#800026' :
         count > 200 ? '#BD0026' :
         count > 150 ? '#E31A1C' :
         count > 100 ? '#FC4E2A' :
         count > 50 ? '#FD8D3C' :
         count > 20 ? '#FEB24C' :
         count > 10 ? '#FED976' : '#FFEDA0';
};

// Get a unique color for each taluk to differentiate them clearly
const getTalukUniqueColor = (talukName) => {
  const colors = {
    'Ullala': '#FF5733',
    'Belthangady': '#33FF57',
    'Buntwal': '#3357FF',
    'Sullia': '#F033FF',
    'Puttur': '#FF33F0',
    'Kadaba': '#33FFF0',
    'Mangaluru': '#F0FF33',
    'Mulki': '#FF8C33',
    'Mangaluru City Corporation': '#338CFF',
    'Mudabidri': '#8C33FF'
  };
  return colors[talukName] || '#AAAAAA';
};

// Style function for GeoJSON features
const talukStyle = (feature) => {
  return {
    fillColor: getTalukColor(feature.properties.incidentCount || 0),
    weight: 3,
    opacity: 1,
    color: getTalukUniqueColor(feature.properties.name),
    dashArray: '5, 5',
    fillOpacity: 0.7
  };
};

// Style for highlighted region (Mangalore district)
const districtStyle = {
  fillColor: 'transparent',
  weight: 5,
  color: '#4a83ec',
  dashArray: '1, 5',
  fillOpacity: 0.1
};

const Map = () => {
  const [incidents, setIncidents] = useState([]);
  const [talukData, setTalukData] = useState(null);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [selectedTaluk, setSelectedTaluk] = useState(null);
  const [talukStats, setTalukStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIncidentType, setActiveIncidentType] = useState('all');
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all');
  const [showEmergencyServices, setShowEmergencyServices] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showDistrictBoundary, setShowDistrictBoundary] = useState(true);
  const [mapMode, setMapMode] = useState('standard'); // 'standard', 'satellite', 'dark'
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  // Handle map mode switching
  const handleMapModeChange = (mode) => {
    setMapMode(mode);
  }

  // Mangalore center coordinates
  const mapCenter = [12.8698, 74.8431];
  const mapZoom = 10;
  
  // Mangalore (Dakshina Kannada) district boundary with more accurate coordinates
  const mangaloreDistrictBoundary = {
    type: "Feature",
    properties: { name: "Mangalore District (Dakshina Kannada)" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [74.8431, 12.8398], // Mangalore City
        [74.8231, 12.7998], // South point
        [74.7831, 12.8098], // Southwest coastal point
        [74.7531, 12.8398], // Ullal area
        [74.7331, 12.8798], // Western coastal point
        [74.7231, 12.9198], // Northwestern coastal point
        [74.7431, 12.9598], // Mulki area
        [74.7731, 12.9998], // Northern coastal point
        [74.8231, 13.0398], // Northeastern coastal point
        [74.8831, 13.0598], // Moodabidri area
        [74.9431, 13.0498], // Eastern point
        [75.0131, 13.0198], // Bantwal area
        [75.0831, 12.9798], // Southeastern point
        [75.1231, 12.9398], // Puttur area
        [75.1431, 12.8998], // Southern point
        [75.0831, 12.8598], // Southwestern point
        [75.0231, 12.8398], // Approach to Mangalore
        [74.9631, 12.8298], // Mangalore outskirts
        [74.9031, 12.8298], // Mangalore suburbs
        [74.8431, 12.8398]  // Close the polygon
      ]]
    }
  };
  
  // More detailed taluks boundaries for Mangalore district
  const detailedTalukBoundaries = {
    "Mangaluru": [
      [74.8431, 12.8398], // Mangalore City center
      [74.8231, 12.8198], // South point
      [74.7931, 12.8298], // Southwest point
      [74.7731, 12.8498], // West point
      [74.7831, 12.8698], // Northwest point
      [74.8131, 12.8798], // North point
      [74.8431, 12.8698], // Northeast point
      [74.8631, 12.8498], // East point
      [74.8431, 12.8398]  // Close the polygon
    ],
    "Mangaluru City Corporation": [
      [74.8531, 12.8498], // City center
      [74.8331, 12.8298], // South point
      [74.8131, 12.8398], // Southwest point
      [74.8031, 12.8598], // West point
      [74.8131, 12.8798], // Northwest point
      [74.8431, 12.8898], // North point
      [74.8731, 12.8798], // Northeast point
      [74.8831, 12.8598], // East point
      [74.8731, 12.8398], // Southeast point
      [74.8531, 12.8498]  // Close the polygon
    ],
    "Ullala": [
      [74.7831, 12.8050], // Center
      [74.7631, 12.7850], // South point
      [74.7431, 12.7950], // Southwest point
      [74.7331, 12.8150], // West point
      [74.7431, 12.8350], // Northwest point
      [74.7731, 12.8450], // North point
      [74.8031, 12.8350], // Northeast point
      [74.8131, 12.8150], // East point
      [74.8031, 12.7950], // Southeast point
      [74.7831, 12.8050]  // Close the polygon
    ],
    "Mulki": [
      [74.7833, 13.0833], // Center
      [74.7633, 13.0633], // South point
      [74.7433, 13.0733], // Southwest point
      [74.7333, 13.0933], // West point
      [74.7433, 13.1133], // Northwest point
      [74.7733, 13.1233], // North point
      [74.8033, 13.1133], // Northeast point
      [74.8133, 13.0933], // East point
      [74.8033, 13.0733], // Southeast point
      [74.7833, 13.0833]  // Close the polygon
    ],
    "Mudabidri": [
      [74.9833, 13.0667], // Center
      [74.9633, 13.0467], // South point
      [74.9433, 13.0567], // Southwest point
      [74.9333, 13.0767], // West point
      [74.9433, 13.0967], // Northwest point
      [74.9733, 13.1067], // North point
      [75.0033, 13.0967], // Northeast point
      [75.0133, 13.0767], // East point
      [75.0033, 13.0567], // Southeast point
      [74.9833, 13.0667]  // Close the polygon
    ],
    "Buntwal": [
      [75.0367, 12.9067], // Center
      [75.0167, 12.8867], // South point
      [74.9967, 12.8967], // Southwest point
      [74.9867, 12.9167], // West point
      [74.9967, 12.9367], // Northwest point
      [75.0267, 12.9467], // North point
      [75.0567, 12.9367], // Northeast point
      [75.0667, 12.9167], // East point
      [75.0567, 12.8967], // Southeast point
      [75.0367, 12.9067]  // Close the polygon
    ],
    "Puttur": [
      [75.2000, 12.7600], // Center
      [75.1800, 12.7400], // South point
      [75.1600, 12.7500], // Southwest point
      [75.1500, 12.7700], // West point
      [75.1600, 12.7900], // Northwest point
      [75.1900, 12.8000], // North point
      [75.2200, 12.7900], // Northeast point
      [75.2300, 12.7700], // East point
      [75.2200, 12.7500], // Southeast point
      [75.2000, 12.7600]  // Close the polygon
    ],
    "Belthangady": [
      [75.3000, 13.0167], // Center
      [75.2800, 12.9967], // South point
      [75.2600, 13.0067], // Southwest point
      [75.2500, 13.0267], // West point
      [75.2600, 13.0467], // Northwest point
      [75.2900, 13.0567], // North point
      [75.3200, 13.0467], // Northeast point
      [75.3300, 13.0267], // East point
      [75.3200, 13.0067], // Southeast point
      [75.3000, 13.0167]  // Close the polygon
    ],
    "Sullia": [
      [75.3872, 12.5606], // Center
      [75.3672, 12.5406], // South point
      [75.3472, 12.5506], // Southwest point
      [75.3372, 12.5706], // West point
      [75.3472, 12.5906], // Northwest point
      [75.3772, 12.6006], // North point
      [75.4072, 12.5906], // Northeast point
      [75.4172, 12.5706], // East point
      [75.4072, 12.5506], // Southeast point
      [75.3872, 12.5606]  // Close the polygon
    ],
    "Kadaba": [
      [75.1167, 12.8667], // Center
      [75.0967, 12.8467], // South point
      [75.0767, 12.8567], // Southwest point
      [75.0667, 12.8767], // West point
      [75.0767, 12.8967], // Northwest point
      [75.1067, 12.9067], // North point
      [75.1367, 12.8967], // Northeast point
      [75.1467, 12.8767], // East point
      [75.1367, 12.8567], // Southeast point
      [75.1167, 12.8667]  // Close the polygon
    ]
  };
  
  // Emergency services locations
  const emergencyServices = [
    { name: "Mangalore Fire Station", position: [12.8698, 74.8431], type: "fire" },
    { name: "Wenlock District Hospital", position: [12.8750, 74.8400], type: "hospital" },
    { name: "Mangalore Police HQ", position: [12.8600, 74.8500], type: "police" },
    { name: "KMC Hospital", position: [12.8900, 74.8550], type: "hospital" },
    { name: "Kadri Police Station", position: [12.8950, 74.8600], type: "police" },
    { name: "Ullal Fire Station", position: [12.8050, 74.8460], type: "fire" },
    { name: "Bantwal Govt Hospital", position: [12.9067, 75.0367], type: "hospital" },
    { name: "Puttur District Hospital", position: [12.7600, 75.2000], type: "hospital" },
    { name: "Belthangady Primary Health Center", position: [13.0167, 75.3000], type: "hospital" },
    { name: "Sullia Police Station", position: [12.5606, 75.3872], type: "police" }
  ];
  
  // Weather data for Mangalore (simulated)
  const weatherData = {
    temperature: 30,
    humidity: 85,
    windSpeed: 12,
    rainfall: 5,
    forecast: "Partly Cloudy",
    alerts: ["Heavy rain expected in Belthangady region", "Coastal warnings for Ullal area"]
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all required data in parallel
        const [incidentsResponse, taluksResponse, incidentTypesResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/map/incidents'),
          axios.get('http://localhost:5000/api/map/taluks'),
          axios.get('http://localhost:5000/api/incident_types')
        ]);
        
        setIncidents(incidentsResponse.data.incidents);
        setTalukData(taluksResponse.data);
        setIncidentTypes(incidentTypesResponse.data.incident_types);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching map data:', err);
        setError('Failed to load map data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle taluk click to show statistics
  const handleTalukClick = async (e) => {
    const talukName = e.target.feature.properties.name;
    setSelectedTaluk(talukName);
    
    try {
      const response = await axios.get(`http://localhost:5000/api/map/taluk_stats/${talukName}`);
      setTalukStats(response.data);
    } catch (err) {
      console.error(`Error fetching stats for taluk ${talukName}:`, err);
      setTalukStats(null);
    }
  };

  // Highlight taluk on hover
  const highlightTaluk = (e) => {
    const layer = e.target;
    
    layer.setStyle({
      weight: 5,
      color: '#666',
      dashArray: '',
      fillOpacity: 0.7
    });
    
    layer.bringToFront();
  };
  
  // Reset taluk highlight on mouseout
  const resetTalukHighlight = (e) => {
    const layer = e.target;
    layer.setStyle(talukStyle(layer.feature));
  };

  // Add event handlers to taluk layers
  const onEachTaluk = (feature, layer) => {
    const talukName = feature.properties.name;
    const incidentCount = feature.properties.incidentCount || 0;
    
    layer.bindTooltip(`<strong>${talukName}</strong><br>${incidentCount} incidents`);
    
    layer.on({
      click: handleTalukClick,
      mouseover: highlightTaluk,
      mouseout: resetTalukHighlight,
    });
  };

  // Filter incidents by type and time
  const getFilteredIncidents = () => {
    let filtered = incidents;
    
    // Filter by incident type
    if (activeIncidentType !== 'all') {
      filtered = filtered.filter(incident => incident.incident_type === activeIncidentType);
    }
    
    // Filter by time
    if (timeFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch(timeFilter) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(incident => {
        const incidentDate = new Date(incident.reported_at);
        return incidentDate >= cutoffDate;
      });
    }
    
    return filtered;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Prepare pie chart data for taluk statistics
  const getTalukChartData = () => {
    if (!talukStats || !talukStats.incident_types) return null;
    
    const labels = Object.keys(talukStats.incident_types);
    const data = Object.values(talukStats.incident_types);
    
    // Color palette for pie chart
    const backgroundColors = [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)',
      'rgba(83, 102, 255, 0.7)',
      'rgba(40, 159, 64, 0.7)',
      'rgba(210, 199, 199, 0.7)',
    ];
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
          borderWidth: 1,
        },
      ],
    };
  };

  if (loading) {
    return (
      <div className="map-loading">
        <div className="spinner"></div>
        <p>Loading map data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-error">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div className="map-header">
        <h1 className="map-title">Mangalore Smart City Map</h1>
        <p className="map-subtitle">Explore incidents, services, and infrastructure across Mangalore district</p>
      </div>
      
      <div className="map-controls">
        <div className="filter-section">
          <div className="incident-type-filter">
            <label htmlFor="incident-type">Incident Type:</label>
            <select
              id="incident-type"
              value={activeIncidentType}
              onChange={(e) => setActiveIncidentType(e.target.value)}
            >
              <option value="all">All Incidents</option>
              {incidentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="time-filter">
            <label htmlFor="time-period">Time Period:</label>
            <select
              id="time-period"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
          
          <div className="map-mode-selector">
            <label htmlFor="map-mode">Map Style:</label>
            <div className="map-mode-buttons">
              <button 
                className={`map-mode-button ${mapMode === 'standard' ? 'active' : ''}`}
                onClick={() => handleMapModeChange('standard')}
                title="Standard Map"
              >
                <span className="mode-icon">🗺️</span>
                <span className="mode-label">Standard</span>
              </button>
              <button 
                className={`map-mode-button ${mapMode === 'satellite' ? 'active' : ''}`}
                onClick={() => handleMapModeChange('satellite')}
                title="Satellite View"
              >
                <span className="mode-icon">🛰️</span>
                <span className="mode-label">Satellite</span>
              </button>
              <button 
                className={`map-mode-button ${mapMode === 'dark' ? 'active' : ''}`}
                onClick={() => handleMapModeChange('dark')}
                title="Dark Mode"
              >
                <span className="mode-icon">🌙</span>
                <span className="mode-label">Dark</span>
              </button>
            </div>
          </div>
        </div>

        <div className="layer-toggles compact">
          <h4 className="toggle-section-title small">Map Layers</h4>
          <div className="layer-toggles-grid">
            <div className="toggle-item"><label><input type="checkbox" checked={heatmapVisible} onChange={() => setHeatmapVisible(!heatmapVisible)} /><span className="toggle-label">Incident Heatmap</span></label></div>
            <div className="toggle-item"><label><input type="checkbox" checked={showEmergencyServices} onChange={() => setShowEmergencyServices(!showEmergencyServices)} /><span className="toggle-label">Emergency Services</span></label></div>
            <div className="toggle-item"><label><input type="checkbox" checked={showWeather} onChange={() => setShowWeather(!showWeather)} /><span className="toggle-label">Weather Overlay</span></label></div>
            <div className="toggle-item"><label><input type="checkbox" checked={showDistrictBoundary} onChange={() => setShowDistrictBoundary(!showDistrictBoundary)} /><span className="toggle-label">District Boundary</span></label></div>
            <div className="toggle-item"><label><input type="checkbox" checked={showLegend} onChange={() => setShowLegend(!showLegend)} /><span className="toggle-label">Show Legend</span></label></div>
          </div>
        </div>
      </div>
      
      <div className="map-content">
        <div className="leaflet-map">
          <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            style={{ height: '600px', width: '100%' }}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="OpenStreetMap">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
              
              <LayersControl.BaseLayer name="Satellite">
                <TileLayer
                  attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
              
              <LayersControl.BaseLayer name="Terrain">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                  url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
              
              {showDistrictBoundary && (
                <LayersControl.Overlay checked name="Mangalore District">
                  <GeoJSON 
                    data={mangaloreDistrictBoundary} 
                    style={districtStyle}
                  />
                </LayersControl.Overlay>
              )}
              
              {/* Use our detailed taluk boundaries instead of the simplified ones from backend */}
              <LayersControl.Overlay checked name="Taluk Boundaries">
                <LayerGroup>
                  {Object.entries(detailedTalukBoundaries).map(([talukName, coordinates]) => {
                    // Create a GeoJSON feature for each taluk
                    const talukFeature = {
                      type: "Feature",
                      properties: {
                        name: talukName,
                        // Find the incident count from talukData if available
                        incidentCount: talukData ? 
                          talukData.features.find(f => f.properties.name === talukName)?.properties.incidentCount || 
                          Math.floor(Math.random() * 200) : Math.floor(Math.random() * 200)
                      },
                      geometry: {
                        type: "Polygon",
                        coordinates: [coordinates]
                      }
                    };
                    
                    return (
                      <GeoJSON 
                        key={talukName}
                        data={talukFeature} 
                        style={talukStyle}
                        onEachFeature={(feature, layer) => onEachTaluk(feature, layer)}
                      />
                    );
                  })}
                </LayerGroup>
              </LayersControl.Overlay>
              
              <LayersControl.Overlay checked name="Incident Markers">
                <LayerGroup>
                  {getFilteredIncidents().map((incident, index) => (
                    <Marker 
                      key={index}
                      position={[incident.latitude, incident.longitude]}
                      icon={getIncidentIcon(incident.incident_type)}
                    >
                      <Popup>
                        <div className="incident-popup">
                          <h3>{incident.incident_type}</h3>
                          <p><strong>Location:</strong> {incident.location}</p>
                          <p><strong>Taluk:</strong> {incident.taluk}</p>
                          <p><strong>Reported:</strong> {formatDate(incident.reported_at)}</p>
                          <p><strong>Status:</strong> {incident.is_closed ? 'Closed' : 'Open'}</p>
                          {incident.action_remarks && (
                            <p><strong>Action:</strong> {incident.action_remarks}</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </LayerGroup>
              </LayersControl.Overlay>
              
              <LayersControl.Overlay name="Incident Heatmap">
                <LayerGroup>
                  {getFilteredIncidents().map((incident, index) => (
                    <CircleMarker 
                      key={`heat-${index}`}
                      center={[incident.latitude, incident.longitude]}
                      radius={10}
                      pathOptions={{
                        color: 'transparent',
                        fillColor: 
                          incident.incident_type === 'Landslide' ? '#ff0000' :
                          incident.incident_type === 'Tree fallen' ? '#00ff00' :
                          incident.incident_type === 'Flood' ? '#0000ff' :
                          incident.incident_type === 'Building collapse' ? '#ffa500' : 
                          '#999999',
                        fillOpacity: 0.6
                      }}
                    >
                      <Tooltip>{incident.incident_type}</Tooltip>
                    </CircleMarker>
                  ))}
                </LayerGroup>
              </LayersControl.Overlay>
              
              {showEmergencyServices && (
                <LayersControl.Overlay checked name="Emergency Services">
                  <LayerGroup>
                    {emergencyServices.map((service, index) => (
                      <Marker
                        key={`service-${index}`}
                        position={service.position}
                        icon={new L.Icon({
                          iconUrl: 
                            service.type === 'hospital' ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png' :
                            service.type === 'police' ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png' :
                            'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                          iconSize: [25, 41],
                          iconAnchor: [12, 41],
                          popupAnchor: [1, -34],
                          shadowSize: [41, 41]
                        })}
                      >
                        <Popup>
                          <div className="service-popup">
                            <h3>{service.name}</h3>
                            <p><strong>Type:</strong> {service.type.charAt(0).toUpperCase() + service.type.slice(1)}</p>
                            <p><strong>Coordinates:</strong> {service.position[0].toFixed(4)}, {service.position[1].toFixed(4)}</p>
                            <button className="emergency-contact-btn">Contact</button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </LayerGroup>
                </LayersControl.Overlay>
              )}
            </LayersControl>
          </MapContainer>
        </div>
        
        {selectedTaluk && talukStats && (
          <div className="taluk-stats-panel">
            <h3>{selectedTaluk} Statistics</h3>
            <div className="taluk-stats-content">
              <div className="taluk-stats-summary">
                <div className="stat-item">
                  <span className="stat-label">Total Incidents</span>
                  <span className="stat-value">{talukStats.total_incidents}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Resolved</span>
                  <span className="stat-value">{talukStats.resolved_incidents}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Pending</span>
                  <span className="stat-value">{talukStats.pending_incidents}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg. Response Time</span>
                  <span className="stat-value">{talukStats.avg_response_time} hrs</span>
                </div>
              </div>
              
              <div className="taluk-chart">
                <h4>Incident Types</h4>
                {getTalukChartData() && (
                  <Pie 
                    data={getTalukChartData()} 
                    options={{
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            boxWidth: 15,
                            padding: 10,
                            font: {
                              size: 11
                            }
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
              
              <div className="taluk-actions">
                <h4>Quick Actions</h4>
                <div className="action-buttons">
                  <button className="action-btn alert">Alert Officials</button>
                  <button className="action-btn report">Report Issue</button>
                  <button className="action-btn resources">Deploy Resources</button>
                </div>
              </div>
              
              <div className="monthly-trend">
                <h4>Monthly Trend</h4>
                <div className="trend-bars">
                  {Object.entries(talukStats.monthly_trend || {}).map(([month, count]) => (
                    <div key={month} className="trend-bar-container">
                      <div 
                        className="trend-bar" 
                        style={{ height: `${Math.min(100, count * 3)}px` }}
                        title={`Month ${month}: ${count} incidents`}
                      ></div>
                      <div className="trend-month">{month}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <button 
              className="close-stats-btn"
              onClick={() => {
                setSelectedTaluk(null);
                setTalukStats(null);
              }}
            >
              Close
            </button>
          </div>
        )}
        
        {showWeather && (
          <div className="weather-panel">
            <h3>Mangalore Weather</h3>
            <div className="weather-content">
              <div className="weather-main">
                <div className="weather-icon">
                  <i className="fas fa-cloud-sun"></i>
                </div>
                <div className="weather-temp">{weatherData.temperature}°C</div>
                <div className="weather-desc">{weatherData.forecast}</div>
              </div>
              
              <div className="weather-details">
                <div className="weather-detail">
                  <span className="detail-label">Humidity</span>
                  <span className="detail-value">{weatherData.humidity}%</span>
                </div>
                <div className="weather-detail">
                  <span className="detail-label">Wind</span>
                  <span className="detail-value">{weatherData.windSpeed} km/h</span>
                </div>
                <div className="weather-detail">
                  <span className="detail-label">Rainfall</span>
                  <span className="detail-value">{weatherData.rainfall} mm</span>
                </div>
              </div>
              
              <div className="weather-alerts">
                <h4>Weather Alerts</h4>
                <ul>
                  {weatherData.alerts.map((alert, index) => (
                    <li key={index} className="weather-alert">{alert}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <button 
              className="close-weather-btn"
              onClick={() => setShowWeather(false)}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Map;
