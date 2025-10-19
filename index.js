// Helper utilities ---------------------------------------------------------
function normalizeId(value) {
    if (value === undefined || value === null) {
        return null;
    }
    var str = (value + '').trim();
    if (!str) {
        return null;
    }
    if (/^\d+$/.test(str)) {
        return ('000' + str).slice(-3);
    }
    return str.toUpperCase();
}

function escapeHtml(value) {
    if (!value) {
        return "";
    }
    return String(value).replace(/[&<>"']/g, function(match) {
        switch (match) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return match;
        }
    });
}

function parseDateFromString(value) {
    if (!value) {
        return null;
    }
    var trimmed = value.replace(/\s+/g, " ").trim();
    if (!trimmed) {
        return null;
    }
    var parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
}

function formatDurationFromDays(totalDays, includeLessThanWeek) {
    if (!totalDays || totalDays <= 0) {
        return includeLessThanWeek ? "Less than a week" : "";
    }

    var weeksTotal = Math.floor(totalDays / 7);
    var years = Math.floor(weeksTotal / 52);
    var weeks = weeksTotal - years * 52;

    var parts = [];
    if (years > 0) {
        parts.push(years + " year" + (years === 1 ? "" : "s"));
    }
    if (weeks > 0) {
        parts.push(weeks + " week" + (weeks === 1 ? "" : "s"));
    }

    if (!parts.length) {
        return includeLessThanWeek ? "Less than a week" : "";
    }

    return parts.join(", ");
}

function calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) {
        return { text: "", totalDays: 0 };
    }
    if (endDate < startDate) {
        var temp = endDate;
        endDate = startDate;
        startDate = temp;
    }

    var totalDays = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    var text = formatDurationFromDays(totalDays, true);
    return { text: text, totalDays: totalDays };
}

function buildNameMap(names) {
    var map = {};
    names.forEach(function(d) {
        var name = d.name;
        [
            d.iso_n3,
            d.iso_a3,
            d.adm0_a3,
            d.sov_a3
        ].forEach(function(code) {
            var normalized = normalizeId(code);
            if (normalized) {
                map[normalized] = name;
            }
        });
    });
    return map;
}

function normalizeFacts(rawFacts) {
    var normalized = {};
    if (!rawFacts) {
        return normalized;
    }
    for (var key in rawFacts) {
        if (!rawFacts.hasOwnProperty(key)) {
            continue;
        }
        var normalizedKey = normalizeId(key);
        if (normalizedKey) {
            normalized[normalizedKey] = rawFacts[key];
        }
    }
    return normalized;
}

function buildVisitedSet(rawVisited) {
    var set = d3.set();
    if (!rawVisited || !rawVisited.visited) {
        return set;
    }
    rawVisited.visited.forEach(function(code) {
        var normalized = normalizeId(code);
        if (normalized) {
            set.add(normalized);
        }
    });
    return set;
}

