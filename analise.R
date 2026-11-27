library(tidyverse)
library(readxl)
library(sf)
library(geobr)
library(rmapshaper)
library(geojsonsf)

raw_data_pre <- readxl::read_excel("quadro_estatais_2026.xlsx", sheet = "Dados 2025") 

raw_data_pre2 <- raw_data_pre %>% filter(!is.na(UF)) %>%
  distinct()

duplicados_nomes <- raw_data_pre2 %>% count(Estatal) %>% filter(n > 1) %>% pull(Estatal)

registros_duplicados <- raw_data_pre2 %>% filter(Estatal %in% duplicados_nomes)

# quantidades por uf, setor e dep -----------------------------------------

ranking_uf <- raw_data %>%
  count(UF) %>%
  arrange(desc(n)) %>%
  rename(n_uf = n)

ranking_setores <- raw_data %>%
  count(Setor) %>%
  arrange(desc(n)) %>%
  rename(n_setor = n)

data_com_posicoes_dep <- raw_data %>%
  left_join(ranking_uf) %>%
  left_join(ranking_setores) %>%
  arrange(desc(n_uf), Dependência) %>%
  group_by(UF) %>%
  mutate(pos_uf_dep = row_number()) %>%
  ungroup() %>%
  arrange(desc(n_setor), Dependência) %>%
  group_by(Setor) %>%
  mutate(pos_setor_dep = row_number())

ggplot(data_com_posicoes) + geom_rect(aes(y = UF, x = pos_uf_dep, fill = Dependência), width = 0.8, height = 0.8)
ggplot(data_com_posicoes) + geom_rect(aes(y = Setor, x = pos_setor_dep, fill = Dependência), width = 0.8, height = 0.8)



# quantidades por uf, setor e pgto Plr ------------------------------------

data_com_posicoes_plr <- raw_data %>%
  left_join(ranking_uf) %>%
  left_join(ranking_setores) %>%
  rename(PLR = `Foi Distribuído PLR ou RVA no exercício`) %>%
  arrange(desc(n_uf), PLR) %>%
  group_by(UF) %>%
  mutate(pos_uf_plr = row_number()) %>%
  ungroup() %>%
  arrange(desc(n_setor), PLR) %>%
  group_by(Setor) %>%
  mutate(pos_setor_plr = row_number())

ggplot(data_com_posicoes_plr) + geom_rect(aes(y = UF, x = pos_uf_plr, fill = PLR), width = 0.8, height = 0.8)
ggplot(data_com_posicoes_plr) + geom_rect(aes(y = Setor, x = pos_setor_plr, fill = PLR), width = 0.8, height = 0.8)



# quantidades com posicoes, plr e dep -------------------------------------

data_com_posicoes_plr_sintese <- data_com_posicoes_plr %>%
  ungroup() %>%
  select(Estatal, pos_uf_plr, pos_setor_plr)

data_com_posicoes <- data_com_posicoes_dep %>%
  left_join(data_com_posicoes_plr_sintese)

data_com_posicoes %>% count(Estatal) %>% filter(n > 1)


# mapa --------------------------------------------------------------------

mapa_ufs <- geobr::read_state(year = 2025)

mapa_ufs_simp <- rmapshaper::ms_simplify(mapa_ufs) %>% # O MAPSHAPER inverte a orientação dos rings!!! Aí o D3 vai desenhar o polígono corretamente, mas a dimensão calculada pelo browser vai ser a do mundo inteiro.
  sf::st_reverse()
  
ggplot() +
  #geom_sf(data = mapa_ufs, color = "red", fill = "transparent") +
  geom_sf(data = mapa_ufs_simp, color = "blue", fill = "transparent")

mapa_ufs_simp_digitos <- mapa_ufs_simp %>%
  geojsonsf::sf_geojson(digits = 6) %>%
  geojsonsf::geojson_sf()


# qdes-empresas-lucro-prejuizo --------------------------------------------

dados_lucro_preju <- raw_data %>%
  mutate(
    lucro_preju = ifelse(`Lucro / Prejuízo Líquido do Exercício` > 0, "lucro", "prejuízo")
    ) %>%
  count(
    UF,Setor, Dependência, lucro_preju
  )

dados_lucro_preju_total_UF <- dados_lucro_preju %>%
  count(UF, Dependência, lucro_preju) %>%
  mutate(Setor = "Todos")

dados_lucro_preju_total_Setor <- dados_lucro_preju %>%
  count(Setor, Dependência, lucro_preju) %>%
  mutate(UF = "Todas")

dados_lucro_preju_total <- dados_lucro_preju %>%
  count(Dependência, lucro_preju) %>%
  mutate(
    UF = "Todas",
    Setor = "Todos"
  )

