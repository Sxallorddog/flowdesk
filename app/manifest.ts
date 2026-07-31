import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name:"FlowDesk CRM", short_name:"FlowDesk", description:"CRM для невеликих команд", start_url:"/app", display:"standalone", background_color:"#f4f6f3", theme_color:"#173b2b" }; }
