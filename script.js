const container_mapa = document.querySelector(".container-mapa");
//const mapa_el = document.querySelector(".mapa");
//const mapa = d3.select(".mapa");

let mapa;
let grafico_barras, grafico_qde_lucro_prej;
let dados;

fetch("dados.json").then(response => response.json()).then(data => {

    console.log(data);

    dados = data.dados;

    const sumario_coropletico = data.coropletico;

    lucro_preju = data.lucro_preju;

    //console.log(dados.map(d => d["Lucro / Prejuízo Líquido do Exercício"]))

    const geojson = {
        type: "FeatureCollection",
        features: data.mapa.map(({ geometry, ...properties }) => ({
            type: "Feature",
            geometry,
            properties
        }))
    };

    mapa = new Mapa(".mapa", geojson, sumario_coropletico);
    grafico_barras = new GraficoBarras("grafico-barras", dados, data.categorias);

    grafico_qde_lucro_prej = new GraficoQdeLucroPrejuizo("grafico-conta-lucro-preju", lucro_preju, grafico_barras.setores, grafico_barras.ufs);

    controle_aba.dataset.abaVisivel = "mapa";

})

class Mapa {

    polygons;
    cor;

    constructor(ref, data, sumario_coropletico) {

        this.data = data;
        this.sumario_coropletico = sumario_coropletico;
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

        this.variavel_coropletico = "qde";
        this.seletor_coropletico = document.querySelector("[name='variavel-coropletico']");

        this.monitora_seletor();
        this.atualiza_cor();

    }

