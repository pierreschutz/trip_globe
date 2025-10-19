
//Url: https://unpkg.com/world-atlas@1.1.4/world/50m.json
d3.json("world.json", function(world) {

    const viz = d3.select('#mapViz')

    const viz_width = viz.node().getBoundingClientRect().width
    const viz_height = viz.node().getBoundingClientRect().height

    const svg_width = viz_width*0.98
    const svg_height = viz_height*0.98



    const scale = 800
    const mid = scale/2
    const radius = scale/3


    const svg = viz
        .append('svg')
        .attr('width', svg_width)
        .attr('height', svg_height)
        .attr('viewBox',`0 0 ${scale} ${scale}`)
        .attr('preserveAspectRatio',"xMidYMid")


    const content = svg.append('g')



    // Add blue background for the sea
    content.append('circle')
        .attr('cx', mid)
        .attr('cy', mid)
        .attr('r', radius)
        .attr('fill', 'lightBlue');



    // Build the map projection
    let projection = d3.geo.orthographic().scale(radius).translate([mid, mid]).clipAngle(90);
    let path = d3.geo.path().projection(projection);
    let countries = topojson.feature(world, world.objects.countries).features;
    let color = d3.scale.category20c();

    // Add colors to the countries, and animation
    content.selectAll("path")
    .data(countries)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", function (d) {
        return color(d.id);
    })
    .attr("stroke", "#1a1a1a")
    .attr("stroke-width", 0.6)
    .on("mouseover", function (d) {
        const selection = d3.select(this);
        // interrupt running transitions before applying highlight
        selection.interrupt();
        this.parentNode.appendChild(this); // keep hovered country on top
        const baseFill = color(d.id);
        const highlightFill = d3.rgb(baseFill).brighter(1.1).toString();
        selection
            .transition()
            .duration(200)
            .ease("cubic-out")
            .attr("fill", highlightFill)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2.2);
    })
    .on("mouseout", function (d) {
        const selection = d3.select(this);
        selection.interrupt();
        selection
            .transition()
            .duration(200)
            .ease("cubic-out")
            .attr("fill", color(d.id))
            .attr("stroke", "#1a1a1a")
            .attr("stroke-width", 0.6);
    });




    // Enable the user to rotate the map
    const degreesPerPixel = 360 / (2 * Math.PI * radius);
    const maxLatRotation = 50;
    content.call(d3.behavior.drag()
        .on("dragstart", function () {
            if (d3.event.sourceEvent) {
                d3.event.sourceEvent.preventDefault();
            }
        })
        .on("drag", function() {
            const rotate = projection.rotate();
            const newRotate = [
                rotate[0] + d3.event.dx * degreesPerPixel,
                rotate[1] - d3.event.dy * degreesPerPixel,
                rotate[2]
            ];
            newRotate[1] = Math.max(-maxLatRotation, Math.min(maxLatRotation, newRotate[1]));
            projection.rotate(newRotate);
            // Update paths with rotation
            content.selectAll("path").attr("d", path);
        }));


    // Enable zoom (rescale only
    content.call(d3.behavior.zoom()
        .scaleExtent([1, 4])
        .on("zoom", function () {
            const scale = d3.event.scale
            svg.attr('transform', `scale(${scale})`)
        })
    )




});
