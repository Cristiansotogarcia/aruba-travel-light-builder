import React, { Suspense } from 'react';

const MapContainer = React.lazy(() => import('react-leaflet').then(module => ({ default: module.MapContainer })) );
const TileLayer = React.lazy(() => import('react-leaflet').then(module => ({ default: module.TileLayer })) );
const Marker = React.lazy(() => import('react-leaflet').then(module => ({ default: module.Marker })) );
const Popup = React.lazy(() => import('react-leaflet').then(module => ({ default: module.Popup })) );

const DynamicMap = ({ center, zoom, markers }) => {
  return (
    <Suspense fallback={<div>Loading Map...</div>}>
      <MapContainer center={center} zoom={zoom} style={{ height: '400px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {markers && markers.map((marker, idx) => (
          <Marker key={idx} position={marker.position}>
            {marker.popup && <Popup>{marker.popup}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </Suspense>
  );
};

export default DynamicMap;