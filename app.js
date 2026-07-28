// Pune Urban Heat Framework - Modular Web GIS App Engine
let map;
let adminGeoJSON = null;
let cityGeoJSON = null;
let activeAdminLayer = null;
let activeCityLayer = null;
let activeRasterLayer = null;
let activeRasterUrl = null;

let currentModule = 'm1';
let currentLayer = 'ward_risk';

// Layer configuration


const TIFF_LAYERS = {
  hot_persistence: 'Pune_HotPersistence_2013_2026.tif',
  hotspot_evolution: 'Pune_HotspotEvolution_2013_2026.tif',
  gi_opportunity: 'Pune_GIOpportunity_bluegreen_2021_2026.tif'
};

function initMap() {
  map = L.map('map', { zoomControl: false }).setView([18.5204, 73.8567], 11);
  L.control.zoom({ position: 'topleft' }).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB & OSM',
    maxZoom: 18
  }).addTo(map);

  // Load both boundaries
  Promise.all([
    fetch('data/pune_admin.geojson').then(r => r.json()),
    fetch('data/pune_city.geojson').then(r => r.json())
  ]).then(([adminData, cityData]) => {
    adminGeoJSON = adminData;
    cityGeoJSON = cityData;
    setupEventListeners();
    updateView();
  }).catch(err => console.error("Error loading GeoJSON boundaries:", err));
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.nav-tab').forEach(btn => {
    if (btn.classList.contains('external-link')) return;
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentModule = e.target.getAttribute('data-target');
      
      document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('panel-' + currentModule).classList.add('active');
      
      // Auto-select first layer of this module
      let firstBtn = document.querySelector('#panel-' + currentModule + ' .layer-btn');
      if (firstBtn) {
        setLayer(firstBtn.getAttribute('data-layer'));
      }
    });
  });

  // Layer toggles
  document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      setLayer(e.target.getAttribute('data-layer'));
    });
  });

  // Lightbox functionality
  document.querySelectorAll('.figure-container img, .explanation-box img').forEach(img => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => {
      openLightbox(img.src);
    });
  });
}

function openLightbox(src) {
  let lb = document.getElementById('lightbox-modal');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox-modal';
    lb.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;';
    
    let closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:20px;right:30px;color:#fff;font-size:40px;cursor:pointer;';
    closeBtn.onclick = () => { lb.style.display = 'none'; };
    
    let img = document.createElement('img');
    img.id = 'lightbox-img';
    img.style.cssText = 'max-width:90%;max-height:90%;object-fit:contain;border:2px solid #fff;border-radius:8px;';
    
    lb.appendChild(closeBtn);
    lb.appendChild(img);
    document.body.appendChild(lb);
    
    lb.onclick = (e) => { if(e.target === lb) lb.style.display = 'none'; };
  }
  document.getElementById('lightbox-img').src = src;
  lb.style.display = 'flex';
}