    draw_map() {

        this.polygons = this.svg.selectAll("path.uf")
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

    monitora_seletor() {

        this.seletor_coropletico.addEventListener("change", e => {

            this.variavel_coropletico = e.target.value;
            console.log(this.variavel_coropletico);

            this.atualiza_cor();

        })

    }

    atualiza_cor() {

        const valores = this.sumario_coropletico.map(d => d[this.variavel_coropletico]);

        const vlr_min = d3.min(valores);
        const vlr_max = d3.max(valores);
        if (this.variavel_coropletico != "lucro_prejuizo") {

            this.cor = d3.scaleQuantize().domain([vlr_min, vlr_max]).range(d3.schemeGnBu[5]);

        } else {

            this.cor_negativos = d3.scaleQuantize()
                .domain([vlr_min, 0])
                .range(d3.schemeReds[3].slice().reverse());

            this.cor_positivos = d3.scaleQuantize()
                .domain([0, vlr_max])
                .range(d3.schemeBlues[3]);

        }

        this.polygons.style("fill", d => {

            const uf = d.properties.abbrev_state;

            const el_array = this.sumario_coropletico.filter(x => x.UF == uf)[0];

            if (!el_array) return "gray";

            const valor = el_array[this.variavel_coropletico];

            let color;

            if (this.variavel_coropletico != "lucro_prejuizo") {

                color = this.cor(valor);

            } else {

                color = valor < 0 ? this.cor_negativos(valor) : this.cor_positivos(valor);
            }

            return color;

        })

        this.constroi_legenda();

    }

    constroi_legenda() {

        this.legenda = d3.select(".container-mapa div.legenda-mapa");

        this.legenda.html("");

        const conteudo_seletor = this.seletor_coropletico.selectedOptions[0].textContent;

        this.legenda.append("h3").text(conteudo_seletor);

        let valores_legenda, cores_legenda;

        if (this.variavel_coropletico != "lucro_prejuizo") {

            valores_legenda = this.cor.thresholds();
            cores_legenda = this.cor.range();

        } else {

            valores_legenda = [...this.cor_negativos.thresholds(), 0, ...this.cor_positivos.thresholds()];

            cores_legenda = [...this.cor_negativos.range(), ...this.cor_positivos.range()];

        }

        if (this.variavel_coropletico != "qde") {

            valores_legenda = valores_legenda.map(d =>
                this.variavel_coropletico == "desp_pessoal" ? 
                (100 * d).toLocaleString('pt-BR', {maximumFractionDigits: 0}) + "%" : 
                formata_para_legenda(d)
            );

        } else {

            valores_legenda = valores_legenda.map(d => Math.round(d,0))

        }
        

        console.log(valores_legenda, cores_legenda);

        cores_legenda.forEach( (cor,i) => {

            let texto;

            if (i == 0) {

                texto = "Menos de " + valores_legenda[i];

            } else if (i == cores_legenda.length - 1) {

                texto = "Mais de " + valores_legenda[i-1];

            } else {

                texto = `${valores_legenda[i-1]} a ${valores_legenda[i]}`
            }

            const linha = this.legenda.append("div").classed("linha-legenda", true);

            linha.append("span").classed("key", true).style("background-color", cor);

            linha.append("span").classed("legenda-texto", true).text(texto);

        })

    }

    constroi_legenda_by_Copilot() {

        //feito por IA, ficou trash

        const formatador = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
        const formatarIntervalo = (limites, indice, total) => {
            const [min, max] = limites;

            if (indice === 0) return `≤ ${formatador.format(max)}`;
            if (indice === total - 1) return `≥ ${formatador.format(min)}`;
            return `${formatador.format(min)}–${formatador.format(max)}`;
        };

        const escalas = this.variavel_coropletico === "lucro_prejuizo"
            ? [this.cor_negativos, this.cor_positivos]
            : [this.cor];

        const itens = escalas.flatMap(escala => {
            const cores = escala.range();
            return cores.map((cor, indice) => ({
                cor,
                rotulo: formatarIntervalo(escala.invertExtent(cor), indice, cores.length)
            }));
        });
        itens.push({ cor: "gray", rotulo: "Sem dados" });

        const tituloSelecionado = this.seletor_coropletico.selectedOptions[0];
        const titulo = tituloSelecionado ? tituloSelecionado.textContent.trim() : this.variavel_coropletico;
        const linhaAltura = 20;
        const largura = 170;
        const altura = 34 + itens.length * linhaAltura;
        const legenda = this.svg.selectAll("g.legenda-coropletico")
            .data([null])
            .join("g")
            .attr("class", "legenda-coropletico")
            .attr("transform", "translate(12,12)")
            .attr("font-family", "sans-serif")
            .attr("font-size", 12);

        legenda.selectAll("rect.fundo")
            .data([null])
            .join("rect")
            .attr("class", "fundo")
            .attr("width", largura)
            .attr("height", altura)
            .attr("rx", 4)
            .attr("fill", "white")
            .attr("fill-opacity", 0.9)
            .attr("stroke", "#999");

        legenda.selectAll("text.titulo")
            .data([titulo])
            .join("text")
            .attr("class", "titulo")
            .attr("x", 8)
            .attr("y", 18)
            .attr("font-weight", "bold")
            .text(d => d);

        const linhas = legenda.selectAll("g.item")
            .data(itens)
            .join("g")
            .attr("class", "item")
            .attr("transform", (d, i) => `translate(8,${27 + i * linhaAltura})`);

        linhas.selectAll("rect")
            .data(d => [d])
            .join("rect")
            .attr("width", 18)
            .attr("height", 14)
            .attr("fill", d => d.cor);

        linhas.selectAll("text")
            .data(d => [d])
            .join("text")
            .attr("x", 25)
            .attr("y", 11)
            .text(d => d.rotulo);

    }
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

class GraficoQdeLucroPrejuizo {

    constructor(ref, dados, setores, ufs) {

        this.dados = dados;
        this.setores = setores;
        this.ufs = ufs;

        this.setor_atual = "Todos";
        this.uf_atual = "Todas";

        this.svg = d3.select("." + ref);
        this.container = d3.select(".container-" + ref);

        this.seletor_setor = document.querySelector('[name="seletor-setor-lucro-preju"]');
        this.seletor_uf = document.querySelector('[name="seletor-uf-lucro-preju"]');

        this.w = +this.svg.style("width").slice(0,-2);
        this.h = +this.svg.style("height").slice(0,-2);

        this.margin = 15;

        this.svg.attr("viewBox", `0 0 ${this.w} ${this.h}`);
        this.svg.attr("width", this.w);
        this.svg.attr("height", this.h);  
        
        this.monta_componentes_grafico();
        this.monta_eixos();
        this.atualiza_grafico();

        this.popula_seletores();
        this.monitora_seletores();

    }

    monta_componentes_grafico() {

        this.x = d3.scaleBand()
            .domain(["DEPENDENTE", "NÃO DEPENDENTE", "TOTAL"])
            .range([
                this.margin * 2,
                this.w - this.margin
            ])
        ;

        this.y = d3.scaleLinear()
            .domain([0, 1])
            .range([this.margin, this.h - this.margin * 3])
        ;

        this.h_ = d3.scaleLinear()
            .domain([0, 1])
            .range([0, this.h - 4 * this.margin])
        ;

    }

    monta_eixos() {

        const data_y = [0, 0.25, 0.5, 0.75, 1];
        const data_x = ["DEPENDENTE", "NÃO DEPENDENTE", "TOTAL"];


        // y

        this.svg.append("g").classed("legendas", true)
            .selectAll("line.legenda-y")
            .data(data_y)
            .join("line")
            .classed("leganda-y", true)
            .attr("x1", this.x("DEPENDENTE") + this.x.bandwidth() * 0.5 - 20)
            .attr("x2", this.x("DEPENDENTE") + this.x.bandwidth() * 0.5 - 10)
            .attr("y1", d => this.y(d))
            .attr("y2", d => this.y(d))
            .attr("stroke", "black")    
        ;

        this.container.selectAll("p.texto-legendas-y")
            .data(data_y)
            .join("p")
            .classed("texto-legendas-y", true)
            .style("left", (this.x("DEPENDENTE") + this.x.bandwidth() * 0.5 - 20) + "px")
            .style("top", d => this.y(d) + "px")
            .text(d => (1 - d) * 100 + "%")
        ;

        // x

        this.svg.append("g").classed("legendas", true)
            .selectAll("line.legenda-x")
            .data(data_x)
            .join("line")
            .classed("leganda-x", true)
            .attr("x1", d => this.x(d) + this.x.bandwidth() * 0.75)
            .attr("x2", d => this.x(d) + this.x.bandwidth() * 0.75)
            .attr("y1", d => this.y(1) + 10)
            .attr("y2", d => this.y(1) + 20)
            .attr("stroke", "black")    
        ;        

        this.container.selectAll("p.texto-legendas-x")
            .data(data_x)
            .join("p")
            .classed("texto-legendas-x", true)
            .style("left", d => (this.x(d) + this.x.bandwidth() * 0.75) + "px")
            .style("top", d => this.y(1) + 20 + "px")
            .text(d => d)
        ;


    }

    atualiza_grafico() {

        const mini_data = this.dados.filter(d => d.UF == this.uf_atual && d["Setor"] == this.setor_atual);

        console.log(mini_data);

        this.svg.selectAll("rect.lucro-preju").data(mini_data).join("rect")
            .attr("class", d => d.tipo)
            .classed("lucro-preju", true)
            .attr("x", d => this.x(d["Dependencia"]) + this.x.bandwidth() * 0.5)
            .attr("width", this.x.bandwidth() * 0.5)
            .transition()
            .duration(500)
            .attr("y", d => this.y(d.h0))
            .attr("height", d => this.h_(d.pct))            
        ;

        this.adiciona_rotulos(mini_data);

    }

    adiciona_rotulos(mini_data) {

        this.container.selectAll("span.rotulo-grafico")
            .data(mini_data)
            .join("span")
            .classed("rotulo-grafico", true)
            .classed("escondido", d => d.qde == 0)
            .style("left", 
                d => (this.x(d["Dependencia"]) + this.x.bandwidth() * 0.5) + "px"
            )
            .style("width", (this.x.bandwidth() * 0.5) + "px" )
            .html(d => `${d.qde}<br> (${(d.pct * 100).toFixed(1)}%)`)
            .transition()
            .duration(500)
            .style("top", d => this.y(d.h0) + "px")
        ;

    }

    popula_seletores() {

        this.setores.forEach(setor => {

            const new_option = document.createElement("option");
            
            new_option.value = setor;
            new_option.textContent = setor;

            this.seletor_setor.appendChild(new_option);

        });

        this.ufs.forEach(uf => {

            const new_option = document.createElement("option");
            
            new_option.value = uf;
            new_option.textContent = uf;

            this.seletor_uf.appendChild(new_option);

        });        

    }

    monitora_seletores() {

        this.seletor_setor.addEventListener("change", e => {

            this.setor_atual = e.target.value;
            this.atualiza_grafico();

        })

        this.seletor_uf.addEventListener("change", e => {

            this.uf_atual = e.target.value;
            this.atualiza_grafico();

        })

    }

}

// BOTOES

const body = document.querySelector("body");
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

const formataReal = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
 });

