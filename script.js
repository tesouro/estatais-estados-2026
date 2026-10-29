const container_mapa = document.querySelector(".container-mapa");
//const mapa_el = document.querySelector(".mapa");
//const mapa = d3.select(".mapa");

let mapa;
let grafico_barras;
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

    mapa = new Mapa(".mapa", geojson);
    grafico_barras = new GraficoBarras("grafico-barras", dados, data.categorias);

    controle_aba.dataset.abaVisivel = "mapa";





})

class Mapa {

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

            const container_lista_empresas_setor = document.createElement("ul");
            container_lista_empresas_setor.classList.add("box-container-empresas-setor");

            const empresas = mini_data.filter(d => d.Setor == setor);

            console.log(empresas);

            empresas.forEach(empresa => {

                const el_nome_empresa = document.createElement("li");
                el_nome_empresa.classList.add("empresa-do-setor");
                el_nome_empresa.dataset.idEmpresa = empresa.CNPJ;
                el_nome_empresa.innerHTML = empresa.Estatal;
                
                /*
                if (empresa["Dependência"] == "DEPENDENTE") {
                    marcador_empresa.classList.add("marcador-dependente");
                } else {
                    marcador_empresa.classList.add("marcador-nao-dependente");
                } */
                
                container_lista_empresas_setor.append(el_nome_empresa);

            })

            box_setores.append(subtitulo, container_lista_empresas_setor);


        })

    }
}

// BOTOES

const controle_aba = document.querySelector("[data-aba-visivel]");
const barra_controle = document.querySelector(".barra-controle");
const seletor_grafico_barras = document.querySelector('.titulo-grafico-barras select');
const box_setores = document.querySelector(".box-setores");

function reseta_botoes() {

    barra_controle.querySelectorAll("button").forEach(btn => btn.classList.remove("ativo"));

}

function reseta_lista_empresas() {

    document.querySelectorAll("li.empresa-do-setor").forEach(li => {
        li.classList.remove("selected");
    })

}

barra_controle.addEventListener("click", e => {

    if (e.target.tagName == "BUTTON") {

        const modo = e.target.dataset.modo;
        
        reseta_botoes();

        e.target.classList.add("ativo");

        controle_aba.dataset.abaVisivel = modo;

    }

});

seletor_grafico_barras.addEventListener("change", e => {

    const modo = e.target.value;

    grafico_barras.atualiza_grafico(modo);
    grafico_barras.mostra_rotulos(modo);

})

box_setores.addEventListener("click", e => {

    const el = e.target;

    if (el.tagName == "LI") {

        reseta_lista_empresas();
        el.classList.add("selected");
        mostra_card_empresa(el.dataset.idEmpresa);

    }

})

const modal = document.querySelector("#card-empresa");
const sombra = document.querySelector("#sombra-card-empresa");
const btn_fechar_card = document.querySelector("button.fechar-card");

function mostra_card_empresa(id) {


    modal.classList.add("ativo");
    sombra.classList.add("ativo");

    const dados_empresa = dados.find(d => d.CNPJ == id);
    console.log(dados_empresa);

    popula_informacoes_empresa(dados_empresa);

}

function esconde_card_empresa() {


function formata_valor_brasileiro(valor) {

    const numero = Number(valor);
    return Number.isFinite(numero) ? numero.toLocaleString("pt-BR") : valor;

}
    sombra.classList.remove("ativo");
    modal.classList.remove("ativo");  

}

sombra.addEventListener("click", e => {

    esconde_card_empresa();

})

btn_fechar_card.addEventListener("click", e => {

    esconde_card_empresa();

})

function formatarNumero(valor, casasDecimais = 0) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais
  }).format(valor);
}

function popula_informacoes_empresa(dados_empresa) {

    const campos = document.querySelectorAll("[data-card-empresa]");

    campos.forEach(campo => {

        const key = campo.dataset.cardEmpresa;
        const valor_numerico = campo.classList.contains("valor-numerico");
        const valor = dados_empresa[key]
        campo.innerHTML = valor_numerico ? valor : valor;

    })

    document.querySelector(".link-carta").href = dados_empresa["Link Carta Anual"];


}


class GraficoBarras {

    constructor(ref, dados, categorias) {

        this.dados = dados;
        this.svg = d3.select("." + ref);
        this.container = d3.select(".container-" + ref);

        this.categorias = categorias


        this.w = +this.svg.style("width").slice(0,-2);
        this.h = +this.svg.style("height").slice(0,-2);

        this.margin = 10;

        this.svg.attr("viewBox", `0 0 ${this.w} ${this.h}`);
        this.svg.attr("width", this.w);
        this.svg.attr("height", this.h);

        this.prepara_listas_categorias();

        this.prepara_escalas();

        this.renderiza_grafico();

        this.mostra_rotulos("setor");

    }

    prepara_listas_categorias() {

        this.setores = this.dados
            .map(d => d.Setor)
            .filter( (d,i,a) => a.indexOf(d) == i)
        ;

        this.ufs = this.dados
            .map(d => d.UF)
            .filter( (d,i,a) => a.indexOf(d) == i)
        ;

        console.log(this.setores, this.ufs);

    }

    prepara_escalas(){

        const max_numero_empresas_uf = d3.max(this.dados, d => d.n_uf);
        const max_numero_empresas_setor = d3.max(this.dados, d => d.n_setor);
        
        const maximo = Math.max(max_numero_empresas_setor, max_numero_empresas_uf);

        const largura_maxima_grafico = this.w - (2*this.margin); 
        this.largura_bloquinho = //Math.floor(
            largura_maxima_grafico / maximo;//);

        console.log(this.h, this.margin);

        this.x = d3.scaleLinear().domain([0,maximo]).range([this.margin, this.w-this.margin]);
        this.y_setor = d3.scaleBand()
            .domain(this.setores)
            .rangeRound([this.margin, this.h - this.margin])
            .padding(0.5);

        this.y_uf = d3.scaleBand()
            .domain(this.ufs)
            .rangeRound([this.margin, this.h - this.margin])
            .padding(0.5);
        ;

        this.altura_barra = Math.floor(this.y_uf.bandwidth());
        
        
    }

    renderiza_grafico() {

        this.chart = this.svg.selectAll("rect.empresas")
            .data(this.dados)
            .join("rect")
            .classed("empresas", true)
            .attr("data-tipo-dep", d => d["Dependência"])
            .attr("width", this.largura_bloquinho)
            .attr("height", this.altura_barra)
            .attr("x", d => this.x(d.pos_setor))
            .attr("y", d => this.y_setor(d.Setor))
        ;

    }

    atualiza_grafico(modo){

        const variavel = modo == "setor" ? "Setor" : "UF";

        this.chart
            .transition()
            .duration(1000)
            .delay((d,i) => i * 1)
            .attr("x", d => this.x(d["pos_" + modo]))
            .attr("y", d => this["y_"+modo](d[variavel]))
        ;

    }

    mostra_rotulos(modo) {

        const key = modo == "setor" ? "setores" : "ufs";
        const variavel = modo == "setor" ? "Setor" : "UF";

        this.rotulos = this.container.selectAll("span.rotulo")
            .data(this.categorias[modo])
            .join("span")
            .classed("rotulo", true)
            .style("left", this.x(1) + "px")
            .style("top", d => (this["y_" + modo](d[variavel])) + "px")
            .text(d => d[variavel] + ": " + d["n_" + modo])
            .style("opacity", 0)
            .transition()
            .duration(1000)
            .delay( (d,i) => i * 50)
            .style("opacity", 1)
        ;
    }

}