function setLayer(layerKey) {
  currentLayer = layerKey;
  
  // Update active button state
  document.querySelectorAll('#panel-' + currentModule + ' .layer-btn').forEach(b => b.classList.remove('active'));
  let activeBtn = document.querySelector(`.layer-btn[data-layer="${layerKey}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  updateView();
}

function clearMap() {
  if (activeAdminLayer) { map.removeLayer(activeAdminLayer); activeAdminLayer = null; }
  if (activeCityLayer) { map.removeLayer(activeCityLayer); activeCityLayer = null; }
  if (activeRasterLayer) { map.removeLayer(activeRasterLayer); activeRasterLayer = null; }
  document.getElementById('timelapse-container').style.display = 'none';
  document.getElementById('ward-hover-card').style.display = 'none';
}

function updateView() {
  if (!adminGeoJSON || !cityGeoJSON) return;
  clearMap();

  if (currentModule === 'm1') {
    renderM1();
  } else if (currentModule === 'm2') {
    if (currentLayer === 'thermal_timelapse') {
      document.getElementById('timelapse-container').style.display = 'flex';
    } else {
      renderCityBoundary();
      renderRaster();
    }
  } else if (currentModule === 'm4') {
    renderCityBoundary();
    renderRaster();
  }

  updateLegendAndExplanations();
}

function getM1Color(val, type) {
  if (type === 'ward_risk') {
    return val > 0.65 ? '#d7191c' : val > 0.55 ? '#fdae61' : val > 0.45 ? '#ffffbf' : val > 0.35 ? '#abd9e9' : '#2c7bb6';
  } else if (type === 'ward_vuln') {
    return val > 0.50 ? '#99000d' : val > 0.45 ? '#ef3b2c' : val > 0.40 ? '#fc9272' : val > 0.35 ? '#fcbba1' : '#fff5f0';
  } else if (type === 'ward_illit') {
    return val > 0.25 ? '#54278f' : val > 0.20 ? '#756bb1' : val > 0.15 ? '#9e9ac8' : val > 0.10 ? '#cbc9e2' : '#f2f0f7';
  }
  return '#333';
}

function renderM1() {
  activeAdminLayer = L.geoJSON(adminGeoJSON, {
    style: (feature) => {
      let p = feature.properties;
      let val = 0;
      if (currentLayer === 'ward_risk') val = p.HeatRisk || 0;
      else if (currentLayer === 'ward_vuln') val = p.V || 0;
      else if (currentLayer === 'ward_illit') val = p.illit_rate || 0;
      
      return { fillColor: getM1Color(val, currentLayer), weight: 1.5, opacity: 1, color: '#222', fillOpacity: 0.8 };
    },
    onEachFeature: (feature, layer) => {
      layer.on({
        mouseover: (e) => {
          let l = e.target;
          l.setStyle({ weight: 3, color: '#00f2fe', fillOpacity: 1 });
          l.bringToFront();
          showHoverCard(feature.properties);
        },
        mouseout: (e) => {
          activeAdminLayer.resetStyle(e.target);
          document.getElementById('ward-hover-card').style.display = 'none';
        }
      });
    }
  }).addTo(map);
  map.fitBounds(activeAdminLayer.getBounds());
}

function renderCityBoundary() {
  activeCityLayer = L.geoJSON(cityGeoJSON, {
    style: { fillColor: 'transparent', weight: 2, color: '#00f2fe', opacity: 0.8, fillOpacity: 0 }
  }).addTo(map);
  map.fitBounds(activeCityLayer.getBounds());
}

function renderRaster() {
  let file = null;
  let bandIndex = 0; // default 0

  if (currentModule === 'm2' || currentModule === 'm4') {
    file = TIFF_LAYERS[currentLayer];
  }

  if (!file) return;
  const fileUrl = 'data/' + file;

  // Track the expected raster URL to prevent race conditions
  const expectedUrl = fileUrl;
  activeRasterUrl = expectedUrl;
  const layerAtRenderTime = currentLayer;
  const moduleAtRenderTime = currentModule;

  // Use parseGeoraster directly on the URL to allow partial fetching if supported, 
  // or wrap in fetch if it's a smaller file. For multi-band, we use fetch arrayBuffer 
  // as python http server doesn't support ranges well by default, but we'll extract correctly.
  fetch(fileUrl)
    .then(r => r.arrayBuffer())
    .then(buf => {
      if (activeRasterUrl !== expectedUrl) return; // Ignore if user switched layers rapidly

      parseGeoraster(buf).then(georaster => {
        if (activeRasterUrl !== expectedUrl) return; // Re-check after parse
        if (activeRasterLayer) { map.removeLayer(activeRasterLayer); activeRasterLayer = null; }
        
        activeRasterLayer = new GeoRasterLayer({
          georaster: georaster,
          opacity: 0.85,
          resolution: 64, // Reduced resolution for better performance on large TIFFs
          pixelValuesToColorFn: vals => {
            let val = vals[0];

            if (val === georaster.noDataValue || val === undefined || isNaN(val) || val === 0) return null;

            if (layerAtRenderTime === 'gi_opportunity') {
              if (val <= 0.2) return null;
              return val > 0.7 ? '#006837' : val > 0.6 ? '#31a354' : val > 0.5 ? '#78c679' : val > 0.4 ? '#c2e699' : '#ffffcc';
            } 
            else if (layerAtRenderTime === 'hotspot_evolution' || layerAtRenderTime === 'hot_persistence') {
              return val > 4 ? '#bd0026' : val > 2 ? '#fd8d3c' : '#ffffb2';
            }
            return null;
          }
        });
        activeRasterLayer.addTo(map);
        activeRasterLayer.bringToFront();
      });
    }).catch(err => console.error("Error loading GeoTIFF:", file, err));
}

function showHoverCard(p) {
  const card = document.getElementById('ward-hover-card');
  const title = document.getElementById('hover-title');
  const content = document.getElementById('hover-content');
  
  title.innerText = p.Name || 'Ward';
  
  let html = '';
  if (currentLayer === 'ward_risk') {
    html = `
      <div class="hover-row"><span class="hover-lbl">Integrated Risk Score</span> <span class="hover-val val-high">${(p.HeatRisk||0).toFixed(3)}</span></div>
      <div class="hover-row"><span class="hover-lbl">Risk Rank</span> <span class="hover-val val-high">#${p.HeatRisk_rank||'N/A'}</span></div>
      <div class="hover-row"><span class="hover-lbl">Mean Summer LST</span> <span class="hover-val">${(p.ward_LST||0).toFixed(1)} &deg;C</span></div>
      <div class="hover-row"><span class="hover-lbl">Pop Density</span> <span class="hover-val">${Math.round(p._popdens||0).toLocaleString()} /km&sup2;</span></div>
    `;
  } else if (currentLayer === 'ward_vuln') {
    html = `
      <div class="hover-row"><span class="hover-lbl">Vulnerability Index (V)</span> <span class="hover-val val-high">${(p.V||0).toFixed(3)}</span></div>
      <div class="hover-row"><span class="hover-lbl">Illiteracy Rate</span> <span class="hover-val">${(p.illit_rate*100||0).toFixed(1)}%</span></div>
      <div class="hover-row"><span class="hover-lbl">Pop Density</span> <span class="hover-val">${Math.round(p._popdens||0).toLocaleString()} /km&sup2;</span></div>
    `;
  } else if (currentLayer === 'ward_illit') {
    html = `
      <div class="hover-row"><span class="hover-lbl">Illiteracy Rate</span> <span class="hover-val val-high">${(p.illit_rate*100||0).toFixed(1)}%</span></div>
      <div class="hover-row"><span class="hover-lbl">Vulnerability (V)</span> <span class="hover-val">${(p.V||0).toFixed(3)}</span></div>
    `;
  }
  
  content.innerHTML = html;
  card.style.display = 'block';
}

function updateLegendAndExplanations() {
  const legendTitle = document.getElementById('legend-title');
  const legendItems = document.getElementById('legend-items');
  let title = '', items = [];
  
  // Explanations logic
  const expBox = document.getElementById(`${currentModule}-explanation`);
  const figBox = document.getElementById(`${currentModule}-figure`);
  
  if (currentModule === 'm1') {
    if (currentLayer === 'ward_risk') {
      title = 'Heat Risk Score (H+E+V)';
      items = [ {c: '#d7191c', l: '> 0.65 (Extreme)'}, {c: '#fdae61', l: '0.55-0.65 (High)'}, {c: '#ffffbf', l: '0.45-0.55 (Moderate)'}, {c: '#abd9e9', l: '< 0.45 (Low)'} ];
      if (expBox) expBox.innerHTML = '<p>The Ward Heat Risk index is constructed using the ICCC AR5 framework. It combines Physical Hazard (LST), Exposure (Population Density), and Social Vulnerability.</p>';
      if (figBox) figBox.innerHTML = '<h4 class="figure-title">Ward Risk Decomposition</h4><img src="data/Fig_M5_Ward_Heat_Risk_Decomposition.png" style="width:100%; border-radius:4px; cursor:pointer;" onclick="openLightbox(this.src)">';
    } else if (currentLayer === 'ward_vuln') {
      title = 'Social Vulnerability (V)';
      items = [ {c: '#99000d', l: '> 0.50 (High)'}, {c: '#ef3b2c', l: '0.45-0.50'}, {c: '#fc9272', l: '0.40-0.45'}, {c: '#fcbba1', l: '< 0.40'} ];
      if (expBox) expBox.innerHTML = '<p>The Vulnerability Index captures demographic susceptibility to extreme heat, weighting factors like child population, marginal workers, and illiteracy.</p>';
      if (figBox) figBox.innerHTML = '';
    } else if (currentLayer === 'ward_illit') {
      title = 'Illiteracy Rate';
      items = [ {c: '#54278f', l: '> 25%'}, {c: '#756bb1', l: '20-25%'}, {c: '#9e9ac8', l: '15-20%'}, {c: '#cbc9e2', l: '< 15%'} ];
      if (expBox) expBox.innerHTML = '<p>Illiteracy correlates strongly with low adaptive capacity. Communities with higher illiteracy struggle to access or comprehend early heat warnings and public health advisories.</p>';
      if (figBox) figBox.innerHTML = '';
    }
  } 
  else if (currentModule === 'm2') {
    if (currentLayer === 'hot_persistence') {
      title = 'Hot Persistence';
      items = [ {c: '#bd0026', l: 'High Persistence'}, {c: '#fd8d3c', l: 'Moderate'}, {c: '#ffffb2', l: 'Low'} ];
      if (expBox) expBox.innerHTML = '<p>This layer highlights pixels that consistently classify as thermal hotspots year-over-year. These are primarily established industrial zones and dense concrete cores.</p>';
    } else if (currentLayer === 'hotspot_evolution') {
      title = 'Hotspot Evolution';
      items = [ {c: '#bd0026', l: 'Emerging Hotspots'}, {c: '#fd8d3c', l: 'Transitional'} ];
      if (expBox) expBox.innerHTML = '<p>Tracks the spatial migration and emergence of new hotspots over 14 years, largely driven by peripheral urban sprawl replacing vegetation.</p>';
    } else if (currentLayer === 'thermal_timelapse') {
      title = 'Thermal Timelapse';
      items = [];
      if (expBox) expBox.innerHTML = '<p>A dynamic GIF visualization illustrating the inter-annual shifting of daytime land surface temperatures across Pune.</p>';
    }
    if (figBox) figBox.innerHTML = ''; // Keep simple for M2
  }
  else if (currentModule === 'm4') {
    title = 'GI Opportunity';
    items = [ {c: '#006837', l: 'High Priority'}, {c: '#31a354', l: 'Moderate Priority'}, {c: '#c2e699', l: 'Low Priority'} ];
  }

  if (legendTitle) legendTitle.innerText = title;
  if (legendItems) {
    legendItems.innerHTML = items.map(i => `<div class="legend-item"><div class="legend-color" style="background:${i.c}"></div><span>${i.l}</span></div>`).join('');
  }
}

document.addEventListener('DOMContentLoaded', initMap);