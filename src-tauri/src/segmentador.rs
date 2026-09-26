/// Segmentador del parcial del turno de voz (Fase C, lienzo en vivo).
///
/// Clasifica el texto que emite el STT *mientras* el usuario habla para decidir si ya vale la pena
/// dibujar un nodo borrador, si el usuario está corrigiendo lo que dijo, o si el parcial es todavía
/// demasiado inestable / corto para hacer algo con él.
///
/// **Reglas deterministas, sin modelo** (ADR 0005): el dibujo del lienzo no puede depender de que
/// un LLM conteste. Si hay duda, la respuesta es `Nada` — lo que no se dibuja no molesta; lo que se
/// dibuja de más sí.
///
/// La función `clasificar` es pura (sin estado global, sin I/O), para poder testarla con `cargo test`.

/// Clase de un parcial del turno de voz.
#[derive(Debug, PartialEq, Eq)]
pub enum ClaseParcial {
    /// El parcial no cumple las condiciones mínimas para dibujar nada.
    Nada,
    /// El parcial es estable y tiene contenido suficiente: vale la pena dibujarlo como borrador.
    Semilla,
    /// El usuario está corrigiendo lo que acaba de decir (marcador inequívoco en los primeros ~5 tokens).
    Correccion,
}

/// Entrada para el clasificador: describe el estado actual del turno.
pub struct Entrada<'a> {
    /// Parcial actual (el transcript crece dentro del turno).
    pub texto: &'a str,
    /// Parcial previo del **mismo** turno; `None` si es el primero.
    pub anterior: Option<&'a str>,
    /// Milisegundos desde el último cambio del parcial. Si es chico (< ~250 ms), todavía está
    /// escribiéndose y se trata como inestable.
    pub ms_desde_cambio: Option<u64>,
    /// `true` cuando `end_of_turn` llegó: el turno ya cerró.
    pub es_final: bool,
}

/// Decisión del clasificador.
pub struct Decision {
    /// Clase asignada al parcial.
    pub clase: ClaseParcial,
    /// Razón legible de la decisión (se audita y va al log; incluye «descartado» si es `Nada`).
    pub motivo: String,
    /// Título corto sugerido para el borrador. `None` = que lo construya el cliente con su propia
    /// lógica (p. ej. `draftVoz.tituloDelBorrador`).
    pub titulo: Option<String>,
    /// Texto limpio que se dibuja (sólo se recortan espacios; nunca se modifica el contenido).
    pub texto: String,
    /// Temas extraídos cuando la clase es `Semilla`. Cada tema tiene título y texto.
    pub temas: Option<Vec<Temas>>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct Temas {
    pub titulo: String,
    pub texto: String,
}

// ── Marcadores de corrección ─────────────────────────────────────────────────────────────────────
//
// «no» suelto **no** cuenta: «nodo», «norte», «no sé» empiezan igual. Sólo los marcadores
// inequívocos y sólo en los primeros ~5 tokens (un «no» en el medio de una frase es contenido).
// La lista es igual a la del cliente (`draftVoz.ts`) para que los dos niveles sean consistentes;
// la versión del backend añade la lógica de estabilidad y confianza que el cliente no tiene.
const MARCADORES_CORRECCION: &[&str] = &[
    "no,",
    "mejor dicho",
    "en realidad",
    "olvidate",
    "quise decir",
    "corrijo",
    "esperá,",
    "espera,",
];

// ── Marcadores de tema (corte de cadena) ────────────────────────────────────────────────────────
// Se usan para dividir el turno en unidades temáticas según el contrato. La comparación es por palabra
// completa y no distingue mayúsculas (`(?i)`); los acentos se cubren listando las dos grafías (el
// reconocimiento puede devolver «además» o «ademas»).
// Conectores que marcan un tema nuevo. Van las dos grafías (con y sin tilde) porque el
// reconocimiento puede devolver cualquiera de las dos y el match es por palabra completa.
const MARCADORES_TEMA: &[&str] = &[
    "otra cosa",
    "y también",
    "y tambien",
    "además",
    "ademas",
    "por otro lado",
    "ahora",
    "después",
    "despues",
    "paso dos",
    "segundo",
    "tercero",
];

// Parámetros de la regla de partición.
const PALABRAS_TITULO: usize = 7; // mismo valor que `draftVoz.tituloDelBorrador`
const MIN_UNIDAD_PALABRAS: usize = 3;
const MAX_TEMAS: usize = 4;

// ── Normalización ────────────────────────────────────────────────────────────────────────────────
//
// Se usan sólo para detectar marcadores y comparar estabilidad; el `texto` de salida se conserva
// tal como llegó (sólo se recortan los espacios de los bordes).

/// Minúsculas sin acentos (solo las vocales españolas más comunes). Suficiente para comparar
/// marcadores y detectar estabilidad; no pretende ser un normalizador completo.
fn normalizar(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .map(|c| match c {
            'á' => 'a',
            'é' => 'e',
            'í' => 'i',
            'ó' => 'o',
            'ú' | 'ü' => 'u',
            'à' | 'â' => 'a',
            'è' | 'ê' => 'e',
            'î' => 'i',
            'ô' => 'o',
            'û' => 'u',
            other => other,
        })
        .collect()
}

use regex::RegexBuilder;
fn titulo_del_borrador(texto: &str) -> String {
    let palabras: Vec<&str> = texto.split_whitespace().take(PALABRAS_TITULO).collect();
    if palabras.is_empty() {
        return String::new();
    }
    let mut t = palabras.join(" ");
    // Trim punctuation from ends
    t = t
        .trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace())
        .to_string();
    t
}

