# ¿Por qué la imprenta de Gutenberg se difundió tan rápido?

<theme name="text" />

Antes de 1450 los libros se copiaban a mano. En pocas décadas, una máquina de Maguncia llenó Europa de libros. ¿Qué hizo posible ese salto?

<arch id="ingredientes" title="La imprenta combinó cuatro ingredientes que ya existían">
  <node id="papel" label="Papel" desc="Más barato que el pergamino de piel" kind="module" ref="source.md:11-16" />
  <node id="prensa" label="Prensa de tornillo" desc="Se usaba para prensar uvas y aceitunas" kind="module" ref="source.md:11-16" />
  <node id="metal" label="Metalurgia" desc="Los orfebres sabían fundir y trabajar metales" kind="module" ref="source.md:11-16" />
  <node id="demanda" label="Demanda de libros" desc="Universidades y comerciantes querían leer más" kind="actor" ref="source.md:11-16" />
  <node id="imprenta" label="Imprenta de Gutenberg" desc="Tipos móviles metálicos, tinta grasa y prensa" kind="service" ref="source.md:18-26" />
  <edge from="papel" to="imprenta" label="soporte barato" />
  <edge from="prensa" to="imprenta" label="presión" />
  <edge from="metal" to="imprenta" label="tipos de aleación" />
  <edge from="demanda" to="imprenta" label="mercado" />
  <code node="imprenta" ref="source.md:20-24">Tres ideas propias: tipos móviles metálicos, una aleación y una tinta a base de aceite.</code>
</arch>

<concept term="Tipos móviles">
<define>Letras individuales de metal que se pueden reutilizar para componer páginas distintas.</define>
<analogy>Como las piezas de un Scrabble: con las mismas letras se arman palabras diferentes.</analogy>
<example>Una misma caja de tipos sirve para imprimir una página hoy y otra distinta mañana.</example>
</concept>

<compare id="antes-despues" title="Imprimir hizo barato lo que copiar hacía carísimo" a="Copiar a mano" b="Imprimir" ref="source.md:7-9">
<pair label="Tiempo por libro" a="Un año o más para una Biblia" b="Cientos de copias de una composición" winner="b" />
<pair label="Quién lo tenía" a="La Iglesia, universidades y nobles" b="Cualquiera con dinero para un libro más barato" winner="b" />
<pair label="Soporte" a="Pergamino de piel" b="Papel" winner="b" />
</compare>

<timeline id="difusion" title="En 50 años la imprenta pasó de un taller a toda Europa" ref="source.md:18-32">
<event label="Gutenberg inventa el sistema" when="hacia 1450">En Maguncia, con un préstamo del prestamista Johann Fust.</event>
<event label="Biblia de 42 líneas" when="hacia 1455">Se hacen unos 180 ejemplares.</event>
<event label="Los folletos de Lutero" when="1517">Circulan por Alemania en semanas.</event>
<event label="Imprentas por Europa" when="hacia 1500">Más de 250 ciudades tienen talleres.</event>
</timeline>

<stats title="Hacia 1500">
<stat value="180" label="ejemplares de la Biblia de 42 líneas" />
<stat value="250" label="ciudades europeas con imprentas" />
<stat value="20 millones" label="ejemplares impresos, según los cálculos" />
</stats>

<quiz question="¿Cuántos ejemplares tuvo la Biblia de 42 líneas?">
<option correct="true" why="Se hicieron unos 180 ejemplares hacia 1455.">Unos 180</option>
<option why="Hacia 1500 se habían impreso unos 20 millones de ejemplares de todos los libros, no de esta Biblia.">Unos 20 millones</option>
<option why="Fueron pocos para un libro tan largo, pero más de uno.">Uno solo</option>
</quiz>
