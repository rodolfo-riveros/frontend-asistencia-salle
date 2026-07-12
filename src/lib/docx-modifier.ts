/**
 * Utilidad para modificar archivos DOCX desde el navegador.
 * Lee/escribe el XML interno (word/document.xml) vía PizZip.
 *
 * Esta versión modifica el DOCX buscando ETIQUETAS (labels) en el texto
 * y reemplazando el VALOR que les sigue, sin necesitar {{placeholders}}.
 */

import PizZip from "pizzip"

export class DocxModifier {
  private zip: PizZip
  private xml: string
  private readonly documento = "word/document.xml"

  constructor(input: string | ArrayBuffer | Blob) {
    // @ts-expect-error - PizZip accepts ArrayBuffer/Blob despite type def
    this.zip = new PizZip(input)
    const file = this.zip.file(this.documento)
    if (!file) throw new Error("No se encontró word/document.xml en el DOCX")
    this.xml = file.asText()
  }

  /**
   * Obtiene todos los párrafos del documento con su texto plano y posición.
   */
  obtenerParrafos(): { texto: string; xml: string; index: number }[] {
    const parrafos: { texto: string; xml: string; index: number }[] = []
    const regex = /<w:p[ >][\s\S]*?<\/w:p>/g
    let match: RegExpExecArray | null
    let idx = 0
    while ((match = regex.exec(this.xml)) !== null) {
      const texto = this._extraerTexto(match[0])
      parrafos.push({ texto, xml: match[0], index: idx })
      idx++
    }
    return parrafos
  }

  /**
   * Reemplaza el texto de UN párrafo específico en el XML.
   * Busca el bloque XML del párrafo original y lo reemplaza por uno
   * que tenga el nuevo texto dentro de sus <w:t>.
   */
  reemplazarTextoEnParrafo(xmlOriginal: string, nuevoTexto: string): boolean {
    // Buscar todos los <w:r> dentro del párrafo
    const runsRegex = /<w:r[ >][\s\S]*?<\/w:r>/g
    const runs = [...xmlOriginal.matchAll(runsRegex)]

    if (runs.length === 0) return false

    // Usar el primer run para poner el texto, limpiar los demás runs de texto
    let nuevoXml = xmlOriginal
    const primerRunXml = runs[0][0]
    const runSinTexto = primerRunXml.replace(/<w:t[^>]*>[^<]*<\/w:t>/g, "")

    // Insertar el nuevo texto en el primer run
    const runConTexto = runSinTexto.replace(
      /<\/w:r>/,
      `<w:t xml:space="preserve">${this._escaparXml(nuevoTexto)}</w:t></w:r>`
    )
    nuevoXml = nuevoXml.replace(primerRunXml, runConTexto)

    // Limpiar texto de los demás runs (eliminar sus <w:t>)
    for (let i = 1; i < runs.length; i++) {
      const r = runs[i][0]
      const rLimpio = r.replace(/<w:t[^>]*>[^<]*<\/w:t>/g, "")
      nuevoXml = nuevoXml.replace(r, rLimpio)
    }

    this.xml = this.xml.replace(xmlOriginal, nuevoXml)
    return true
  }

  /**
   * Reemplaza el texto de TODOS los párrafos que contengan el texto buscado.
   * Útil para reemplazar valores conocidos en cualquier parte del documento.
   */
  reemplazarTexto(buscar: string, nuevoTexto: string): this {
    const parrafos = this.obtenerParrafos()
    for (const p of parrafos) {
      if (p.texto.includes(buscar)) {
        this.reemplazarTextoEnParrafo(p.xml, nuevoTexto)
      }
    }
    return this
  }

  /**
   * Inteligente: busca la etiqueta (label) y reemplaza el VALOR del
   * párrafo que le sigue (el párrafo con texto después de la etiqueta).
   * Funciona para pares label→valor en párrafos consecutivos.
   */
  reemplazarCampo(etiqueta: string, nuevoValor: string): this {
    const parrafos = this.obtenerParrafos()
    for (let i = 0; i < parrafos.length; i++) {
      if (parrafos[i].texto.trim() === etiqueta.trim()) {
        // Buscar el siguiente párrafo con contenido
        for (let j = i + 1; j < parrafos.length; j++) {
          if (parrafos[j].texto.trim()) {
            this.reemplazarTextoEnParrafo(parrafos[j].xml, nuevoValor)
            break
          }
        }
      }
    }
    return this
  }

