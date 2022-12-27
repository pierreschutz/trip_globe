
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

    // Add colors to the countries
    content.selectAll("path").data(countries)
        .enter().append("path").attr(
            {
            "d": path,
            "fill": function (d) {
                return  color(d.id);
            },
            "stroke":"black",
            "stoke-width": "10"
        });




    // Enable the user to rotate the map
    content.call(d3.behavior.drag()
        .origin(function() {
            // Save the initial rotation position
            const r1 = projection.rotate();
            return {x: r1[0], y: -r1[1]};
        })
        .on("drag", function() {
            // Rotate the globe
            const r2 = projection.rotate();
            projection.rotate([d3.event.x, -d3.event.y, 0]); //r2[2]]); Only two axis rotation at the same time.
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