# ¿Cómo fabrica una hoja su alimento con luz?

<theme name="plain" />

La fotosíntesis convierte dióxido de carbono, agua y luz en glucosa y oxígeno. Seguimos una hoja de un árbol en un día soleado.

<arch id="hoja" title="Una hoja recibe agua por abajo y CO2 por sus poros">
  <node id="raiz" label="Raíz" desc="Absorbe agua del suelo" kind="actor" ref="source.md:13-15" />
  <node id="tallo" label="Tallo" desc="Sube el agua hasta la hoja" kind="module" ref="source.md:13-15" />
  <node id="aire" label="Aire" desc="Aporta CO2 y recibe oxígeno" kind="external" ref="source.md:13-15" />
  <group id="hoja-g" label="Hoja" desc="Fabrica la glucosa" kind="module">
    <node id="estomas" label="Estomas" desc="Poros por donde entra el CO2 y sale el O2" kind="ui" ref="source.md:13-15" />
    <node id="cloroplasto" label="Cloroplasto" desc="Contiene la clorofila y las dos fases" kind="module" ref="source.md:17-22" />
  </group>
  <edge from="raiz" to="tallo" label="agua" />
  <edge from="tallo" to="cloroplasto" label="agua" />
  <edge from="aire" to="estomas" label="CO2" />
  <edge from="estomas" to="cloroplasto" label="CO2" />
  <edge from="cloroplasto" to="estomas" label="O2" />
  <code node="cloroplasto" ref="source.md:17-22">Dentro del cloroplasto hay dos zonas: los tilacoides y el estroma.</code>
</arch>

<flow id="proceso" title="La luz rompe el agua y el carbono termina en la glucosa">
  <node id="luz" label="Luz del sol" desc="Aporta la energía" kind="external" ref="source.md:24-26" />
  <node id="tilacoides" label="Tilacoides" desc="Absorben la luz con la clorofila" kind="module" ref="source.md:28-30" />
  <node id="estroma" label="Estroma" desc="Fabrica la glucosa con el ciclo de Calvin" kind="module" ref="source.md:32-34" />
  <step from="luz" to="tilacoides" label="luz" ref="source.md:24-26">La clorofila absorbe la luz roja y la azul, y refleja la verde.</step>
  <step from="tilacoides" label="rompe agua" ref="source.md:28-30">La luz rompe moléculas de agua y de ahí sale el oxígeno que la hoja libera.</step>
  <step from="tilacoides" to="estroma" label="ATP y NADPH" ref="source.md:28-30">La energía de la luz queda guardada en dos moléculas portadoras: ATP y NADPH.</step>
  <step from="estroma" label="ciclo de Calvin" ref="source.md:32-34">El estroma usa esas moléculas para unir el carbono del CO2 y construir glucosa.</step>
  <code node="estroma" ref="source.md:32-34">El ciclo de Calvin no necesita luz directa, pero sí lo que la luz produjo.</code>
</flow>

<trace id="atomos" title="El oxígeno viene del agua y el carbono acaba en la glucosa" ref="source.md:7-11">
<value kind="list" label="Lo que entra" note="Seis moléculas de CO2 y seis de agua entran por cada glucosa.">6 CO2|6 H2O|luz</value>
<value kind="list" label="Fase luminosa" note="El agua se rompe: de ahí sale el oxígeno, y la energía queda en ATP y NADPH.">6 O2|ATP|NADPH</value>
<value label="Ciclo de Calvin" note="El carbono del CO2 se une en una sola molécula de azúcar.">1 glucosa (C6H12O6)</value>
</trace>

<stats title="Una hoja de roble de 20 cm² en una hora de sol">
<stat value="6 mg" label="de glucosa fabricada" />
<stat value="8,8 mg" label="de CO2 que absorbe" />
<stat value="3,6 mg" label="de agua que absorbe" />
<stat value="6,4 mg" label="de oxígeno que libera" />
</stats>

<compare id="fases" title="Las dos fases ocurren en lugares distintos y hacen cosas distintas" a="Fase luminosa" b="Ciclo de Calvin" ref="source.md:28-34">
<pair label="Dónde" a="Tilacoides" b="Estroma" />
<pair label="Qué usa" a="Luz y agua" b="ATP, NADPH y CO2" />
<pair label="Qué produce" a="O2, ATP y NADPH" b="Glucosa" />
</compare>

<concept term="Clorofila">
<define>El pigmento verde de los cloroplastos que absorbe la luz roja y la azul.</define>
<analogy>Como un panel solar de la hoja: capta la luz para usarla como energía.</analogy>
<example>La luz verde casi no se absorbe, se refleja, y por eso las hojas se ven verdes.</example>
</concept>

<quiz question="¿Qué hace la fase luminosa con la energía de la luz?">
<option correct="true" why="La energía queda en el ATP y el NADPH, que el ciclo de Calvin usa después.">La guarda en ATP y NADPH</option>
<option why="La glucosa se fabrica en el ciclo de Calvin, no en la fase luminosa.">La usa para fabricar glucosa directamente</option>
<option why="La luz no se convierte en agua: rompe moléculas de agua.">La convierte en agua</option>
</quiz>
