import { updateUrlForView, labelForView } from "./viewState.js";

const DEFAULT_VIEW = "explorer";

export function initializeResponsiveGlobe(data, initialView = DEFAULT_VIEW) {
    const { world, nameById, facts, visitedSet, livedIndex } = data;
    renderGlobe(world, nameById, facts, visitedSet, livedIndex, initialView);
    resizeGlobe();
    d3.select(window).on("resize.globe", resizeGlobe);
}

export function setIsOwnProfile(isOwn) {
    const svgSelection = d3.select("#mapViz").select("svg");
    if (svgSelection.empty()) return;
    const state = svgSelection.node().__globeState;
    if (!state) return;
    state.isOwnProfile = isOwn;
}

export function setEditMode(enabled) {
    const svgSelection = d3.select("#mapViz").select("svg");
    if (svgSelection.empty()) return;
    const state = svgSelection.node().__globeState;
    if (!state) return;
    state.editMode = enabled;
    d3.select("body").classed("edit-mode", enabled);
}

export function setOnCountryClick(callback) {
    const svgSelection = d3.select("#mapViz").select("svg");
    if (svgSelection.empty()) return;
    const state = svgSelection.node().__globeState;
    if (!state) return;
    state.onCountryClick = callback;
}

export function flashCountry(countryId, color) {
    const svgSelection = d3.select("#mapViz").select("svg");
    if (svgSelection.empty()) return;
    const state = svgSelection.node().__globeState;
    if (!state || !state.countryPaths) return;

    state.countryPaths.each(function(d) {
        if (d.normalizedId === countryId) {
            const sel = d3.select(this);
            sel.interrupt();
            sel.attr("fill", color || "#4ade80")
                .transition().duration(600).ease("cubic-out")
                .attr("fill", state.getCurrentFill(d));
        }
    });
}

export function updateGlobeTripData(tripData) {
    const svgSelection = d3.select("#mapViz").select("svg");
    if (svgSelection.empty()) {
        return;
    }
    const state = svgSelection.node().__globeState;
    if (!state) {
        return;
    }
    state.visitedSet = tripData.visitedSet || d3.set();
    state.livedSet = (tripData.livedIndex && tripData.livedIndex.set) || d3.set();
    state.livedDetails = (tripData.livedIndex && tripData.livedIndex.detail) || {};
    if (state.updateCountryFills) {
        state.updateCountryFills(200);
    }
}

export function resizeGlobe() {
    const viz = d3.select("#mapViz");
    const svgSelection = viz.select("svg");
    if (svgSelection.empty()) {
        return;
    }

    const state = svgSelection.node().__globeState;
    if (!state) {
        return;
    }

    const bounds = viz.node().getBoundingClientRect();
    const vizWidth = bounds.width;
    const vizHeight = bounds.height;
    let size = Math.min(vizWidth, vizHeight);
    if (!size || !isFinite(size)) {
        size = Math.max(vizWidth, vizHeight) || state.size || 800;
    }

    const scale = size;
    const mid = scale / 2;
    const radius = scale / 2.1;

    svgSelection
        .attr("width", size)
        .attr("height", size)
        .attr("viewBox", `0 0 ${scale} ${scale}`)
        .style("left", `${(vizWidth - size) / 2}px`)
        .style("top", `${(vizHeight - size) / 2}px`)
        .style("width", `${size}px`)
        .style("height", `${size}px`);

    if (state.seaCircle) {
        state.seaCircle
            .attr("cx", mid)
            .attr("cy", mid)
            .attr("r", radius);
    }

    if (state.projection) {
        state.projection.scale(radius).translate([mid, mid]);
    }

    if (state.updatePaths) {
        state.updatePaths();
    }

    if (state.updateCountryFills) {
        state.updateCountryFills(0);
    }

    state.size = size;
    state.scale = scale;
    state.mid = mid;
    state.radius = radius;

    svgSelection.node().__globeState = state;
}

