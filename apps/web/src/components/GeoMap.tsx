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
  /* El `payload` de map_guess ja portava `center` i `zoom` des del principi, però ningú els
     llegia: el mapa sempre s'obria al món sencer. Amb preguntes de municipis això és clicar
     un punt de dos píxels, o sigui que ara manen la vista inicial. */
  center?: [number, number];
  zoom?: number;
  maxZoom?: number;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(props.onPick);
  const disabledRef = useRef(props.disabled);
  pickRef.current = props.onPick;
  disabledRef.current = props.disabled;

  const [lat, lng] = props.center ?? [25, 10];
  const zoom = props.zoom ?? 1;

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { worldCopyJump: true, minZoom: 1, maxZoom: props.maxZoom ?? 7 })
      .setView([lat, lng], zoom);
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

  // La vista, a cada ronda. Cal un efecte a part perquè entre dues preguntes de mapa
  // seguides el component NO es desmunta —React el reaprofita—, i el mapa es quedaria on
  // l'havia deixat la pregunta anterior. Les dependències són els números i no `props.center`,
  // que és un array nou a cada render i dispararia l'efecte sempre.
  useEffect(() => {
    mapRef.current?.setView([lat, lng], zoom);
  }, [lat, lng, zoom]);

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
