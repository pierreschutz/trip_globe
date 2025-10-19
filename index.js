// Url: https://unpkg.com/world-atlas@1.1.4/world/50m.json
d3.json("world.json", function(error, world) {
    if (error) {
        console.error("Unable to load world.json", error);
        return;
    }

    d3.tsv("country-names.tsv", function(namesError, names) {
        if (namesError) {
            console.error("Unable to load country-names.tsv", namesError);
            return;
        }

        const nameById = {};
        names.forEach(function(d) {
            nameById[d.id] = d.name;
        });

        d3.json("country-facts.json", function(factsError, facts) {
            if (factsError) {
                console.warn("country-facts.json missing or invalid. Falling back to defaults.", factsError);
                facts = {};
            }

            renderGlobe(world, nameById, facts || {});
        });
    });
});

function renderGlobe(world, nameById, facts) {
    const viz = d3.select('#mapViz');

    const vizWidth = viz.node().getBoundingClientRect().width;
    const vizHeight = viz.node().getBoundingClientRect().height;

    const svgWidth = vizWidth * 0.98;
    const svgHeight = vizHeight * 0.98;

    const scale = 800;
    const mid = scale / 2;
    const radius = scale / 3;

    const svg = viz
        .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .attr('viewBox', '0 0 ' + scale + ' ' + scale)
        .attr('preserveAspectRatio', 'xMidYMid');

    const content = svg.append('g');

    // Add blue background for the sea
    content.append('circle')
        .attr('cx', mid)
        .attr('cy', mid)
        .attr('r', radius)
        .attr('fill', 'lightBlue');

    // Build the map projection
    const projection = d3.geo.orthographic().scale(radius).translate([mid, mid]).clipAngle(90);
    const path = d3.geo.path().projection(projection);
    const countries = topojson.feature(world, world.objects.countries).features;
    const color = d3.scale.category20c();

    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'country-tooltip')
        .style('opacity', 0);

    function getCountryInfo(id) {
        const fallbackName = nameById[id] || ('Country ' + id);
        const info = facts[id] || {};
        const name = info.name || fallbackName;
        const fact = info.fact || ('Fun fact coming soon for ' + name + '.');
        return { name: name, fact: fact };
    }

    function showTooltip(id) {
        const info = getCountryInfo(id);
        tooltip
            .style('opacity', 1)
            .html(
                '<span class="country-tooltip__title">' +
                info.name +
                '</span><span>' +
                info.fact +
                '</span>'
            );
    }

    function moveTooltip() {
        if (!d3.event) {
            return;
        }
        tooltip
            .style('left', (d3.event.pageX + 16) + 'px')
            .style('top', (d3.event.pageY - 28) + 'px');
    }

    function hideTooltip() {
        tooltip.style('opacity', 0);
    }

    // Add colors to the countries, and animation
    content.selectAll('path')
        .data(countries)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', function(d) {
            return color(d.id);
        })
        .attr('stroke', '#1a1a1a')
        .attr('stroke-width', 0.6)
        .on('mouseover', function(d) {
            const selection = d3.select(this);
            selection.interrupt();
            this.parentNode.appendChild(this);
            const baseFill = color(d.id);
            const highlightFill = d3.rgb(baseFill).brighter(1.1).toString();
            selection
                .transition()
                .duration(200)
                .ease('cubic-out')
                .attr('fill', highlightFill)
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 2.2);

            showTooltip(d.id);
            moveTooltip();
        })
        .on('mousemove', function() {
            moveTooltip();
        })
        .on('mouseout', function(d) {
            const selection = d3.select(this);
            selection.interrupt();
            selection
                .transition()
                .duration(200)
                .ease('cubic-out')
                .attr('fill', color(d.id))
                .attr('stroke', '#1a1a1a')
                .attr('stroke-width', 0.6);

            hideTooltip();
        });

    const degreesPerPixel = 360 / (2 * Math.PI * radius);
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

    function updatePaths() {
        content.selectAll('path').attr('d', path);
    }

    content.call(d3.behavior.drag()
        .on('dragstart', function() {
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
        .on('drag', function() {
            const now = Date.now();
            const dt = lastDragTimestamp ? (now - lastDragTimestamp) : 0;
            lastDragTimestamp = now;

            const deltaLon = d3.event.dx * degreesPerPixel;
            const deltaLat = d3.event.dy * degreesPerPixel;

            const rotate = projection.rotate();
            const newLon = rotate[0] + deltaLon;
            const newLat = clampLatitude(rotate[1] - deltaLat);

            projection.rotate([newLon, newLat, rotate[2]]);
            updatePaths();

            if (dt > 0) {
                const actualLonChange = newLon - rotate[0];
                const actualLatChange = newLat - rotate[1];
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
        .on('dragend', function() {
            lastDragTimestamp = null;
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

            d3.timer(function() {
                if (!inertiaActive) {
                    return true;
                }

                const now = Date.now();
                let dt = now - previous;
                previous = now;

                if (dt <= 0) {
                    return;
                }

                if (dt > 60) {
                    dt = 60;
                }

                const rotate = projection.rotate();
                const newLon = rotate[0] + inertia.vx * dt;
                const currentLat = rotate[1] + inertia.vy * dt;
                const newLat = clampLatitude(currentLat);

                projection.rotate([newLon, newLat, rotate[2]]);
                updatePaths();

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
            });
        })
    );

    // Enable zoom (rescale only)
    content.call(d3.behavior.zoom()
        .scaleExtent([1, 4])
        .on('zoom', function() {
            const zoomScale = d3.event.scale;
            svg.attr('transform', 'scale(' + zoomScale + ')');
        })
    );
}
