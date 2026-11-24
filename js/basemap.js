/* ============================================================
   Shared basemap factory for every Leaflet map on this site.

   WHY THIS EXISTS
   CARTO's free basemap URLs (basemaps.cartocdn.com) now require an
   API key. Without one the server still answers HTTP 200 but every
   tile is a placeholder stamped "API KEY REQUIRED", so nothing
   shows up in the console — the map just looks broken.

   DEFAULT: Esri "Canvas" gray basemaps — keyless, CORS-enabled and a
   close visual match for CARTO Positron / Dark Matter.

   TO GO BACK TO CARTO: request a free key at
   https://carto.com/basemaps/apikey/ , paste it into CARTO_API_KEY
   below, and the maps switch automatically (restrict the key to
   manasthepatra.github.io in the CARTO dashboard).
   ============================================================ */
(function (global) {
  'use strict';

  var CARTO_API_KEY = '';   // <- optional: paste a CARTO basemap key here

  var ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  var ESRI_ATTR = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';

  function carto(style) {
    return L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/' + style + '/{z}/{x}/{y}{r}.png?api_key=' + CARTO_API_KEY,
      {
        subdomains: 'abcd',
        maxZoom: 18,
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    );
  }

  function esri(name) {
    return L.tileLayer(ESRI + name + '/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 16,   // Esri gray canvas has no tiles beyond z16; Leaflet upscales
      maxZoom: 18,
      attribution: ESRI_ATTR
    });
  }

  global.PuneBasemap = {
    light: function () { return CARTO_API_KEY ? carto('light_all') : esri('World_Light_Gray_Base'); },
    dark:  function () { return CARTO_API_KEY ? carto('dark_all')  : esri('World_Dark_Gray_Base'); }
  };
})(window);
