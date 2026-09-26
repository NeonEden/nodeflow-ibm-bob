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
        };
    }

    // ── 2. Estabilidad: si el parcial cambió respecto del anterior, todavía se está transcribiendo.
    //       Sólo aplicable cuando no es final (end_of_turn cierra el turno aunque el texto cambiara
    //       en el último instante).
    if !e.es_final {
        if let Some(ant) = e.anterior {
            let ant_norm = normalizar(ant.trim());
            if ant_norm != texto_norm {
                return Decision {
                    clase: ClaseParcial::Nada,
                    motivo: "descartado: parcial inestable (cambió respecto del anterior)".into(),
                    titulo: None,
                    texto: texto_limpio,
                };
            }
        }

        // Aunque el texto no cambió, si llegó hace muy poco todavía puede seguir creciendo.
        if let Some(ms) = e.ms_desde_cambio {
            if ms < 250 {
                return Decision {
                    clase: ClaseParcial::Nada,
                    motivo: format!(
                        "descartado: parcial estable pero reciente ({ms} ms < 250 ms)"
                    ),
                    titulo: None,
                    texto: texto_limpio,
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
            motivo: format!(
                "descartado: menos de 3 palabras ({n_palabras})"
            ),
            titulo: None,
            texto: texto_limpio,
        };
    }

    // ── 4. Semilla: parcial estable con ≥ 3 palabras, o turno cerrado con ≥ 3 palabras.
    Decision {
        clase: ClaseParcial::Semilla,
        motivo: if e.es_final {
            format!("turno cerrado con {n_palabras} palabras")
        } else {
            format!("parcial estable con {n_palabras} palabras")
        },
        titulo: None,
        texto: texto_limpio,
    }
}

// ── Tests unitarios ──────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn ent<'a>(texto: &'a str, anterior: Option<&'a str>, ms: Option<u64>, final_: bool) -> Entrada<'a> {
        Entrada { texto, anterior, ms_desde_cambio: ms, es_final: final_ }
    }

    // Fila de la tabla: parcial inestable → Nada
    #[test]
    fn inestable_es_nada() {
        let e = ent("quiero un nodo de código", Some("quiero un nodo"), None, false);
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
        let e = ent("nodo de código para parsear JSON", Some("nodo de código para parsear JSON"), Some(400), false);
        assert_ne!(clasificar(&e).clase, ClaseParcial::Correccion);
        // Estable y ≥ 3 palabras → Semilla
        assert_eq!(clasificar(&e).clase, ClaseParcial::Semilla);
    }

    // Reciente (ms < 250) → Nada aunque sea estable
    #[test]
    fn reciente_es_nada() {
        let e = ent("quiero tres nodos aquí", Some("quiero tres nodos aquí"), Some(120), false);
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
        let e = ent("  Quiero un nodo  ", Some("  Quiero un nodo  "), Some(300), false);
        let d = clasificar(&e);
        assert_eq!(d.texto, "Quiero un nodo");
    }

    // Acentos en marcador no rompen la detección
    #[test]
    fn acentos_en_marcador() {
        let e = ent("Olvidate de eso y empecemos de nuevo", None, None, false);
        assert_eq!(clasificar(&e).clase, ClaseParcial::Correccion);
    }
}