lucro_preju <- bind_rows(
  dados_lucro_preju,
  dados_lucro_preju_total_UF,
  dados_lucro_preju_total_Setor,
  dados_lucro_preju_total
) %>%
  pivot_wider(names_from = `Dependência`, values_from = n, values_fill = 0) %>%
  mutate(TOTAL = DEPENDENTE + `NÃO DEPENDENTE`) %>%
  pivot_longer(cols = c("DEPENDENTE", "NÃO DEPENDENTE", "TOTAL"), names_to = "Dependencia") %>%
  pivot_wider(names_from = lucro_preju, values_from = value, values_fill = 0) %>%
  mutate(
    lucro_pct = lucro / (lucro + prejuízo),
    preju_pct = prejuízo / (lucro + prejuízo),
    lucro_h0 = 0,
    preju_h0 = lucro_pct
  ) %>%
  rename(
    lucro_qde = lucro,
    preju_qde = prejuízo
  ) %>%
  pivot_longer(cols = c(lucro_qde, lucro_h0, lucro_pct, preju_qde, preju_h0, preju_pct), 
               names_to = c("tipo", ".value"),
               names_sep = "_"
               )



# coroplético -------------------------------------------------------------

choropleth_summaries <- raw_data %>%
  mutate(
    across(
      c(
        `Receita Líquida Operacional`,
        `Despesa com Pessoal, incluindo temporários e terceirizados (por competência)`,
        `Despesa Total (por competência)`,
        `Lucro / Prejuízo Líquido do Exercício`,
        `Patrimônio Líquido`
        ),
      ~ as.numeric(str_replace(.x, ",", "."))
    )
  ) %>%
  group_by(UF) %>%
  summarize(
    qde = n(),
    receita = sum(`Receita Líquida Operacional`),
    desp_pessoal = sum(`Despesa com Pessoal, incluindo temporários e terceirizados (por competência)`) / sum(`Despesa Total (por competência)`),
    lucro_prejuizo = sum(`Lucro / Prejuízo Líquido do Exercício`),
    pl = sum(`Patrimônio Líquido`)
    
  )

ggplot(choropleth_summaries, aes(qde)) + geom_histogram(bins = 4)
ggplot(choropleth_summaries, aes(receita)) + geom_histogram(bins = 5)
ggplot(choropleth_summaries, aes(desp_pessoal)) + geom_histogram(bins = 5)
ggplot(choropleth_summaries, aes(lucro_prejuizo)) + geom_histogram(bins = 4)
ggplot(choropleth_summaries, aes(pl)) + geom_histogram(bins = 5)

ggplot(choropleth_summaries, aes(x = reorder(UF, qde), y = qde)) + geom_col()
ggplot(choropleth_summaries, aes(x = reorder(UF, receita), y = receita)) + geom_col()
ggplot(choropleth_summaries, aes(x = reorder(UF, desp_pessoal), y = desp_pessoal)) + geom_col()
ggplot(choropleth_summaries, aes(x = reorder(UF, lucro_prejuizo), y = lucro_prejuizo)) + geom_col()
ggplot(choropleth_summaries, aes(x = reorder(UF, pl), y = pl)) + geom_col()


# lucro prejuizo por setor ------------------------------------------------

lucro_preju_setor <- raw_data_pre2 %>%
  group_by(Setor) %>%
  summarize(lucro_preju = sum(
    as.numeric(
      str_replace(`Lucro / Prejuízo Líquido do Exercício`, ",", ".")),
    na.rm = T)
  ) %>%
  arrange(desc(lucro_preju))

ggplot(lucro_preju_setor) + geom_col(aes(y = reorder(Setor, lucro_preju), x = lucro_preju, fill = lucro_preju > 0))  


# waterfall - resultado ---------------------------------------------------

dados_waterfall <- raw_data_pre2 %>%
  select(
    dep = Dependência,
    dividendos = `Dividendos e Juros sobre Capital Próprio pagos ao Tesouro Estadual / Municipal (pago)`,
    subvencao = `Subvenções - Exercício`,
    reforco = `Reforço de Capital - Exercício`,
  ) %>%
  mutate(
    across(
      dividendos:reforco,
      ~ as.numeric(str_replace(.x, ",", "."))
    )
  ) %>%
  group_by(dep) %>%
  summarize(
    across(
      dividendos:reforco,
      ~ sum(.x)
    )
  ) %>%
  ungroup() %>%
  mutate(resultado = dividendos - subvencao - reforco)
  
  

# output ------------------------------------------------------------------

output <- list(
  mapa = mapa_ufs_simp_digitos,
  dados = data_com_posicoes,
  categorias = list(
    setor = ranking_setores,
    uf = ranking_uf
  ),
  lucro_preju = lucro_preju,
  coropletico = choropleth_summaries,
  lucro_preju_setor = lucro_preju_setor,
  resultado = dados_waterfall
)

jsonlite::write_json(output, "dados.json")


contagem <- data_com_posicoes %>%
  count(UF, Setor)

ggplot(contagem) + geom_raster(aes(x = UF, y = Setor, fill = n)) + 
  geom_text(aes(x = UF, y = Setor, label = n), color = "gray") +
  colorspace::scale_fill_continuous_sequential(palette = "BurgYl") +
  theme_bw()

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
