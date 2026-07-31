import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { const base="https://flowdesk.example"; return [{url:base,priority:1},{url:`${base}/case-study`,priority:.8},{url:`${base}/login`,priority:.4},{url:`${base}/onboarding`,priority:.6}]; }
