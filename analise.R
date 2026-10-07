library(tidyverse)
library(readxl)
library(sf)
library(geobr)
library(rmapshaper)
library(geojsonsf)

raw_data <- readxl::read_excel("quadro_estatais_2026.xlsx", sheet = "Dados 2025")

mapa_ufs <- geobr::read_state(year = 2025)

mapa_ufs_simp <- rmapshaper::ms_simplify(mapa_ufs) %>% # O MAPSHAPER inverte a orientação dos rings!!! Aí o D3 vai desenhar o polígono corretamente, mas a dimensão calculada pelo browser vai ser a do mundo inteiro.
  sf::st_reverse()
  
ggplot() +
  #geom_sf(data = mapa_ufs, color = "red", fill = "transparent") +
  geom_sf(data = mapa_ufs_simp, color = "blue", fill = "transparent")

mapa_ufs_simp_digitos <- mapa_ufs_simp %>%
  geojsonsf::sf_geojson(digits = 6) %>%
  geojsonsf::geojson_sf()

output <- list(
  mapa = mapa_ufs_simp_digitos,
  dados = raw_data
)

jsonlite::write_json(output, "dados.json")


# jsonlite::write_json(raw_data, "data.json")
# 
# glimpse(raw_data)
# 
# total_empresas <- nrow(raw_data)
# 
# lado <- ceiling(sqrt(total_empresas))
# 
# prep_count_var_listada <- raw_data %>%
#   group_by(`Listada em Bolsa`) %>%
#   mutate(n = row_number()) %>%
#   ungroup() %>%
#   mutate(
#     x = 1 + ((n-1) %% lado),
#     y = 1 + (n %/% lado),
#     y = y + ifelse(`Listada em Bolsa` == "NÃO", 0, lado + 5)
#   )
# 
# ggplot(prep_count_var_listada) + geom_raster(aes(x = x, y = y))
# 
# ggplot(raw_data) + 
#   geom_bar(aes(x = `Listada em Bolsa`))