  /**
   * Reemplaza el contenido COMPLETO de la sección de actividades
   * (desde el primer N°XX hasta antes de ACTIVIDADES DE EVALUACIÓN).
   * Busca marcaInicio (ej: "N°01") y marcaFin (ej: "ACTIVIDADES DE EVALUACIÓN")
   * y reemplaza todo el XML entre ellos por versiones actualizadas.
   */
  reemplazarActividades(actividadesXml: { numero: number; inicio: string; desarrollo: string; cierre: string }[]): this {
    const parrafos = this.obtenerParrafos()

    // Encontrar el índice del primer N°01 y de ACTIVIDADES DE EVALUACIÓN
    let inicioIdx = -1
    let finIdx = -1
    for (let i = 0; i < parrafos.length; i++) {
      if (/^N°01/.test(parrafos[i].texto.trim())) inicioIdx = i
      if (parrafos[i].texto.trim() === "ACTIVIDADES DE EVALUACIÓN" && inicioIdx >= 0) {
        finIdx = i
        break
      }
    }

    if (inicioIdx < 0 || finIdx < 0) return this

    // Extraer el bloque XML desde N°01 hasta antes de ACTIVIDADES DE EVALUACIÓN
    const bloqueInicio = parrafos[inicioIdx].xml
    const bloqueFin = parrafos[finIdx].xml

    const inicioPos = this.xml.indexOf(bloqueInicio)
    const finPos = this.xml.indexOf(bloqueFin)
    if (inicioPos < 0 || finPos < 0) return this

    const bloqueActual = this.xml.slice(inicioPos, finPos)

    // Construir las nuevas actividades reemplazando N°XX, INICIO, DESARROLLO, CIERRE
    let nuevoBloque = bloqueActual

    for (const act of actividadesXml) {
      const actTag = `N°${String(act.numero).padStart(2, "0")}`

      // Reemplazar encabezado de actividad (N°XX)
      const parrafoAct = parrafos.find(p => p.texto.trim() === actTag && bloqueActual.includes(p.xml))
      if (parrafoAct) {
        const nuevoXml = parrafoAct.xml.replace(
          /<w:t[^>]*>[^<]*<\/w:t>/,
          `<w:t xml:space="preserve">${this._escaparXml(actTag)}</w:t>`
        )
        nuevoBloque = nuevoBloque.replace(parrafoAct.xml, nuevoXml)
      }

      // Buscar y reemplazar INICIO estrategia
      const pInicio = parrafos.find(p =>
        p.texto.startsWith("Estrategia:") &&
        bloqueActual.includes(p.xml) &&
        this._parrafoAnteriorTieneTexto(parrafos, p, "INICIO", bloqueActual)
      )
      if (pInicio) {
        this.reemplazarTextoEnParrafo(pInicio.xml, `Estrategia: ${act.inicio}`)
      }

      // Buscar y reemplazar DESARROLLO estrategia
      const pDesarrollo = parrafos.find(p =>
        p.texto.startsWith("Estrategia:") &&
        bloqueActual.includes(p.xml) &&
        this._parrafoAnteriorTieneTexto(parrafos, p, "DESARROLLO", bloqueActual)
      )
      if (pDesarrollo) {
        this.reemplazarTextoEnParrafo(pDesarrollo.xml, `Estrategia: ${act.desarrollo}`)
      }

      // Buscar y reemplazar CIERRE metacognición
      const pCierre = parrafos.find(p =>
        p.texto.startsWith("Metacognición:") &&
        bloqueActual.includes(p.xml)
      )
      if (pCierre) {
        this.reemplazarTextoEnParrafo(pCierre.xml, `Metacognición: ${act.cierre}`)
      }
    }

    return this
  }

  /**
   * Reemplaza la sección completa de lista de cotejo.
   * Busca "LISTA DE COTEJO" y reemplaza el título y criterios.
   */
  reemplazarListaCotejo(titulo: string, criterios: string[]): this {
    const parrafos = this.obtenerParrafos()

    // Encontrar el título de lista de cotejo
    for (let i = 0; i < parrafos.length; i++) {
      if (parrafos[i].texto.includes("LISTA DE COTEJO")) {
        this.reemplazarTextoEnParrafo(parrafos[i].xml, `LISTA DE COTEJO - ${titulo}`)
        break
      }
    }

    // Reemplazar criterios numerados (1. ... 2. ... etc)
    let criterioIdx = 0
    for (const p of parrafos) {
      if (/^\d+\.\s/.test(p.texto.trim()) && criterioIdx < criterios.length) {
        const num = criterioIdx + 1
        this.reemplazarTextoEnParrafo(p.xml, `${num}. ${criterios[criterioIdx]}`)
        criterioIdx++
      }
    }

    return this
  }

