/**
 * HearthQuest All-In-One Runner
 * Launches quest-vtt (3000), quest-admin (3001), and quest-ai-bridge (8000) concurrently.
 */
process.env.PORT_AI = process.env.PORT_AI || "8000";
process.env.PORT_VTT = process.env.PORT_VTT || "3000";
process.env.PORT_ADMIN = process.env.PORT_ADMIN || "3001";

import "../apps/quest-ai-bridge/src/server";
import "../apps/quest-vtt/src/server";
import "../apps/quest-admin/src/server";

console.log("==========================================================");
console.log("   HEARTHQUEST ALL-IN-ONE FAMILY PLATFORM INITIALIZED     ");
console.log(`   - VTT & Tablet Controller: http://0.0.0.0:${process.env.PORT_VTT}`);
console.log(`   - Admin & Storefront:      http://0.0.0.0:${process.env.PORT_ADMIN}`);
console.log(`   - AI Bridge & RTX 3080:    http://0.0.0.0:${process.env.PORT_AI}`);
console.log("==========================================================");
