const svg = d3.select(".grafico");
const variableSelect = d3.select("#variavel");
const radiusSelect = d3.select("#variavel-raio");
const width = () => svg.node().clientWidth;
const height = () => svg.node().clientHeight;

const parseNumber = value => Number(String(value ?? "0").replace(/\./g, "").replace(",", ".")) || 0;
const isNumeric = value => value !== null && value !== "" && Number.isFinite(Number(String(value).replace(/\./g, "").replace(",", ".")));
const displayValue = value => String(value ?? "").replace(/\s+/g, " ").trim() || "Sem informação";
const radiusValue = (row, field) => field === "empregados" ? row.empregados : Number(String(row[field] ?? "0").replace(/\./g, "").replace(",", "."));
const formatRadiusValue = (value, field) => {
    const number = radiusValue(value, field);
    return Number.isFinite(number)
        ? number.toLocaleString("pt-BR", { minimumFractionDigits: field === "empregados" ? 0 : 2, maximumFractionDigits: field === "empregados" ? 0 : 2 })
        : "Sem informação";
};

fetch("data.json")
    .then(result => result.json())
    .then(data => {
        const rows = data.filter(row => row && row.UF).map(row => ({
            ...row,
            empregados: parseNumber(row["Número de Empregados (incluindo temporários e terceirizados)"])
        }));
        const states = [...new Set(rows.map(row => row.UF))].sort();
        const color = d3.scaleOrdinal(states, d3.schemeTableau10);
        const categoricalVariables = Object.keys(rows[0]).filter(field => {
            if (["empregados", "Estatal", "Sigla", "CNPJ"].includes(field)) return false;
            const values = rows.map(row => row[field]).filter(value => value !== null && value !== undefined && String(value).trim() !== "");
            return values.length > 1 && values.some(value => !isNumeric(value));
        });
        const numericVariables = ["empregados", ...Object.keys(rows[0]).filter(field => {
            if (field === "Número de Empregados (incluindo temporários e terceirizados)") return false;
            const values = rows.map(row => row[field]).filter(value => value !== null && value !== undefined && String(value).trim() !== "");
            return values.length > 1 && values.every(isNumeric);
        })];

        const categoryCounts = field => d3.rollup(rows, values => values.length, row => displayValue(row[field]));
        variableSelect.selectAll("option")
            .data(categoricalVariables)
            .join("option")
            .attr("value", field => field)
            .text(field => `${field} (${categoryCounts(field).size} categorias)`);
        variableSelect.property("value", "UF");
        radiusSelect.selectAll("option")
            .data(numericVariables)
            .join("option")
            .attr("value", field => field)
            .text(field => field === "empregados" ? "Número de empregados" : field);
        radiusSelect.property("value", "empregados");

        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        let field_selecionado = 'empregados';

        const nodes = rows.map(row => ({ ...row, radius: 7 }));
        const bubbles = svg.selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("class", "bolha")
            .attr("r", row => row.radius)
            .attr("fill", "#2774ae")
            .on("mouseenter", (event, row) => {
                tooltip
                    .style("opacity", 1)
                    .html(`<strong>${row.Sigla || row.Estatal}</strong><br>${row.UF} · ${field_selecionado}: ${formatRadiusValue(row, field_selecionado)}`);
                d3.select(event.currentTarget).raise().attr("stroke-width", 3);
            })
            .on("mousemove", event => {
                tooltip.style("left", `${event.pageX + 14}px`).style("top", `${event.pageY - 14}px`);
            })
            .on("mouseleave", event => {
                tooltip.style("opacity", 0);
                d3.select(event.currentTarget).attr("stroke-width", 1);
            });

        const simulation = d3.forceSimulation(nodes)
            .force("collide", d3.forceCollide(row => row.radius).iterations(2))
            .alphaDecay(0.07)
            .on("tick", () => {
                bubbles.attr("cx", row => row.x).attr("cy", row => row.y);
            });

        const applyRadius = field => {
            field_selecionado = field;
            const maximum = d3.max(nodes, row => Math.abs(radiusValue(row, field))) || 1;
            const radius = d3.scaleSqrt().domain([0, maximum]).range([7, 34]);
            nodes.forEach(row => {
                row.radius = radius(Math.abs(radiusValue(row, field)));
            });
            simulation.force("collide", d3.forceCollide(row => row.radius).iterations(2));
            bubbles
                .attr("r", row => row.radius)
                .attr("fill", row => radiusValue(row, field) < 0 ? "#c74440" : "#2774ae");
            simulation.alpha(0.1).restart();
        };

        const groupCenters = field => {
            const categories = [...categoryCounts(field).keys()].sort(d3.ascending);
            const columns = Math.max(1, Math.ceil(Math.sqrt(categories.length * (width() / Math.max(height(), 1)))));
            const rowsCount = Math.ceil(categories.length / columns);
            const horizontalGap = width() / (columns + 1);
            const verticalGap = height() / (rowsCount + 1);

            return new Map(categories.map((category, index) => [category, {
                x: horizontalGap * ((index % columns) + 1),
                y: verticalGap * (Math.floor(index / columns) + 1)
            }]));
        };

        const applyGrouping = field => {

            const centers = groupCenters(field);
            simulation
                .force("x", d3.forceX(row => centers.get(displayValue(row[field])).x).strength(0.22))
                .force("y", d3.forceY(row => centers.get(displayValue(row[field])).y).strength(0.22));
            simulation.alpha(1).restart();
        };

        variableSelect.on("change", event => applyGrouping(event.target.value));
        radiusSelect.on("change", event => applyRadius(event.target.value));

        const resize = () => {
            svg.attr("viewBox", `0 0 ${width()} ${height()}`);
            applyRadius(radiusSelect.property("value"));
            applyGrouping(variableSelect.property("value"));
        };

        window.addEventListener("resize", resize);
        resize();
    })
    .catch(error => console.error("Não foi possível carregar os dados:", error));