function buildLivedIndex(rawLived) {
    var livedSet = d3.set();
    var livedDetails = {};

    if (!rawLived || !rawLived.records) {
        return { set: livedSet, detail: livedDetails };
    }

    rawLived.records.forEach(function(entry) {
        if (!entry) {
            return;
        }
        var normalized = normalizeId(entry.countryCode || entry.country);
        if (!normalized) {
            return;
        }

        livedSet.add(normalized);

        if (!livedDetails[normalized]) {
            livedDetails[normalized] = [];
        }

        var cities = entry.cities || [];
        if (typeof cities === "string") {
            cities = cities.split(",").map(function(city) {
                return city.trim();
            }).filter(Boolean);
        } else if (Array.isArray(cities)) {
            cities = cities.map(function(city) {
                return (city || "").toString().trim();
            }).filter(Boolean);
        } else {
            cities = [];
        }

        var periodText = (entry.period || entry.yearRange || "").trim();
        var startDate = null;
        var endDate = null;

        var duration = { text: "", totalDays: 0 };
        if (periodText) {
            var arrowParts = periodText.split("→");
            if (arrowParts.length === 2) {
                startDate = parseDateFromString(arrowParts[0]);
                endDate = parseDateFromString(arrowParts[1]);
            } else {
                var dashParts = periodText.split("-");
                if (dashParts.length === 2) {
                    startDate = parseDateFromString(dashParts[0]);
                    endDate = parseDateFromString(dashParts[1]);
                }
            }
            if (startDate && endDate) {
                duration = calculateDuration(startDate, endDate);
            }
        }

        var primaryCity = cities.length ? cities[0] : "";

        var yearSummary = "";
        if (startDate) {
            yearSummary = String(startDate.getFullYear());
        }
        if (endDate) {
            if (!yearSummary) {
                yearSummary = String(endDate.getFullYear());
            } else if (endDate.getFullYear() !== startDate.getFullYear()) {
                yearSummary += " → " + endDate.getFullYear();
            }
        }
        if (!yearSummary && periodText) {
            // fallback to raw text when parsing fails
            yearSummary = periodText;
        }
        var timeline = yearSummary;
        if (duration.text) {
            timeline = timeline ? (timeline + " (" + duration.text + ")") : duration.text;
        }

        livedDetails[normalized].push({
            description: (entry.description || "").trim(),
            timeline: timeline,
            primaryCity: primaryCity,
            cities: cities,
            country: (entry.country || "").trim(),
            durationDays: duration.totalDays
        });
    });

    return { set: livedSet, detail: livedDetails };
}

function loadJSON(path, callback) {
    d3.json(path + "?v=" + Date.now(), callback);
}

function loadTSV(path, callback) {
    d3.tsv(path + "?v=" + Date.now(), callback);
}

// Data loading --------------------------------------------------------------
loadJSON("world.json", function(error, world) {
    if (error || !world) {
        console.error("Unable to load world.json", error);
        return;
    }

    loadTSV("country-names.tsv", function(namesError, names) {
        if (namesError || !names) {
            console.error("Unable to load country-names.tsv", namesError);
            return;
        }

        var nameById = buildNameMap(names);

        loadJSON("country-facts.json", function(factsError, facts) {
            if (factsError || !facts) {
                console.warn("country-facts.json missing or invalid. Falling back to defaults.", factsError);
                facts = {};
            }

            var normalizedFacts = normalizeFacts(facts);

            loadJSON("visited.json", function(visitedError, visitedData) {
                if (visitedError || !visitedData) {
                    console.warn("visited.json missing or invalid. Defaulting to empty list.", visitedError);
                    visitedData = { visited: [] };
                }

                var visitedSet = buildVisitedSet(visitedData);
                loadJSON("lived.json", function(livedError, livedData) {
                    if (livedError || !livedData) {
                        console.warn("lived.json missing or invalid. Defaulting to empty list.", livedError);
                        livedData = { records: [] };
                    }

                    var livedIndex = buildLivedIndex(livedData);
                    renderGlobe(world, nameById, normalizedFacts, visitedSet, livedIndex);
                });
            });
        });
    });
});

