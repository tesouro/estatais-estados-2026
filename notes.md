## 2.

O gráfico de barras não pode começar com display: none, senão não dá para calcular as dimensões do elemento svg!

## 1.

Para futura referência quando os <path>s parecem ficar gigantesco:

That exact size is a strong clue: 5026.55 ≈ 2π × 800, your projection’s scale. D3 is likely interpreting each polygon as the complement of the state—effectively drawing the world—because the rings’ winding direction doesn’t match what D3 expects.

D3 expects exterior rings clockwise and holes counterclockwise. If the source GeoJSON follows the RFC 7946 convention (the reverse), reverse each ring before passing it to D3:


If the source already uses D3’s winding convention, reversing rings would cause the same problem in reverse. You can confirm the diagnosis first with d3.geoArea(feature): a Brazilian state should have a small area in steradians; a value greater than 2 * Math.PI indicates D3 is interpreting the polygon as its complement.

```js
// ...existing code...

function reversePolygonRings(geometry) {
    if (geometry.type === "Polygon") {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map(ring => [...ring].reverse())
        };
    }

    if (geometry.type === "MultiPolygon") {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map(polygon =>
                polygon.map(ring => [...ring].reverse())
            )
        };
    }

    return geometry;
}

fetch("dados.json").then(response => response.json()).then(data => {
    const geojson = {
        type: "FeatureCollection",
        features: data.mapa.map(({ geometry, ...properties }) => ({
            type: "Feature",
            geometry: reversePolygonRings(geometry),
            properties
        }))
    };

    mapa = new Map(".mapa", geojson);
});

// ...existing code...
```

Na verdade não precisa disso tudo. Mais uma solução desnecessariamente complexa fornecida por um LLM. Descobri por tentativa e erro que é o mapshaper que inverte os rings. Lá no dado original, no R, acrescentei um simples `sf::st_reverse()` depois da operação do mapshaper (`ms_simplify()`) e pronto. E era por isso que o fitSize não funcionava também!