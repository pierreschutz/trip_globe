
//Url: https://unpkg.com/world-atlas@1.1.4/world/50m.json
d3.json("world.json", function(world) {

    // Add blue background for the sea
    d3.select("#svg").append('circle')
        .attr('cx', 400)
        .attr('cy', 300)
        .attr('r', 245)
        .attr('fill', 'lightBlue');



    // Build the map projection
    let projection = d3.geo.orthographic().scale(245).translate([400, 300]).clipAngle(90);
    let path = d3.geo.path().projection(projection);
    let countries = topojson.feature(world, world.objects.countries).features;
    let color = d3.scale.category20c();

    // Add colors to the countries
    d3.select("#svg").selectAll("path").data(countries)
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
    d3.select("#svg").call(d3.behavior.drag()
        .origin(function() {
            // Save the initial rotation position
            const r1 = projection.rotate();
            return {x: r1[0], y: -r1[1]};
        })
        .on("drag", function() {
            // Rotate the globe
            const r2 = projection.rotate();
            projection.rotate([d3.event.x, -d3.event.y, r2[2]]);
            // Update paths with rotation
            d3.select("#svg").selectAll("path").attr("d", path);
        }));



});