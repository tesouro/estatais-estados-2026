const container_mapa = document.querySelector(".container-mapa");
//const mapa_el = document.querySelector(".mapa");
//const mapa = d3.select(".mapa");

let mapa;
let dados;

fetch("dados.json").then(response => response.json()).then(data => {

    console.log(data);

    dados = data.dados;

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
        this.add_click_interaction();

    }

    draw_map() {

        this.svg.selectAll("path.uf")
            .data(this.data.features)
            .join("path")
            .classed("uf", true)
            .attr("d", d3.geoPath().projection(this.proj))
        ;

    }

    add_click_interaction() {

        this.svg.selectAll("path.uf")
            .on("click", (event, d) => this.click_handler(event, d));

    }

    click_handler(event, d) {

        console.log(d);

        this.svg.selectAll("path.uf").classed("ativo", false);
        d3.select(event.target).classed("ativo", true);

        this.preenche_box_estado(d.properties.abbrev_state, d.properties.name_state);

    }

    preenche_box_estado(uf, nome_estado) {

        document.querySelector(".container-visao-estado").classList.add("visivel");
        const mini_data = dados.filter(d => d.UF == uf);

        console.log(mini_data);

        document.querySelector(".box-nome-estado").textContent = nome_estado;

        const dados_box = {
            'quantidade' : mini_data.length,
            'quantidade-dep' : mini_data.filter(d => d["Dependência"] == "DEPENDENTE").length,
            'quantidade-nao-dep' : mini_data.filter(d => d["Dependência"] == "NÃO DEPENDENTE").length,
        }

        Object.keys(dados_box).forEach(chave => {

            document.querySelector(`[data-info-box-estado="${chave}"]`).textContent = dados_box[chave];

        });

        const setores = mini_data.map(d => d.Setor).filter( (d, i, a) => a.indexOf(d) == i);

        const box_setores = document.querySelector(".box-setores");
        box_setores.innerHTML = "";

        setores.forEach(setor => {

            const subtitulo = document.createElement("p");
            subtitulo.textContent = setor;
            subtitulo.classList.add("box-titulo-setor");

            const container_lista_empresas_setor = document.createElement("div");
            container_lista_empresas_setor.classList.add("box-container-empresas-setor");

            const empresas = mini_data.filter(d => d.Setor == setor);

            empresas.forEach(empresa => {

                const marcador_empresa = document.createElement("span");
                marcador_empresa.classList.add("box-marcador-empresa");
                marcador_empresa.dataset.idEmpresa = empresa.CNPJ;
                
                if (empresa["Dependência"] == "DEPENDENTE") {
                    marcador_empresa.classList.add("marcador-dependente");
                } else {
                    marcador_empresa.classList.add("marcador-nao-dependente");
                }   
                
                container_lista_empresas_setor.append(marcador_empresa);

            })

            box_setores.append(subtitulo, container_lista_empresas_setor);


        })

    }
}

// BOTOES

const controle_aba = document.querySelector("[data-aba-visivel");
const barra_controle = document.querySelector(".barra-controle");

function reseta_botoes() {

    barra_controle.querySelectorAll("button").forEach(btn => btn.classList.remove("ativo"));

}
barra_controle.addEventListener("click", e => {

    if (e.target.tagName == "BUTTON") {

        const modo = e.target.dataset.modo;
        
        reseta_botoes();

        e.target.classList.add("ativo");

        controle_aba.dataset.abaVisivel = modo;

    }

})

