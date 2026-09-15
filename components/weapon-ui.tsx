"use client";

import Image from "next/image";
import Link from "next/link";

export type WeaponVisual = { id: string; registryRef: string; name: string; displayName?: string | null; type: "HANDGUN" | "LONG_GUN"; status: string; caliber: { canonicalName: string }; images?: { id: string }[] };

export function WeaponThumbnail({ weapon, sizes = "160px", priority = false }: { weapon: WeaponVisual; sizes?: string; priority?: boolean }) {
  const image = weapon.images?.[0]; const src = image ? `/api/weapon-images?id=${image.id}` : weapon.type === "HANDGUN" ? "/assets/weapon-placeholder-handgun-outline.png" : "/assets/weapon-placeholder-long-gun-outline.png";
  return <span className="weapon-thumbnail"><Image src={src} alt={image ? `Zdjęcie broni ${weapon.registryRef}` : `Neutralna zaślepka: ${weapon.type === "HANDGUN" ? "broń krótka" : "broń długa"}`} fill sizes={sizes} priority={priority} unoptimized={Boolean(image)} /></span>;
}

export function WeaponGridCard({ weapon, selected = false, mode = "select", onSelect }: { weapon: WeaponVisual; selected?: boolean; mode?: "select" | "browse"; onSelect?: (weapon: WeaponVisual) => void }) {
  const withdrawn = ["WITHDRAWN", "TRANSFERRED", "DEREGISTERED"].includes(weapon.status); const issued = weapon.status === "ISSUED"; const unavailable = issued || withdrawn;
  const content = <><span className="weapon-card-ref">{weapon.registryRef}</span><WeaponThumbnail weapon={weapon} /><span className="weapon-card-name">{weapon.displayName || weapon.name}</span><span className="weapon-card-caliber">{weapon.caliber.canonicalName}</span><span className={`weapon-card-status ${weapon.status === "IN_STORAGE" ? "green" : issued ? "red" : "muted"}`}>{weapon.status === "IN_STORAGE" ? "W magazynie" : issued ? "Wydana" : "Poza stanem"}</span></>;
  const className = `weapon-card ${selected ? "selected" : ""} ${withdrawn ? "withdrawn" : ""} ${issued ? "issued" : ""}`;
  if (mode === "browse") return <Link className={className} href={`/weapons/${weapon.id}`} aria-label={`${weapon.registryRef}, ${weapon.displayName || weapon.name}, ${weapon.caliber.canonicalName}`}>{content}</Link>;
  return <button type="button" className={className} disabled={unavailable} onClick={() => onSelect?.(weapon)} aria-label={`${weapon.registryRef}, ${weapon.displayName || weapon.name}, ${weapon.caliber.canonicalName}, ${weapon.status === "IN_STORAGE" ? "w magazynie" : "niedostępna"}`}>{content}</button>;
}
