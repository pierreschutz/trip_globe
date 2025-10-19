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
                renderGlobe(world, nameById, normalizedFacts, visitedSet);
            });
        });
    });
});

// Rendering -----------------------------------------------------------------
function renderGlobe(world, nameById, facts, visitedSet) {
    var viz = d3.select("#mapViz");

    var vizWidth = viz.node().getBoundingClientRect().width;
    var vizHeight = viz.node().getBoundingClientRect().height;

    var svgWidth = vizWidth * 0.98;
    var svgHeight = vizHeight * 0.98;

    var scale = 800;
    var mid = scale / 2;
    var radius = scale / 3;

    var svg = viz
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .attr("viewBox", "0 0 " + scale + " " + scale)
        .attr("preserveAspectRatio", "xMidYMid");

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

    var visitedToggle = d3.select("#visitedToggle");
    var showVisited = !visitedToggle.empty() && visitedToggle.property("checked");
    var unvisitedFill = "#3f4453";

    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "country-tooltip")
        .style("opacity", 0);

    function isVisited(normalizedId) {
        if (!normalizedId || !visitedSet) {
            return false;
        }
        return visitedSet.has(normalizedId);
    }

    function getCountryInfo(id) {
        var normalizedId = normalizeId(id);
        var fallbackName = normalizedId && nameById[normalizedId] ? nameById[normalizedId] : ("Country " + (normalizedId || id));
        var info = (normalizedId && facts[normalizedId]) || {};
        var name = info.name || fallbackName;
        var fact = info.fact || name;
        return { name: name, fact: fact };
    }

    function showTooltip(datum) {
        var info = getCountryInfo(datum.normalizedId || datum.id);
        tooltip
            .style("opacity", 1)
            .html(
                '<span class="country-tooltip__title">' +
                info.name +
                "</span><span>" +
                info.fact +
                "</span>"
            );
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
        if (showVisited && !isVisited(datum.normalizedId)) {
            return unvisitedFill;
        }
        return datum.baseFill;
    }

    function updateCountryFills(duration) {
        duration = duration || 0;
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

    if (!visitedToggle.empty()) {
        visitedToggle.on("change", function() {
            showVisited = this.checked;
            updateCountryFills(180);
        });
    }

    var countryPaths = content.selectAll("path")
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
