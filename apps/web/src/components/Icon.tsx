import { ICONS, type IconName } from "./iconArt.js";

/**
 * Icona del joc. Hereta el color del text (`currentColor`) i s'alinea amb la línia base,
 * que és el que un emoji no fa mai.
 *
 * Si l'icona és l'únic contingut d'un botó, cal `label` (queda com a `aria-label`); si va
 * acompanyada de text, es marca com a decorativa i el lector de pantalla la salta.
 */
export function Icon(props: { name: IconName; size?: number; label?: string; className?: string }) {
  const size = props.size ?? 20;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={props.className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={props.label ? "img" : undefined}
      aria-label={props.label}
      aria-hidden={props.label ? undefined : true}
      style={{ display: "block", flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: ICONS[props.name] }}
    />
  );
}