// Partition the turn into thematic units based on markers.
fn particionar_temas(texto: &str) -> Vec<Temas> {
    // Regex with case‑insensitive word boundaries for all markers.
    let pattern = MARCADORES_TEMA.join("|");
    let re = regex::RegexBuilder::new(&format!(r"(?i)\b({})\b", pattern))
        .build()
        .unwrap();
    // Split, discarding the markers.
    let raw: Vec<String> = re
        .split(texto)
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    let mut unidades: Vec<String> = Vec::new();
    for u in raw {
        // Ensure minimum unit size.
        let word_cnt = u.split_whitespace().count();
        if word_cnt < MIN_UNIDAD_PALABRAS && !unidades.is_empty() {
            let last = unidades.pop().unwrap();
            let combined = format!("{} {}", last, u);
            unidades.push(combined);
        } else {
            unidades.push(u);
        }
    }
    // Techo de temas: lo que sobra se junta en el ÚLTIMO tema, sin perder texto.
    //
    // La primera versión usaba `unidades.drain(MAX_TEMAS - 1..)` y después escribía en
    // `unidades[MAX_TEMAS - 1]`: el drain ya había vaciado esa posición y con cinco temas el índice
    // quedaba fuera de rango (pánico). Lo cazó el test `techo_de_cuatro_temas`.
    if unidades.len() > MAX_TEMAS {
        let resto = unidades.split_off(MAX_TEMAS - 1);
        unidades.push(resto.join(" "));
    }
    // Build Temas structs.
    unidades
        .into_iter()
        .map(|u| Temas {
            titulo: titulo_del_borrador(&u),
            texto: u,
        })
        .collect()
}

/// Parte el texto en tokens (por espacios) y devuelve el primer `n`.
fn primeros_tokens(texto: &str, n: usize) -> Vec<String> {
    texto
        .split_whitespace()
        .take(n)
        .map(|t| t.to_lowercase())
        .collect()
}