export function renderGlobe(world, nameById, facts, visitedSet, livedIndex, initialView = DEFAULT_VIEW) {
    const viz = d3.select("#mapViz");

    const bounds = viz.node().getBoundingClientRect();
    const vizWidth = bounds.width;
    const vizHeight = bounds.height;

    let size = Math.min(vizWidth, vizHeight);
    if (!size || !isFinite(size)) {
        size = Math.max(vizWidth, vizHeight) || 800;
    }

    const scale = size;
    const mid = scale / 2;
    const radius = scale / 2.1;

    const state = {
        viz,
        size,
        scale,
        mid,
        radius
    };

    const svg = viz
        .append("svg")
        .attr("width", size)
        .attr("height", size)
        .attr("viewBox", `0 0 ${scale} ${scale}`)
        .attr("preserveAspectRatio", "xMidYMid")
        .style("position", "absolute")
        .style("left", `${(vizWidth - size) / 2}px`)
        .style("top", `${(vizHeight - size) / 2}px`)
        .style("width", `${size}px`)
        .style("height", `${size}px`);

    state.svg = svg;

    const content = svg.append("g");
    state.content = content;

    const seaCircle = content.append("circle")
        .attr("cx", mid)
        .attr("cy", mid)
        .attr("r", radius)
        .attr("fill", "lightBlue");
    state.seaCircle = seaCircle;

    const projection = d3.geo.orthographic().scale(radius).translate([mid, mid]).clipAngle(90);
    const path = d3.geo.path().projection(projection);
    const countries = topojson.feature(world, world.objects.countries).features;
    const color = d3.scale.category20c();

    state.projection = projection;
    state.path = path;
    state.countries = countries;
    state.color = color;

    state.visitedSet = visitedSet || d3.set();

    const navItems = d3.selectAll(".sidebar-nav__item");
    state.navItems = navItems;

    const viewLabel = d3.select("[data-view-label]");
    state.viewLabel = viewLabel;

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "country-tooltip")
        .style("opacity", 0);
    state.tooltip = tooltip;

    state.livedSet = livedIndex.set || d3.set();
    state.livedDetails = livedIndex.detail || {};

    let currentView = initialView || DEFAULT_VIEW;
    if (navItems[0] && navItems[0].length) {
        const preset = navItems.filter(".sidebar-nav__item--active");
        if (preset[0] && preset[0][0]) {
            const presetView = d3.select(preset[0][0]).attr("data-view");
            if (presetView) {
                currentView = presetView.toLowerCase();
            }
        }
    }

    let showVisited = (currentView === "visited" || currentView === "lived");
    let showLived = (currentView === "lived");

    const unvisitedFill = "#3f4453";
    const livedHighlightFill = "#ffb703";

    function isVisited(id) {
        return id && state.visitedSet.has(id);
    }

    function isLived(id) {
        return id && state.livedSet.has(id);
    }

    function getCountryInfo(id) {
        const normalizedId = normalizeId(id);
        const fallbackName = normalizedId && nameById[normalizedId] ? nameById[normalizedId] : `Country ${normalizedId || id}`;
        const info = (normalizedId && facts[normalizedId]) || {};
        const name = info.name || fallbackName;
        const fact = info.fact || "";
        const lived = normalizedId && state.livedDetails[normalizedId] ? state.livedDetails[normalizedId] : [];
        return { name, fact, lived };
    }

    function buildLivedMarkup(entries) {
        if (!entries || !entries.length) {
            return "";
        }
        let html = `<span class="country-tooltip__section-title">${escapeHtml("Lived here")}</span>`;
        entries.forEach(entry => {
            const city = entry.primaryCity || (entry.cities && entry.cities.length ? entry.cities[0] : "");
            const parts = [];
            if (city) {
                parts.push(`<strong class="country-tooltip__city">${escapeHtml(city)}</strong>`);
            }
            if (entry.timeline) {
                parts.push(escapeHtml(entry.timeline));
            }
            let summary = escapeHtml(entry.description || "");
            const detail = parts.join(" · ");
            if (detail) {
                summary = summary ? `${summary} — ${detail}` : detail;
            }
            if (summary) {
                html += `<span class="country-tooltip__lived-entry">${summary}</span>`;
            }
        });
        return html;
    }

    function showTooltip(datum) {
        const info = getCountryInfo(datum.normalizedId || datum.id);
        const showFact = !showVisited && !showLived && info.fact && info.fact !== info.name;
        const factHtml = showFact ? `<span class="country-tooltip__fact">${escapeHtml(info.fact)}</span>` : "";
        const livedHtml = showLived ? buildLivedMarkup(info.lived) : "";
        const html = `<span class="country-tooltip__title">${escapeHtml(info.name)}</span>${factHtml}${livedHtml}`;
        tooltip.style("opacity", 1).html(html);
    }

    function moveTooltip() {
        if (!d3.event) {
            return;
        }
        tooltip
            .style("left", `${d3.event.pageX + 16}px`)
            .style("top", `${d3.event.pageY - 28}px`);
    }

    function hideTooltip() {
        tooltip.style("opacity", 0);
    }

    function getCurrentFill(datum) {
        const visitedCountry = isVisited(datum.normalizedId);
        const livedCountry = isLived(datum.normalizedId);

        if (showVisited && showLived) {
            if (livedCountry) {
                return livedHighlightFill;
            }
            return unvisitedFill;
        }

        if (showLived) {
            return livedCountry ? livedHighlightFill : unvisitedFill;
        }

        if (showVisited) {
            return visitedCountry ? datum.baseFill : unvisitedFill;
        }

        return datum.baseFill;
    }

    function updateCountryFills(duration) {
        const delay = duration || 0;
        state.countryPaths.each(function(d) {
            const selection = d3.select(this);
            selection.interrupt();
            if (delay > 0) {
                selection
                    .transition()
                    .duration(delay)
                    .attr("fill", getCurrentFill(d));
            } else {
                selection.attr("fill", getCurrentFill(d));
            }
        });
    }

    function updateViewLabel() {
        if (viewLabel.empty()) {
            return;
        }
        viewLabel.text(labelForView(state.currentView, state.isOwnProfile));
    }

    function updateNavState(view) {
        if (navItems[0] && navItems[0].length) {
            navItems
                .classed("sidebar-nav__item--active", function() {
                    return d3.select(this).attr("data-view") === view;
                })
                .attr("aria-pressed", function() {
                    return d3.select(this).attr("data-view") === view ? "true" : "false";
                });
        }
        d3.select("body").attr("data-view", view);
        updateViewLabel();
    }

    function applyView(view, animate) {
        if (!view) {
            return;
        }
        currentView = view;
        showVisited = (view === "visited" || view === "lived");
        showLived = (view === "lived");
        state.currentView = currentView;
        state.showVisited = showVisited;
        state.showLived = showLived;
        updateNavState(view);
        updateCountryFills(animate ? 200 : 0);
        hideTooltip();
        updateUrlForView(view);
    }

    state.editMode = false;
    state.isOwnProfile = false;
    state.onCountryClick = null;

    state.updateCountryFills = updateCountryFills;
    state.updatePaths = () => {
        state.countryPaths.attr("d", path);
    };
    state.applyView = applyView;
    state.showTooltip = showTooltip;
    state.hideTooltip = hideTooltip;

    if (navItems[0] && navItems[0].length) {
        navItems.on("click", function() {
            const view = d3.select(this).attr("data-view");
            state.applyView(view, true);
            if (window.__sidebarControl && typeof window.__sidebarControl.setOpen === "function") {
                window.__sidebarControl.setOpen(false);
            }
        });
    }

    const countryPaths = content.selectAll("path")
        .data(countries)
        .enter()
        .append("path")
        .each(function(d) {
            d.normalizedId = normalizeId(d.id);
            d.baseFill = color(d.id);
        })
        .attr("d", path)
        .attr("fill", d => getCurrentFill(d))
        .attr("stroke", "#1a1a1a")
        .attr("stroke-width", 0.6)
        .on("mouseover", function(d) {
            const selection = d3.select(this);
            selection.interrupt();
            const highlightFill = d3.rgb(getCurrentFill(d)).brighter(1.1).toString();
            selection
                .transition()
                .duration(200)
                .ease("cubic-out")
                .attr("fill", highlightFill)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2.2);

            showTooltip(d);
            moveTooltip();
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", function(d) {
            const selection = d3.select(this);
            selection.interrupt();
            selection
                .transition()
                .duration(200)
                .ease("cubic-out")
                .attr("fill", getCurrentFill(d))
                .attr("stroke", "#1a1a1a")
                .attr("stroke-width", 0.6);

            hideTooltip();
        });

    state.countryPaths = countryPaths;
    state.getCurrentFill = getCurrentFill;
    state.navItems = navItems;
    state.viewLabel = viewLabel;

    const maxLatRotation = 50;
    const inertia = { vx: 0, vy: 0 };
    let lastDragTimestamp = null;
    let inertiaActive = false;
    let lastDragDelta = { lon: 0, lat: 0, dt: 0 };

    function clampLatitude(value) {
        return Math.max(-maxLatRotation, Math.min(maxLatRotation, value));
    }

    function stopInertia() {
        inertiaActive = false;
    }

    content.call(d3.behavior.drag()
        .on("dragstart", function() {
            if (d3.event && d3.event.sourceEvent) {
                d3.event.sourceEvent.preventDefault();
                state._dragTarget = d3.event.sourceEvent.target;
            } else {
                state._dragTarget = null;
            }
            stopInertia();
            inertia.vx = 0;
            inertia.vy = 0;
            lastDragTimestamp = Date.now();
            lastDragDelta = { lon: 0, lat: 0, dt: 0 };
            state._dragged = false;
            hideTooltip();
        })
        .on("drag", function() {
            const dx = d3.event.dx;
            const dy = d3.event.dy;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                state._dragged = true;
            }

            const now = Date.now();
            const dt = lastDragTimestamp ? (now - lastDragTimestamp) : 0;
            lastDragTimestamp = now;

            const degreesPerPixel = 360 / (2 * Math.PI * (state.radius || radius || 1));
            const deltaLon = dx * degreesPerPixel;
            const deltaLat = dy * degreesPerPixel;

            const rotate = projection.rotate();
            const newLon = rotate[0] + deltaLon;
            const newLat = clampLatitude(rotate[1] - deltaLat);

            projection.rotate([newLon, newLat, rotate[2]]);
            state.updatePaths();

            if (dt > 0) {
                const actualLonChange = newLon - rotate[0];
                const actualLatChange = newLat - rotate[1];
                if (dt <= 120) {
                    lastDragDelta = { lon: actualLonChange, lat: actualLatChange, dt };
                } else {
                    lastDragDelta = { lon: 0, lat: 0, dt: 0 };
                }
            }
        })
        .on("dragend", function() {
            lastDragTimestamp = null;

            // D3 v3 drag suppresses click events, so handle click here
            if (!state._dragged && state.editMode && state.onCountryClick && state._dragTarget) {
                const datum = d3.select(state._dragTarget).datum();
                if (datum && datum.normalizedId) {
                    state.onCountryClick(datum);
                }
            }
            state._dragTarget = null;

            if (!lastDragDelta.dt) {
                inertia.vx = 0;
                inertia.vy = 0;
                return;
            }

            const vx = lastDragDelta.lon / lastDragDelta.dt;
            const vy = lastDragDelta.lat / lastDragDelta.dt;
            const speed = Math.sqrt(vx * vx + vy * vy);
            const minSpeed = 0.002;

            if (speed < minSpeed) {
                inertia.vx = 0;
                inertia.vy = 0;
                lastDragDelta = { lon: 0, lat: 0, dt: 0 };
                return;
            }

            inertia.vx = vx;
            inertia.vy = vy;
            lastDragDelta = { lon: 0, lat: 0, dt: 0 };

            inertiaActive = true;
            let previous = Date.now();

            d3.timer(() => {
                if (!inertiaActive) {
                    return true;
                }

                const now = Date.now();
                let dt = now - previous;
                previous = now;

                if (dt <= 0) {
                    return false;
                }
                if (dt > 60) {
                    dt = 60;
                }

                const rotate = projection.rotate();
                const newLon = rotate[0] + inertia.vx * dt;
                const currentLat = rotate[1] + inertia.vy * dt;
                const newLat = clampLatitude(currentLat);

                projection.rotate([newLon, newLat, rotate[2]]);
                state.updatePaths();

                const damping = Math.exp(-dt / 200);
                inertia.vx *= damping;
                inertia.vy *= damping;

                if (newLat === maxLatRotation || newLat === -maxLatRotation) {
                    inertia.vy = 0;
                }

                const nextSpeed = Math.sqrt(inertia.vx * inertia.vx + inertia.vy * inertia.vy);
                if (nextSpeed < 0.0004) {
                    stopInertia();
                    inertia.vx = 0;
                    inertia.vy = 0;
                    return true;
                }
                return false;
            });
        })
    );

    content.call(d3.behavior.zoom()
        .scaleExtent([1, 4])
        .on("zoom", function() {
            const zoomScale = d3.event.scale;
            content.attr("transform", `scale(${zoomScale})`);
        })
    );

    state.applyView(currentView, false);
    updateUrlForView(currentView);

    svg.node().__globeState = state;
    return state;
}

function normalizeId(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const str = `${value}`.trim();
    if (!str) {
        return null;
    }
    if (/^\d+$/.test(str)) {
        return (`000${str}`).slice(-3);
    }
    return str.toUpperCase();
}

function escapeHtml(value) {
    if (!value) {
        return "";
    }
    return String(value).replace(/[&<>"']/g, match => {
        switch (match) {
            case "&": return "&amp;";
            case "<": return "&lt;";
            case ">": return "&gt;";
            case '"': return "&quot;";
            case "'": return "&#39;";
            default: return match;
        }
    });
}
