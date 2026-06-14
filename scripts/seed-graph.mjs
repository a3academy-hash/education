#!/usr/bin/env node
// =============================================================================
// scripts/seed-graph.mjs — seed the IMMUTABLE curriculum snapshot + activation.
//
// Writes one row to curriculum_graphs (the durable, immutable audit snapshot of
// the exact graph a cohort is assessed against) and one row to
// curriculum_graph_activations (the append-only "active version" log; active =
// greatest activated_at). The evidence trail's graph_version is stamped from the
// BUNDLED graph (lib/curriculum getLoadedGraphVersion); this snapshot is the
// auditable record + the future cross-check referent.
//
// SERVICE-ROLE, server-side, Matt-run. NOT part of the app, NOT CI.
//   Prereq: migrations 0001 -> 0003 applied to the target project.
//   Run:  node scripts/seed-graph.mjs        (parses .env.local itself)
//     or: node --env-file=.env.local scripts/seed-graph.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the env / .env.local.
// NEVER logs the service-role key. Idempotent: re-running does not duplicate the
// snapshot (curriculum_graphs is immutable, keyed by graph_version) and does not
// re-activate an already-active version. Fails closed (writes nothing) on bad env.
// =============================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- env: process.env first, then a minimal .env.local parser (no deps) --------
function loadEnv() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return { url, key };
  try {
    const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (/^\s*#/.test(line)) continue; // skip comments
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const k = m[1];
      const v = m[2].replace(/^["']|["']$/g, "");
      if (k === "NEXT_PUBLIC_SUPABASE_URL" && !url) url = v;
      if (k === "SUPABASE_SERVICE_ROLE_KEY" && !key) key = v;
    }
  } catch {
    /* .env.local absent — fall through to the missing-env check below */
  }
  return { url, key };
}

const { url, key } = loadEnv();
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY " +
      "(set both in .env.local). Aborting — nothing written.",
  );
  process.exit(1);
}

// --- load the bundled graph + derive the version (== getLoadedGraphVersion) ----
const graph = JSON.parse(readFileSync(join(ROOT, "data", "algebra1-graph.json"), "utf8"));
const version = graph?.schema?.version;
if (typeof version !== "string" || version.length === 0) {
  console.error("data/algebra1-graph.json is missing schema.version. Aborting.");
  process.exit(1);
}
// The graph exposes ONE version string (schema.version). Today it serves as BOTH
// the content graph_version and the schema_version column (backlog I3: a distinct
// structural axis can be split out later if ever needed).
const schemaVersion = version;

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log(`Target: ${url}`); // host only — never the key

  // 1) snapshot — immutable; insert ONLY if this version isn't already stored.
  const { data: existing, error: selErr } = await supabase
    .from("curriculum_graphs")
    .select("graph_version")
    .eq("graph_version", version)
    .maybeSingle();
  if (selErr) throw new Error(`read curriculum_graphs: ${selErr.message}`);

  if (existing) {
    console.log(`curriculum_graphs already has ${version} (immutable) — leaving as-is.`);
  } else {
    const bytes = JSON.stringify(graph).length;
    const { error: insErr } = await supabase
      .from("curriculum_graphs")
      .insert({ graph_version: version, schema_version: schemaVersion, graph });
    if (insErr) throw new Error(`insert curriculum_graphs: ${insErr.message}`);
    console.log(`Inserted curriculum_graphs snapshot ${version} (${bytes} bytes).`);
  }

  // 2) activation — append ONLY if this version isn't already the active one.
  const { data: latest, error: actSelErr } = await supabase
    .from("curriculum_graph_activations")
    .select("graph_version, activated_at")
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (actSelErr) throw new Error(`read curriculum_graph_activations: ${actSelErr.message}`);

  if (latest?.graph_version === version) {
    console.log(`${version} is already the active version — no new activation appended.`);
  } else {
    const { error: actErr } = await supabase
      .from("curriculum_graph_activations")
      .insert({ graph_version: version });
    if (actErr) throw new Error(`insert curriculum_graph_activations: ${actErr.message}`);
    console.log(`Activated ${version}.`);
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(`Seed failed: ${e.message}`);
  process.exit(1);
});