/// ¿El arranque del turno contiene algún marcador de corrección inequívoco?
/// Se mira sólo en los primeros 5 tokens normalizados para no confundir un «no» interno con un
/// arrepentimiento.
fn es_correccion(texto_norm: &str) -> bool {
    // Tomar los primeros ~5 tokens y unirlos en una cadena de comparación.
    let arranque: String = primeros_tokens(texto_norm, 5).join(" ");
    MARCADORES_CORRECCION
        .iter()
        .any(|m| arranque.contains(&normalizar(m)))
}

/// Cuenta las palabras del texto (split por espacios).
fn num_palabras(texto: &str) -> usize {
    texto.split_whitespace().count()
}

// ── Clasificador central ─────────────────────────────────────────────────────────────────────────

/// Clasifica el parcial del turno según las reglas deterministas de la Fase C.
///
/// | Señal | Decisión |
/// |---|---|
/// | Parcial inestable (cambió respecto de `anterior`) y no es final | `Nada` |
/// | ms_desde_cambio < 250 y no es final | `Nada` (todavía escribiéndose) |
/// | Menos de 3 palabras y no es final | `Nada` |
/// | Corrección explícita en los primeros 5 tokens | `Correccion` |
/// | `es_final: true`, o parcial estable con ≥ 3 palabras | `Semilla` |
/// | Cualquier duda | `Nada` |
pub fn clasificar(e: &Entrada) -> Decision {
    let texto_limpio = e.texto.trim().to_string();
    let texto_norm = normalizar(&texto_limpio);

    // ── 1. Corrección explícita (tiene prioridad: si el usuario se arrepiente no dibujamos nada
    //       nuevo, independientemente de si el parcial es largo o estable).
    if es_correccion(&texto_norm) {
        return Decision {
            clase: ClaseParcial::Correccion,
            motivo: "marcador de corrección en los primeros 5 tokens".into(),
            titulo: None,
            texto: texto_limpio,
            temas: None,
        };
    }

    // ── 2. Estabilidad. El criterio es el TIEMPO, no la diferencia con el parcial anterior.
    //
    // Medido el 26/09/2026, con la primera versión de esta regla: los parciales de
    // Universal-Streaming crecen palabra por palabra («quiero» → «quiero un» → «quiero un nodo»),
    // así que comparar contra el parcial anterior marcaba «inestable» en CADA tick y el fantasma no
    // se dibujaba nunca mientras alguien habla — justo lo contrario de la Fase C (el lienzo tiene que
    // dibujarse mientras se habla, no al terminar la frase). El tiempo es el dato correcto: si el
    // parcial no cambió en ~250 ms, la persona hizo una pausa y lo que dijo ya es una idea.
    //
    // Sin `ms_desde_cambio` (el cliente no lo manda) se cae al criterio conservador: un parcial
    // distinto del anterior, sin dato de tiempo, está en movimiento.
    if !e.es_final {
        if let Some(ms) = e.ms_desde_cambio {
            if ms < 250 {
                return Decision {
                    clase: ClaseParcial::Nada,
                    motivo: format!("descartado: el parcial cambió hace {ms} ms (< 250 ms)"),
                    titulo: None,
                    texto: texto_limpio,
                    temas: None,
                };
            }
        } else if let Some(ant) = e.anterior {
            if normalizar(ant.trim()) != texto_norm {
                return Decision {
                    clase: ClaseParcial::Nada,
                    motivo: "descartado: parcial en movimiento y sin dato de tiempo".into(),
                    titulo: None,
                    texto: texto_limpio,
                    temas: None,
                };
            }
        }
    }

    // ── 3. Longitud mínima: menos de 3 palabras no es una idea, es el arranque de una palabra.
    //       Aplicamos esto también a los finales: un end_of_turn con 2 palabras no dibuja.
    let n_palabras = num_palabras(&texto_limpio);
    if n_palabras < 3 {
        return Decision {
            clase: ClaseParcial::Nada,
            motivo: format!("descartado: menos de 3 palabras ({n_palabras})"),
            titulo: None,
            texto: texto_limpio,
            temas: None,
        };
    }

    // ── 4. Semilla: parcial estable con ≥ 3 palabras, o turno cerrado con ≥ 3 palabras.
    // Generamos la lista de temas según los marcadores de tema del contrato.
    //
    // El cierre del turno TAMBIÉN se parte en temas, y es el caso que más importa: medido en la prueba
    // real del 26/09, los nodos gigantes salieron justo de los cierres («turno cerrado con 66
    // palabras» → un nodo con todo el dictado). Dejar el cierre en un solo tema era exactamente el
    // síntoma que este pedido viene a arreglar.
    let temas_lista = particionar_temas(&texto_limpio);
    Decision {
        clase: ClaseParcial::Semilla,
        motivo: if e.es_final {
            format!(
                "turno cerrado con {n_palabras} palabras, {} tema(s)",
                temas_lista.len()
            )
        } else {
            format!("parcial estable con {n_palabras} palabras")
        },
        // Compatibilidad con el cliente de hoy (dibuja un solo fantasma): el título y el texto son los
        // del PRIMER tema, no los del turno completo. El cliente del pedido 05 usa `temas` y dibuja la
        // cadena entera.
        titulo: temas_lista.first().map(|t| t.titulo.clone()),
        texto: temas_lista
            .first()
            .map(|t| t.texto.clone())
            .unwrap_or(texto_limpio),
        temas: Some(temas_lista),
    }
}