  /**
   * Reemplaza dimensiones de rúbrica.
   */
  reemplazarRubrica(dimensiones: { criterio: string; excelente: string; bueno: string; regular: string; deficiente: string }[]): this {
    const parrafos = this.obtenerParrafos()

    let dimIdx = 0
    for (let i = 0; i < parrafos.length; i++) {
      // Las dimensiones tienen el formato: "Criterio" → siguiente párrafo con Excelente/Bueno/Regular/Deficiente
      if (dimIdx < dimensiones.length) {
        const dim = dimensiones[dimIdx]
        // Buscar el nombre del criterio (primer texto después de "Criterios" header)
        // En la rúbrica, cada dimensión tiene: nombre_criterio, excelente, bueno, regular, deficiente, no_presenta
        // Estructura: P1=CriterioNombre, P2=ExcelenteTexto, P3=BuenoTexto, P4=RegularTexto, P5=DeficienteTexto
        const idxBase = i

        // El nombre del criterio está en un párrafo con texto que no es "Excelente", "Bueno", etc.
        if (
          parrafos[i].texto.trim() &&
          !["Excelente", "Bueno", "Regular", "Deficiente", "No presenta", "Criterios", "TOTAL"].includes(parrafos[i].texto.trim()) &&
          !/^\d+$/.test(parrafos[i].texto.trim()) &&
          !parrafos[i].texto.includes("RÚBRICA")
        ) {
          // Saltar encabezados y el título
          if (parrafos[i].texto.trim().length > 3 && parrafos[i].texto.trim().length < 60) {
            // Este es probablemente el nombre de una dimensión
            this.reemplazarTextoEnParrafo(parrafos[i].xml, dim.criterio)
            if (i + 1 < parrafos.length) this.reemplazarTextoEnParrafo(parrafos[i + 1].xml, dim.excelente)
            if (i + 2 < parrafos.length) this.reemplazarTextoEnParrafo(parrafos[i + 2].xml, dim.bueno)
            if (i + 3 < parrafos.length) this.reemplazarTextoEnParrafo(parrafos[i + 3].xml, dim.regular)
            if (i + 4 < parrafos.length) this.reemplazarTextoEnParrafo(parrafos[i + 4].xml, dim.deficiente)
            dimIdx++
            i += 4
          }
        }
      }
    }

    return this
  }

  /**
   * Reemplaza bibliografía (párrafos con URLs o formato bibliográfico).
   */
  reemplazarBibliografia(bibliografia: string[]): this {
    const parrafos = this.obtenerParrafos()

    // Encontrar sección de bibliografía y reemplazar los párrafos siguientes
    let enBibliografia = false
    let biblioIdx = 0

    for (const p of parrafos) {
      if (p.texto.trim() === "BIBLIOGRAFÍA") {
        enBibliografia = true
        continue
      }
      if (enBibliografia && biblioIdx < bibliografia.length) {
        // Detener si llegamos a una línea de firma
        if (p.texto.includes("___________________________") || p.texto.includes("DOCENTE")) {
          break
        }
        // Saltar "URL" label
        if (p.texto.trim() === "URL") {
          continue
        }
        this.reemplazarTextoEnParrafo(p.xml, bibliografia[biblioIdx])
        biblioIdx++
      }
    }

    return this
  }

  /**
   * Reemplaza la hora teórica y práctica.
   * Busca "Teórico" y reemplaza el párrafo siguiente (el número).
   */
  reemplazarHoras(teoricas: string, practicas: string): this {
    this.reemplazarCampo("Teórico", teoricas)
    this.reemplazarCampo("Práctico", practicas)
    return this
  }

  /**
   * Reemplaza el contenido de contenidos (items con bullet).
   */
  reemplazarContenidos(contenidos: string[]): this {
    const parrafos = this.obtenerParrafos()

    let contenidoIdx = 0
    let enContenidos = false

    for (const p of parrafos) {
      const t = p.texto.trim()

      if (t === "Contenidos") {
        enContenidos = true
        continue
      }

      if (enContenidos && contenidoIdx < contenidos.length) {
        // Si llegamos a "Lugar y tipo de sesión", terminamos
        if (t === "Lugar y tipo de sesión") break
        // Si el texto empieza con bullet (carácter especial) o tiene contenido
        if (t.length > 0) {
          this.reemplazarTextoEnParrafo(p.xml, `  ${contenidos[contenidoIdx]}`)
          contenidoIdx++
        }
      }
    }

    return this
  }

