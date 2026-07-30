import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Mapa real (Leaflet + tiles Carto fosques SENSE etiquetes: geografia de veritat
// però sense noms de ciutats, que regalarien la resposta). Gratuït amb atribució.

export interface GeoMarker {
  lat: number;
  lng: number;
  color: string;
  label?: string;
}

export function GeoMap(props: {
  onPick?: (lat: number, lng: number) => void;
  markers: GeoMarker[];
  disabled?: boolean;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(props.onPick);
  const disabledRef = useRef(props.disabled);
  pickRef.current = props.onPick;
  disabledRef.current = props.disabled;

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { worldCopyJump: true, minZoom: 1, maxZoom: 7 }).setView([25, 10], 1);
    // Variant FOSCA del mateix proveïdor: sobre l'escenari del plató, les tessel·les
    // clares cantaven com un llum encès. Mateixa llicència, mateixa absència d'etiquetes.
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (!disabledRef.current) pickRef.current?.(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const g = layerRef.current;
    const map = mapRef.current;
    if (!g || !map) return;
    g.clearLayers();
    for (const m of props.markers) {
      const cm = L.circleMarker([m.lat, m.lng], {
        radius: 8,
        color: "#fff",
        weight: 2,
        fillColor: m.color,
        fillOpacity: 1,
      }).addTo(g);
      if (m.label) cm.bindTooltip(m.label, { permanent: true, direction: "top", offset: [0, -8] });
    }
    if (props.markers.length >= 2) {
      L.polyline(props.markers.map((m) => [m.lat, m.lng] as [number, number]), {
        dashArray: "6",
        color: "#555",
        weight: 2,
      }).addTo(g);
      map.fitBounds(L.latLngBounds(props.markers.map((m) => [m.lat, m.lng] as [number, number])), {
        padding: [40, 40],
        maxZoom: 5,
      });
    }
  }, [props.markers]);

  return <div ref={divRef} style={{ height: 340, borderRadius: 8, cursor: props.disabled ? "default" : "crosshair" }} />;
}
