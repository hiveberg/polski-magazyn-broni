import type { MetadataRoute } from "next";
import { PRODUCT_NAME, PRODUCT_SHORT_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PRODUCT_SHORT_NAME} — ${PRODUCT_NAME}`,
    short_name: PRODUCT_SHORT_NAME,
    description: "Lokalna ewidencja broni palnej i amunicji.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f7fb",
    theme_color: "#0b203b",
    lang: "pl",
  };
}
