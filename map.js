"use strict";

const data = JSON.parse(document.getElementById("galaxy-data").textContent);
const stage = document.getElementById("stage");
const inspector = document.getElementById("inspector");
const clusterButtons = new Map();
const clusters = new Map(data.clusters.map(cluster => [cluster.id, cluster]));
const systems = new Map(data.systems.map(system => [system.id, system]));

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function statusLabel(status) {
  const label = element("span", "status " + status);
  const dot = element("span", "dot");
  dot.setAttribute("aria-hidden", "true");
  label.append(dot, data.statuses[status]);
  return label;
}

function selectCluster(id) {
  for (const [clusterId, button] of clusterButtons) {
    button.setAttribute("aria-pressed", String(clusterId === id));
  }
}

function setDetails(heading, ...children) {
  heading.tabIndex = -1;
  inspector.replaceChildren(...children);
  heading.focus({preventScroll: true});
  heading.scrollIntoView({block: "nearest"});
}

function systemList(items) {
  const list = element("ul", "item-list");
  for (const system of items) {
    const row = element("li");
    const button = element("button", "system-button");
    const arrow = element("span", "arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    button.type = "button";
    button.append(element("span", "label", system.name), statusLabel(system.status), arrow);
    button.addEventListener("click", () => showSystem(system));
    row.append(button);
    list.append(row);
  }
  return list;
}

function showCluster(cluster) {
  selectCluster(cluster.id);
  const items = data.systems.filter(system => system.cluster === cluster.id);
  const heading = element("h3", "", cluster.name);
  setDetails(
    heading,
    element("p", "kicker", items.length + " systems"),
    heading,
    element("p", "", cluster.blurb),
    systemList(items),
  );
}

function showSystem(system) {
  const cluster = clusters.get(system.cluster);
  selectCluster(cluster.id);
  const back = element("button", "back", "← " + cluster.name);
  back.type = "button";
  back.addEventListener("click", () => showCluster(cluster));
  const heading = element("h3", "", system.name);
  setDetails(
    heading,
    back,
    heading,
    statusLabel(system.status),
    element("p", "", system.blurb),
    element("h4", "kicker connections-label", "Connections"),
    systemList(system.links.map(id => systems.get(id))),
  );
}

for (const [index, cluster] of data.clusters.entries()) {
  const button = element("button", "cluster-button");
  const label = element("span", "cluster-index", "0" + (index + 1));
  label.setAttribute("aria-hidden", "true");
  button.type = "button";
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-controls", "inspector");
  button.append(label, element("span", "cluster-name", cluster.name));
  button.addEventListener("click", () => showCluster(cluster));
  clusterButtons.set(cluster.id, button);
  stage.append(button);
}

const overview = element("div", "overview");
overview.append(
  element("p", "kicker", "Map guide"),
  element("h3", "", "Start with a cluster"),
  element("p", "", "Choose a cluster to see its systems. Open a system to see what it does and follow its connections."),
  element("span", "map-count", data.clusters.length + " clusters / " + data.systems.length + " systems"),
);
inspector.append(overview);
document.getElementById("interactive-map").hidden = false;
document.getElementById("static-map").hidden = true;
