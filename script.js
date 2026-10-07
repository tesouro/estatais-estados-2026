const container_mapa = document.querySelector(".container-mapa");
//const mapa_el = document.querySelector(".mapa");
//const mapa = d3.select(".mapa");

let mapa;

fetch("dados.json").then(response => response.json()).then(data => {

    console.log(data);

    const geojson = {
        type: "FeatureCollection",
        features: data.mapa.map(({ geometry, ...properties }) => ({
            type: "Feature",
            geometry,
            properties
        }))
    };

    mapa = new Map(".mapa", geojson);



})

console.log("oxe");

class Map {

    constructor(ref, data) {

        this.data = data;
        this.svg = d3.select(ref);

        const res = 2;

        this.w = res*this.svg.style("width").slice(0,-2);
        this.h = res*this.svg.style("height").slice(0,-2);

        this.svg.attr("viewBox", `0 0 ${this.w} ${this.h}`);
        this.svg.attr("width", this.w);
        this.svg.attr("height", this.h);

        this.proj = d3.geoMercator()
                //.center([-55, -15])
                //.scale(800)
                //.translate([this.w / 2, this.h / 2])
                .fitSize([this.w, this.h], this.data)
            ;

        this.draw_map();

    }

    draw_map() {

        this.svg.selectAll("path.uf")
            .data(this.data.features)
            .join("path")
            .classed("uf", true)
            .attr("d", d3.geoPath().projection(this.proj))
        ;

    }
}
