import 'leaflet/dist/leaflet.css';

import type { FC } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';

interface DynamicMapProps {
  center: [number, number];
  zoom: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
  }>;
}

const DynamicMap: FC<DynamicMapProps> = ({ center, zoom, markers }) => {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers?.map((marker, idx) => (
        <CircleMarker key={idx} center={marker.position} radius={10}>
          {marker.popup ? <Popup>{marker.popup}</Popup> : null}
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

export default DynamicMap;