// ── Tests unitarios ──────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn ent<'a>(
        texto: &'a str,
        anterior: Option<&'a str>,
        ms: Option<u64>,
        final_: bool,
    ) -> Entrada<'a> {
        Entrada {
            texto,
            anterior,
            ms_desde_cambio: ms,
            es_final: final_,
        }
    }

    // Fila de la tabla: parcial inestable → Nada
    #[test]
    fn inestable_es_nada() {
        let e = ent(
            "quiero un nodo de código",
            Some("quiero un nodo"),
            None,
            false,
        );
        assert_eq!(clasificar(&e).clase, ClaseParcial::Nada);
    }

    // Fila de la tabla: menos de 3 palabras y no es final → Nada
    #[test]
    fn pocas_palabras_es_nada() {
        let e = ent("hola mundo", None, Some(500), false);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Nada);
    }

    // Fila de la tabla: final con 2 palabras → Nada (no alcanza para semilla)
    #[test]
    fn final_con_dos_palabras_es_nada() {
        let e = ent("hola mundo", None, None, true);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Nada);
    }

    // Fila de la tabla: final con 3+ palabras → Semilla
    #[test]
    fn final_con_tres_palabras_es_semilla() {
        let e = ent("quiero un nodo", None, None, true);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Semilla);
    }

    // Fila de la tabla: parcial estable con ≥ 3 palabras → Semilla
    #[test]
    fn estable_tres_palabras_es_semilla() {
        let e = ent("quiero un nodo", Some("quiero un nodo"), Some(300), false);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Semilla);
    }

    // Fila de la tabla: corrección explícita → Correccion
    #[test]
    fn marcador_no_coma_es_correccion() {
        let e = ent("no, mejor de código", None, None, false);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Correccion);
    }

    #[test]
    fn marcador_mejor_dicho_es_correccion() {
        let e = ent("mejor dicho quiero un grafo", None, None, false);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Correccion);
    }

    #[test]
    fn marcador_en_realidad_es_correccion() {
        let e = ent("en realidad necesito tres nodos", None, None, false);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Correccion);
    }

    // «no sé» no es corrección (el «no» está solo, sin coma)
    #[test]
    fn no_se_no_es_correccion() {
        let e = ent("no sé qué hacer con esto", None, Some(300), false);
        assert_ne!(clasificar(&e).clase, ClaseParcial::Correccion);
    }

    // «nodo de código» no es corrección
    #[test]
    fn nodo_de_codigo_no_es_correccion() {
        let e = ent(
            "nodo de código para parsear JSON",
            Some("nodo de código para parsear JSON"),
            Some(400),
            false,
        );
        assert_ne!(clasificar(&e).clase, ClaseParcial::Correccion);
        // Estable y ≥ 3 palabras → Semilla
        assert_eq!(clasificar(&e).clase, ClaseParcial::Semilla);
    }

    // Reciente (ms < 250) → Nada aunque sea estable
    #[test]
    fn reciente_es_nada() {
        let e = ent(
            "quiero tres nodos aquí",
            Some("quiero tres nodos aquí"),
            Some(120),
            false,
        );
        assert_eq!(clasificar(&e).clase, ClaseParcial::Nada);
    }

    // El motivo de Nada contiene la palabra «descartado» para poder contarlo en el log
    #[test]
    fn motivo_nada_contiene_descartado() {
        let e = ent("dos palabras", None, Some(300), false);
        let d = clasificar(&e);
        assert!(d.motivo.contains("descartado"), "motivo: {}", d.motivo);
    }

    // El texto de salida se conserva (sólo se recortan espacios de los bordes)
    #[test]
    fn texto_conservado() {
        let e = ent(
            "  Quiero un nodo  ",
            Some("  Quiero un nodo  "),
            Some(300),
            false,
        );
        let d = clasificar(&e);
        assert_eq!(d.texto, "Quiero un nodo");
    }

    // Acentos en marcador no rompen la detección
    #[test]
    fn acentos_en_marcador() {
        let e = ent("Olvidate de eso y empecemos de nuevo", None, None, false);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Correccion);
    }

    // ── Estabilidad por TIEMPO (corrección del 26/09/2026) ───────────────────────────────────────
    //
    // Estos dos tests existen porque la primera versión de la regla comparaba el parcial contra el
    // anterior y descartaba todo lo que hubiera cambiado. Con parciales que crecen palabra por palabra
    // («quiero» → «quiero un» → «quiero un nodo») eso significa descartar SIEMPRE mientras se habla:
    // el fantasma sólo aparecía al cerrar el turno, que es exactamente lo que la Fase C viene a evitar.

    #[test]
    fn parcial_que_crecio_pero_esta_quieto_es_semilla() {
        // Cambió respecto del anterior, pero hace 400 ms que no cambia: la persona hizo una pausa.
        let e = ent("quiero un nodo", Some("quiero un"), Some(400), false);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Semilla);
    }

    #[test]
    fn parcial_en_movimiento_reciente_es_nada() {
        // Cambió hace 80 ms: todavía se está transcribiendo. El fantasma no dibuja ruido.
        let e = ent("quiero un nodo", Some("quiero un"), Some(80), false);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Nada);
    }

    #[test]
    fn sin_dato_de_tiempo_el_criterio_es_conservador() {
        // Sin `ms_desde_cambio` no hay forma de saber si está quieto: distinto del anterior = en
        // movimiento, y el fantasma espera.
        let e = ent("quiero un nodo", Some("quiero un"), None, false);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Nada);
    }

    // ── Partición en temas (pedido 04) ───────────────────────────────────────────────────────────
    // El turno se parte en unidades para que el lienzo dibuje una cadena de nodos por tema, en vez de
    // un nodo con todo el dictado (medido 26/09: «turno cerrado con 66 palabras» → un solo nodo).

    #[test]
    fn marcador_explicito_parte_en_dos_temas() {
        let e = ent(
            "quiero un nodo de audio, otra cosa quiero un nodo de video",
            None,
            Some(400),
            false,
        );
        let d = clasificar(&e);
        assert_eq!(d.clase, ClaseParcial::Semilla);
        let t = d.temas.expect("una semilla tiene que traer temas");
        assert_eq!(t.len(), 2, "primer tema: {}", t[0].texto);
        assert!(t[0].texto.contains("audio"), "t[0] = {}", t[0].texto);
        assert!(t[1].texto.contains("video"), "t[1] = {}", t[1].texto);
    }

    #[test]
    fn sin_marcadores_es_un_solo_tema() {
        let e = ent(
            "quiero un nodo de codigo que se conecte al sintetizador",
            None,
            Some(400),
            false,
        );
        let t = clasificar(&e).temas.expect("temas");
        assert_eq!(t.len(), 1, "sin separadores no se inventan temas");
    }

    #[test]
    fn unidad_corta_se_pega_a_la_anterior() {
        // «ahora» deja una cola de una sola palabra: se pega, no queda como tema propio ni se descarta.
        let e = ent(
            "quiero un nodo de audio ahora listo",
            None,
            Some(400),
            false,
        );
        let t = clasificar(&e).temas.expect("temas");
        assert_eq!(t.len(), 1, "la cola corta se pega: {}", t[0].texto);
    }

    #[test]
    fn techo_de_cuatro_temas() {
        // Cinco marcadores: el techo manda y lo que sobra se junta en el cuarto.
        let e = ent(
            "uno dos tres otra cosa cuatro cinco seis otra cosa siete ocho nueve otra cosa diez once \
             doce otra cosa trece catorce quince",
            None,
            Some(400),
            false,
        );
        let t = clasificar(&e).temas.expect("temas");
        assert_eq!(
            t.len(),
            4,
            "el techo es 4; el ultimo tema se lleva lo que sobra"
        );
    }

    #[test]
    fn nada_y_correccion_no_traen_temas() {
        let nada = clasificar(&ent("dos palabras", None, Some(400), false));
        assert_eq!(nada.clase, ClaseParcial::Nada);
        assert!(
            nada.temas.is_none(),
            "una decision descartada no lleva temas"
        );

        let correccion = clasificar(&ent(
            "en realidad quiero tres nodos",
            None,
            Some(400),
            false,
        ));
        assert_eq!(correccion.clase, ClaseParcial::Correccion);
        assert!(correccion.temas.is_none(), "una correccion no lleva temas");
    }

    #[test]
    fn marcadores_con_mayusculas_partes_igual() {
        let e = ent(
            "Quiero un nodo de audio ADEMAS quiero un nodo de video",
            None,
            Some(400),
            false,
        );
        let t = clasificar(&e).temas.expect("temas");
        assert_eq!(
            t.len(),
            2,
            "el marcador en mayusculas tambien corta: {}",
            t[0].texto
        );
    }

    #[test]
    fn el_cierre_del_turno_tambien_parte_en_temas() {
        // ANCLA (26/09/2026): la primera versión dejaba el cierre del turno en UN solo tema «para no
        // romper al cliente», y los nodos gigantes de la prueba real salieron justo de los cierres
        // («turno cerrado con 66 palabras»). Si alguien vuelve a poner el cierre en un tema solo, este
        // test falla.
        let e = ent(
            "quiero un nodo de audio, otra cosa quiero un nodo de video",
            None,
            None,
            true,
        );
        let d = clasificar(&e);
        assert_eq!(d.clase, ClaseParcial::Semilla);
        let t = d.temas.expect("el cierre tambien lleva temas");
        assert_eq!(t.len(), 2, "motivo: {}", d.motivo);
    }

    #[test]
    fn el_titulo_y_el_texto_son_del_primer_tema() {
        // Compatibilidad: el cliente de hoy dibuja un solo fantasma con `titulo`/`texto`. Con la
        // partición, esos campos pasan a ser los del PRIMER tema y no los del turno entero.
        let e = ent(
            "quiero un nodo de audio, otra cosa quiero un nodo de video",
            None,
            Some(400),
            false,
        );
        let d = clasificar(&e);
        let t = d.temas.expect("temas");
        assert_eq!(d.texto, t[0].texto, "el texto es el del primer tema");
        assert_eq!(d.titulo.as_deref(), Some(t[0].titulo.as_str()));
    }
}
