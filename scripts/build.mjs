import {copyFile, mkdir, readFile, writeFile} from "node:fs/promises";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const source = name => new URL("src/" + name, root);
const dist = name => new URL("dist/" + name, root);
const read = url => readFile(url, "utf8");
const data = JSON.parse(await read(source("galaxy.json")));

function fields(record, keys) {
  assert.deepEqual(Object.keys(record).sort(), keys.split(" ").sort(), "Unexpected snapshot fields");
}

function uniqueIds(records) {
  const ids = new Set(records.map(record => record.id));
  assert.equal(ids.size, records.length, "Duplicate snapshot ID");
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
  return ids;
}

fields(data, "title asOf statuses clusters systems");
fields(data.statuses, "live building idea");
assert.match(data.asOf, /^\d{4}-\d{2}-\d{2}$/);
const date = new Date(data.asOf + "T00:00:00Z");
assert.equal(date.toISOString().slice(0, 10), data.asOf);
assert.equal(data.clusters.length, 5, "The map layout expects five clusters");
const clusterIds = uniqueIds(data.clusters);
const systemIds = uniqueIds(data.systems);
const systemsById = new Map(data.systems.map(system => [system.id, system]));
for (const cluster of data.clusters) {
  fields(cluster, "id name blurb");
  assert(data.systems.some(system => system.cluster === cluster.id), "Empty cluster: " + cluster.id);
}
for (const system of data.systems) {
  fields(system, "id name cluster status blurb links");
  assert(clusterIds.has(system.cluster), "Unknown cluster: " + system.cluster);
  assert(Object.hasOwn(data.statuses, system.status), "Unknown status: " + system.status);
  assert(Array.isArray(system.links) && system.links.length > 0);
  assert.equal(new Set(system.links).size, system.links.length, "Duplicate links: " + system.id);
  for (const id of system.links) {
    assert(systemIds.has(id) && id !== system.id, "Invalid link from " + system.id + ": " + id);
  }
}

for (const system of data.systems) {
  for (const id of system.links) {
    assert(systemsById.get(id).links.includes(system.id), "Missing reverse link: " + id + " → " + system.id);
  }
}

function escape(value) {
  assert.equal(typeof value, "string");
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function label(status) {
  return '<span class="status ' + status + '"><span class="dot" aria-hidden="true"></span>' +
    escape(data.statuses[status]) + "</span>";
}

const legend = Object.keys(data.statuses).map(status => "<li>" + label(status) + "</li>").join("");
const directory = data.clusters.map(cluster => {
  const rows = data.systems.filter(system => system.cluster === cluster.id).map(system =>
    "<li><strong>" + escape(system.name) + "</strong> · " + label(system.status) +
    "<p>" + escape(system.blurb) + "</p></li>",
  );
  return "<details><summary>" + escape(cluster.name) + "</summary><ul>" + rows.join("") + "</ul></details>";
}).join("\n");
const dateLabel = date.toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
const substitutions = new Map([
  ["snapshot", JSON.stringify(data).replaceAll("<", "\\u003c")],
  ["legend", legend],
  ["directory", directory],
  ["snapshot date", data.asOf],
  ["snapshot label", dateLabel],
  ["snapshot count", data.clusters.length + " clusters / " + data.systems.length + " systems"],
]);
let html = await read(source("index.html"));
for (const [key, value] of substitutions) {
  const marker = "<!-- " + key + " -->";
  assert.equal(html.split(marker).length, 2, "Expected one marker: " + marker);
  html = html.replace(marker, () => value);
}

await mkdir(dist(""), {recursive: true});
await Promise.all([
  writeFile(dist("index.html"), html),
  copyFile(source("style.css"), dist("style.css")),
  copyFile(source("map.js"), dist("map.js")),
]);
console.log("Built dated snapshot: " + data.clusters.length + " clusters, " + data.systems.length + " systems.");