  /**
   * Método principal: aplica TODAS las sustituciones inteligentes
   * basadas en el resultado de la IA.
   */
  aplicarDatosIA(
    formData: Record<string, string>,
    aiOutput: {
      titulo: string
      logro: string
      capacidades: string[]
      contenidos: string[]
      indicador: string
      actividades: { numero: number; titulo: string; duracion: string; inicio: { estrategia: string; motivacion: string; saberesPrevios: string; conflictoCognitivo: string }; desarrollo: { estrategia: string; construccion: string; contenidoPrincipal: string; ejercicios: string[] }; cierre: { metacognicion: string; evaluacion: string; instrumento: string }; recursos: string[] }[]
      listaCotejo: { titulo: string; criterios: { numero: number; descripcion: string }[] }
      rubrica: { titulo: string; dimensiones: { criterio: string; excelente: string; bueno: string; regular: string; deficiente: string }[] }
      bibliografia: string[]
    }
  ): this {
    const { titulo } = aiOutput

    // 1. Campos simples del formulario (label → next paragraph)
    this.reemplazarCampo("Programa de estudios", formData.programaEstudios || "")
    this.reemplazarCampo("Modulo formativo", formData.moduloFormativo || "")
    this.reemplazarCampo("Unidad de competencia vinculada", formData.unidadCompetencia || "")
    this.reemplazarCampo("Unidad didáctica", formData.unidadDidactica || "")
    this.reemplazarCampo("Capacidad", formData.capacidad || "")
    this.reemplazarCampo("Indicador de logro vinculado", formData.indicadorLogro || "")
    this.reemplazarCampo("Competencia transversal priorizada", formData.competenciaTransversal || "")
    this.reemplazarCampo("Periodo lectivo", formData.periodoLectivo || "")
    this.reemplazarCampo("Periodo académico", formData.periodoAcademico || "")
    this.reemplazarCampo("Fecha de desarrollo", formData.fechaDesarrollo || "")
    this.reemplazarCampo("Docente responsable", formData.docente || "")

    // 2. Sesión = form.sesion + titulo de IA
    this.reemplazarCampo("Sesión de aprendizaje", `${formData.sesion}. ${titulo}`)

    // 3. Logro
    this.reemplazarCampo("Logro o propósito de la sesión", aiOutput.logro)

    // 4. Capacidades
    this.reemplazarCampo("Capacidad", aiOutput.capacidades.join(", "))

    // 5. Indicador completo
    this.reemplazarCampo("Indicador de logro vinculado", aiOutput.indicador)

    // 6. Contenidos (items con bullet)
    this.reemplazarContenidos(aiOutput.contenidos)

    // 7. Horas
    this.reemplazarHoras(formData.horasTeoricas || "2", formData.horasPracticas || "12")

    // 8. Actividades (reemplazo completo de sección)
    const actividadesXml = aiOutput.actividades.map(a => ({
      numero: a.numero,
      inicio: `${a.inicio.estrategia}. Motivación: ${a.inicio.motivacion}. Saberes previos: ${a.inicio.saberesPrevios}. Conflicto cognitivo: ${a.inicio.conflictoCognitivo}`,
      desarrollo: `${a.desarrollo.estrategia}. ${a.desarrollo.construccion}. ${a.desarrollo.contenidoPrincipal}`,
      cierre: `${a.cierre.metacognicion}. Evaluación: ${a.cierre.evaluacion}. Instrumento: ${a.cierre.instrumento}`,
    }))
    this.reemplazarActividades(actividadesXml)

    // 9. Lista de Cotejo
    this.reemplazarListaCotejo(
      aiOutput.listaCotejo.titulo,
      aiOutput.listaCotejo.criterios.map(c => c.descripcion)
    )

    // 10. Rúbrica
    this.reemplazarRubrica(aiOutput.rubrica.dimensiones)

    // 11. Bibliografía
    this.reemplazarBibliografia(aiOutput.bibliografia)

    return this
  }

  obtenerPlaceholders(): string[] {
    const texto = this._extraerTexto(this.xml)
    const regex = /\{\{(.*?)\}\}/g
    const placeholders: string[] = []
    let match: RegExpExecArray | null
    while ((match = regex.exec(texto)) !== null) {
      const name = match[1].trim()
      if (!placeholders.includes(name)) placeholders.push(name)
    }
    return placeholders
  }

  async guardar(tipo: "blob" | "base64" = "blob"): Promise<Blob | string> {
    this.zip.file(this.documento, this.xml, { base64: false })
    if (tipo === "base64") {
      return this.zip.generate({ type: "base64", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
    }
    return this.zip.generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
  }

  // ---- privados ----

  private _extraerTexto(xml: string): string {
    const textos: string[] = []
    const regex = /<w:t[^>]*>([^<]+)<\/w:t>/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(xml)) !== null) {
      textos.push(match[1])
    }
    return textos.join("")
  }

  private _escaparXml(texto: string): string {
    return texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  }

  private _parrafoAnteriorTieneTexto(
    parrafos: { texto: string; xml: string; index: number }[],
    actual: { texto: string; xml: string; index: number },
    textoBuscado: string,
    bloqueActual: string
  ): boolean {
    const idx = parrafos.indexOf(actual)
    if (idx <= 0) return false
    for (let i = idx - 1; i >= 0; i--) {
      if (parrafos[i].texto.trim() === textoBuscado.trim() && bloqueActual.includes(parrafos[i].xml)) return true
      if (parrafos[i].texto.trim().startsWith("N°")) return false
    }
    return false
  }
}