function formata_valor_brasileiro(valor) {

    const valor_ = Number(String(valor).replace(",", "."));

    return formataReal.format(valor_);

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


    body.classList.add("no-scroll");
    modal.classList.add("ativo");
    sombra.classList.add("ativo");

    const dados_empresa = dados.find(d => d.CNPJ == id);
    console.log(dados_empresa);

    popula_informacoes_empresa(dados_empresa);

}

function esconde_card_empresa() {

    sombra.classList.remove("ativo");
    modal.classList.remove("ativo");  
    body.classList.remove("no-scroll");

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
        const valor = dados_empresa[key];

        campo.innerHTML = valor_numerico ? formata_valor_brasileiro(valor) : valor;

    })

    document.querySelector(".link-carta").href = dados_empresa["Link Carta Anual"];


}


function formata_para_legenda(valor) {
    const unidades = [
        { valor: 1e12, sufixo: "tri" },
        { valor: 1e9,  sufixo: "bi" },
        { valor: 1e6,  sufixo: "mi" },
        { valor: 1e3,  sufixo: "mil" }
    ];

    const valor_abs = Math.abs(valor);
    const unidade = unidades.find(u => valor_abs >= u.valor);

    if (!unidade) {
        return `R$ ${valor.toLocaleString("pt-BR", {
            maximumFractionDigits: 0
        })}`;
    }

    const numero = valor / unidade.valor;

    const formatado = numero.toLocaleString("pt-BR", {
        maximumSignificantDigits: 3
    });

    //const sufixo = Math.abs(numero) === 1 ? unidade.singular : unidade.plural;

    const sufixo = unidade.sufixo;

    return `R$ ${formatado} ${sufixo}`;
}