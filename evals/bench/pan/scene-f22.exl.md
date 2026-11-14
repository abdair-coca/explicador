# ¿Cómo se convierte una masa en pan?

<theme name="plain" />

Una hogaza de 500 g de harina, 325 g de agua, 10 g de sal y 5 g de levadura pasa por tres cambios químicos antes de ser pan: amasar, fermentar y hornear.

<flow id="proceso" title="El gluten atrapa el gas y el horno fija la forma">
  <node id="masa" label="Harina y agua" desc="Se mezclan y forman gluten" kind="module" ref="source.md:16-18" />
  <node id="levadura" label="Levadura" desc="Se alimenta de azúcares y suelta gas" kind="actor" ref="source.md:20-28" />
  <node id="horno" label="Horno a 220 °C" desc="Fija la forma y dora la corteza" kind="service" ref="source.md:30-37" />
  <step from="masa" label="amasar" ref="source.md:16-18">La gliadina y la glutenina forman el gluten, una red elástica que amasar ordena.</step>
  <step from="masa" to="levadura" label="azúcares" ref="source.md:20-24">La levadura se come los azúcares de la masa y produce alcohol y dióxido de carbono.</step>
  <step from="levadura" to="masa" label="CO2" ref="source.md:26-28">El gas queda atrapado en la red de gluten y la masa sube; el alcohol da aroma.</step>
  <step from="masa" to="horno" label="masa fermentada" ref="source.md:30-37">La masa entra al horno, donde el calor expande las burbujas hasta que la levadura muere.</step>
  <step from="horno" label="corteza" ref="source.md:37">La superficie se dora con la reacción de Maillard, que da color y aroma.</step>
  <code node="horno" ref="source.md:33-37">Cuatro cambios en orden: salto de horno, almidón, proteínas y corteza.</code>
</flow>

<trace id="azucar" title="Un azúcar se convierte en alcohol y gas durante la fermentación" ref="source.md:22-24">
<value label="La levadura recibe" note="La harina aporta los azúcares que la levadura necesita.">1 molécula de azúcar (C6H12O6)</value>
<value kind="list" label="La levadura produce" code="C6H12O6 → 2 C2H5OH + 2 CO2" note="El alcohol da aroma; el gas es el que hace subir la masa.">2 etanol|2 CO2</value>
<value label="La masa" note="El CO2 queda atrapado en la red de gluten, como el aire en un globo.">sube</value>
</trace>

<derive id="hidratacion" title="La hidratación de la masa es el agua dividida entre la harina" ref="source.md:10-14">
<line note="La definición de hidratación.">\text{hidratación} = \frac{\text{agua}}{\text{harina}}</line>
<line note="Ponemos los gramos de la receta.">\text{hidratación} = \frac{325}{500}</line>
<line note="El resultado, como porcentaje.">\text{hidratación} = 65\,\%</line>
</derive>

<timeline id="horno" title="En el horno ocurren cuatro cambios en orden" ref="source.md:30-37">
<event label="Salto de horno" when="1">El calor expande las burbujas y la masa crece un poco más.</event>
<event label="El almidón se gelatiniza" when="2">Absorbe agua y se hincha: fija la miga.</event>
<event label="Las proteínas coagulan" when="3">El gluten se endurece y la forma queda fija.</event>
<event label="La corteza se dora" when="4">Por encima de 140 °C actúa la reacción de Maillard.</event>
</timeline>

<concept term="Gluten">
<define>Una red elástica que forman dos proteínas del trigo cuando se mezclan con agua.</define>
<analogy>Como un globo que se estira sin romperse y retiene el aire que le soplas.</analogy>
<example>Una masa bien amasada se estira en una lámina fina sin romperse.</example>
</concept>

<concept term="Reacción de Maillard">
<define>La reacción de azúcares y aminoácidos a alta temperatura que produce color marrón y aromas.</define>
<analogy>Como el tostado del pan en la tostadora: la superficie cambia de color y de olor.</analogy>
<example>Por encima de unos 140 °C, la superficie de la hogaza se dora.</example>
</concept>

<quiz question="Alguien disuelve la levadura en agua a 80 °C. ¿Qué pasa con la masa?">
<option correct="true" why="Por encima de unos 60 °C la levadura muere y ya no produce gas.">No sube, porque la levadura muere</option>
<option why="El calor del agua no activa la levadura: la mata.">Sube más rápido por el calor</option>
<option why="La temperatura sí importa: la levadura trabaja entre 25 y 35 °C.">Sube igual</option>
</quiz>