// Rendering -----------------------------------------------------------------
function renderGlobe(world, nameById, facts, visitedSet, livedIndex) {
    var viz = d3.select("#mapViz");

    var vizWidth = viz.node().getBoundingClientRect().width;
    var vizHeight = viz.node().getBoundingClientRect().height;

    var size = Math.min(vizWidth, vizHeight);
    var svgWidth = size;
    var svgHeight = size;

    var scale = size;
    var mid = scale / 2;
    var radius = scale / 2.1;

    var svg = viz
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .attr("viewBox", "0 0 " + scale + " " + scale)
        .attr("preserveAspectRatio", "xMidYMid");

    svg
        .style("position", "absolute")
        .style("left", ((vizWidth - size) / 2) + "px")
        .style("top", ((vizHeight - size) / 2) + "px")
        .style("width", size + "px")
        .style("height", size + "px");

    var content = svg.append("g");

    // Add blue background for the sea
    content.append("circle")
        .attr("cx", mid)
        .attr("cy", mid)
        .attr("r", radius)
        .attr("fill", "lightBlue");

    // Build the map projection
    var projection = d3.geo.orthographic().scale(radius).translate([mid, mid]).clipAngle(90);
    var path = d3.geo.path().projection(projection);
    var countries = topojson.feature(world, world.objects.countries).features;
    var color = d3.scale.category20c();

    visitedSet = visitedSet || d3.set();
    livedIndex = livedIndex || { set: d3.set(), detail: {} };

    var navItems = d3.selectAll(".sidebar-nav__item");
    var currentView = "explorer";
    var showVisited = false;
    var showLived = false;
    var unvisitedFill = "#3f4453";
    var livedHighlightFill = "#ffb703";

    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "country-tooltip")
        .style("opacity", 0);

    if (navItems[0] && navItems[0].length) {
        var preset = navItems.filter(".sidebar-nav__item--active");
        if (preset[0] && preset[0][0]) {
            var presetView = d3.select(preset[0][0]).attr("data-view");
            if (presetView) {
                currentView = presetView;
                showVisited = (currentView === "visited" || currentView === "lived");
                showLived = (currentView === "lived");
            }
        }

        navItems.classed("sidebar-nav__item--active", function() {
            return d3.select(this).attr("data-view") === currentView;
        }).attr("aria-pressed", function() {
            return d3.select(this).attr("data-view") === currentView ? "true" : "false";
        });
    }
    d3.select("body").attr("data-view", currentView);

    var livedSet = livedIndex.set || d3.set();
    var livedDetails = livedIndex.detail || {};
    var countryPaths;

    function isVisited(normalizedId) {
        if (!normalizedId) {
            return false;
        }
        return visitedSet.has(normalizedId);
    }

    function isLived(normalizedId) {
        if (!normalizedId) {
            return false;
        }
        return livedSet.has(normalizedId);
    }

    function getCountryInfo(id) {
        var normalizedId = normalizeId(id);
        var fallbackName = normalizedId && nameById[normalizedId] ? nameById[normalizedId] : ("Country " + (normalizedId || id));
        var info = (normalizedId && facts[normalizedId]) || {};
        var name = info.name || fallbackName;
        var fact = info.fact || "";
        var lived = normalizedId && livedDetails[normalizedId] ? livedDetails[normalizedId] : [];
        return { name: name, fact: fact, lived: lived };
    }

    function buildLivedMarkup(entries) {
        if (!entries || !entries.length) {
            return "";
        }
        var totalDays = 0;
        entries.forEach(function(entry) {
            if (entry && entry.durationDays) {
                totalDays += entry.durationDays;
            }
        });
        var totalDurationText = formatDurationFromDays(totalDays, totalDays > 0);
        var headline = "Lived here";
        if (totalDurationText) {
            headline += " — " + totalDurationText;
        }
        var html = '<span class="country-tooltip__section-title">' + escapeHtml(headline) + '</span>';
        entries.forEach(function(entry) {
            var city = entry.primaryCity || (entry.cities && entry.cities.length ? entry.cities[0] : "");
            var cityHtml = city ? '<strong class="country-tooltip__city">' + escapeHtml(city) + '</strong>' : "";
            var timelineHtml = entry.timeline ? escapeHtml(entry.timeline) : "";

            var detailParts = [];
            if (cityHtml) {
                detailParts.push(cityHtml);
            }
            if (timelineHtml) {
                detailParts.push(timelineHtml);
            }

            var detailHtml = detailParts.join(" · ");
            var descriptionHtml = entry.description ? escapeHtml(entry.description) : "";
            var combined = descriptionHtml;
            if (detailHtml) {
                combined = combined ? (combined + " — " + detailHtml) : detailHtml;
            }
            if (!combined) {
                return;
            }
            html += '<span class="country-tooltip__lived-entry">' + combined + '</span>';
        });
        return html;
    }

    function showTooltip(datum) {
        var info = getCountryInfo(datum.normalizedId || datum.id);
        var showFact = !showVisited && !showLived && info.fact && info.fact !== info.name;
        var fact = showFact ? '<span class="country-tooltip__fact">' + escapeHtml(info.fact) + '</span>' : '';
        var livedHtml = showLived ? buildLivedMarkup(info.lived) : '';
        var html = '<span class="country-tooltip__title">' + escapeHtml(info.name) + '</span>' + fact + livedHtml;
        tooltip.style("opacity", 1).html(html);
    }

    function moveTooltip() {
        if (!d3.event) {
            return;
        }
        tooltip
            .style("left", (d3.event.pageX + 16) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
    }

    function hideTooltip() {
        tooltip.style("opacity", 0);
    }

    function getCurrentFill(datum) {
        var visited = isVisited(datum.normalizedId);
        var lived = isLived(datum.normalizedId);

        if (showVisited && showLived) {
            if (lived) {
                return livedHighlightFill;
            }
            return unvisitedFill;
        }

        if (showLived) {
            if (lived) {
                return livedHighlightFill;
            }
            return unvisitedFill;
        }

        if (showVisited) {
            if (visited) {
                return datum.baseFill;
            }
            return unvisitedFill;
        }

        return datum.baseFill;
    }

    function updateCountryFills(duration) {
        duration = duration || 0;
        if (!countryPaths) {
            return;
        }
        countryPaths.each(function(d) {
            var selection = d3.select(this);
            selection.interrupt();
            if (duration > 0) {
                selection
                    .transition()
                    .duration(duration)
                    .attr("fill", getCurrentFill(d));
            } else {
                selection.attr("fill", getCurrentFill(d));
            }
        });
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
    }

    function applyView(view, animate) {
        if (!view) {
            return;
        }
        currentView = view;
        showVisited = (view === "visited" || view === "lived");
        showLived = (view === "lived");
        updateNavState(view);
        updateCountryFills(animate ? 200 : 0);
        hideTooltip();
    }

    if (navItems[0] && navItems[0].length) {
        navItems.on("click", function() {
            var view = d3.select(this).attr("data-view");
            applyView(view, true);
            if (window.__sidebarControl && typeof window.__sidebarControl.setOpen === "function") {
                window.__sidebarControl.setOpen(false);
            }
        });
    }

    countryPaths = content.selectAll("path")
        .data(countries)
        .enter()
        .append("path")
        .each(function(d) {
            d.normalizedId = normalizeId(d.id);
            d.baseFill = color(d.id);
        })
        .attr("d", path)
        .attr("fill", function(d) {
            return getCurrentFill(d);
        })
        .attr("stroke", "#1a1a1a")
        .attr("stroke-width", 0.6)
        .on("mouseover", function(d) {
            var selection = d3.select(this);
            selection.interrupt();
            this.parentNode.appendChild(this);
            var highlightFill = d3.rgb(getCurrentFill(d)).brighter(1.1).toString();
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
        .on("mousemove", function() {
            moveTooltip();
        })
        .on("mouseout", function(d) {
            var selection = d3.select(this);
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

    applyView(currentView, false);

    // Interaction -----------------------------------------------------------
    var degreesPerPixel = 360 / (2 * Math.PI * radius);
    var maxLatRotation = 50;
    var inertia = { vx: 0, vy: 0 };
    var lastDragTimestamp = null;
    var inertiaActive = false;
    var lastDragDelta = { lon: 0, lat: 0, dt: 0 };

    function clampLatitude(value) {
        return Math.max(-maxLatRotation, Math.min(maxLatRotation, value));
    }

    function stopInertia() {
        inertiaActive = false;
    }

    function updatePaths() {
        countryPaths.attr("d", path);
    }

    content.call(d3.behavior.drag()
        .on("dragstart", function() {
            if (d3.event.sourceEvent) {
                d3.event.sourceEvent.preventDefault();
            }
            stopInertia();
            inertia.vx = 0;
            inertia.vy = 0;
            lastDragTimestamp = Date.now();
            lastDragDelta = { lon: 0, lat: 0, dt: 0 };
            hideTooltip();
        })
        .on("drag", function() {
            var now = Date.now();
            var dt = lastDragTimestamp ? (now - lastDragTimestamp) : 0;
            lastDragTimestamp = now;

            var deltaLon = d3.event.dx * degreesPerPixel;
            var deltaLat = d3.event.dy * degreesPerPixel;

            var rotate = projection.rotate();
            var newLon = rotate[0] + deltaLon;
            var newLat = clampLatitude(rotate[1] - deltaLat);

            projection.rotate([newLon, newLat, rotate[2]]);
            updatePaths();

            if (dt > 0) {
                var actualLonChange = newLon - rotate[0];
                var actualLatChange = newLat - rotate[1];
                if (dt <= 120) {
                    lastDragDelta = {
                        lon: actualLonChange,
                        lat: actualLatChange,
                        dt: dt
                    };
                } else {
                    lastDragDelta = { lon: 0, lat: 0, dt: 0 };
                }
            }
        })
        .on("dragend", function() {
            lastDragTimestamp = null;
            if (!lastDragDelta.dt) {
                inertia.vx = 0;
                inertia.vy = 0;
                return;
            }

            var vx = lastDragDelta.lon / lastDragDelta.dt;
            var vy = lastDragDelta.lat / lastDragDelta.dt;
            var speed = Math.sqrt(vx * vx + vy * vy);
            var minSpeed = 0.002;

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
            var previous = Date.now();

            d3.timer(function() {
                if (!inertiaActive) {
                    return true;
                }

                var now = Date.now();
                var dt = now - previous;
                previous = now;

                if (dt <= 0) {
                    return;
                }

                if (dt > 60) {
                    dt = 60;
                }

                var rotate = projection.rotate();
                var newLon = rotate[0] + inertia.vx * dt;
                var currentLat = rotate[1] + inertia.vy * dt;
                var newLat = clampLatitude(currentLat);

                projection.rotate([newLon, newLat, rotate[2]]);
                updatePaths();

                var damping = Math.exp(-dt / 200);
                inertia.vx *= damping;
                inertia.vy *= damping;

                if (newLat === maxLatRotation || newLat === -maxLatRotation) {
                    inertia.vy = 0;
                }

                var nextSpeed = Math.sqrt(inertia.vx * inertia.vx + inertia.vy * inertia.vy);
                if (nextSpeed < 0.0004) {
                    stopInertia();
                    inertia.vx = 0;
                    inertia.vy = 0;
                    return true;
                }
            });
        })
    );

    // Enable zoom (rescale only)
    content.call(d3.behavior.zoom()
        .scaleExtent([1, 4])
        .on("zoom", function() {
            var zoomScale = d3.event.scale;
            svg.attr("transform", "scale(" + zoomScale + ")");
        })
    );
}

(function initializeSidebar() {
    var body = d3.select("body");
    var sidebar = d3.select("#sidebar");
    var overlay = d3.select("#sidebarOverlay");
    var toggle = d3.select("#sidebarToggle");

    if (sidebar.empty() || overlay.empty() || toggle.empty()) {
        return;
    }

    function setOpen(isOpen) {
        body.classed("sidebar-open", isOpen);
        sidebar.classed("sidebar--open", isOpen).attr("aria-hidden", isOpen ? "false" : "true");
        overlay.classed("sidebar-overlay--visible", isOpen).attr("aria-hidden", isOpen ? "false" : "true");
        toggle
            .attr("aria-expanded", isOpen ? "true" : "false")
            .attr("aria-label", isOpen ? "Close sidebar" : "Open sidebar");
    }

    toggle.on("click", function() {
        var expanded = toggle.attr("aria-expanded") === "true";
        setOpen(!expanded);
    });

    overlay.on("click", function() {
        setOpen(false);
    });

    d3.select(window).on("keydown.sidebar", function() {
        if (d3.event && d3.event.key === "Escape") {
            setOpen(false);
        }
    });

    window.__sidebarControl = {
        setOpen: setOpen
    };
})();
