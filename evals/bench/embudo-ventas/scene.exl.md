# ¿Dónde se pierden los compradores antes de comprar?

<theme name="business" />

Una tienda de software recibió 10 000 visitas en octubre y vendió 60 licencias. Seguimos esas visitas por cinco etapas para ver dónde se pierde la gente.

<trace id="embudo" title="De 10 000 visitas quedan 60 ventas" ref="source.md:7-13">
<value kind="table" label="Visitas a la web" note="Todo empieza con las personas que llegan a la web.">personas=10 000</value>
<value kind="table" label="Se registran" note="Solo el 12 % deja sus datos.">personas=1 200|pasan=12 %</value>
<value kind="table" label="Piden una demo" note="El 40 % de los registrados quiere ver el producto.">personas=480|pasan=40 %</value>
<value kind="table" label="Reciben una propuesta" note="La mitad de las demos termina en una propuesta.">personas=240|pasan=50 %</value>
<value kind="table" label="Compran" note="Una de cada cuatro propuestas se cierra.">personas=60|pasan=25 %</value>
</trace>

<chart id="etapas" title="La mayor pérdida ocurre entre la visita y el registro" type="hbars" unit=" personas" ref="source.md:7-13">
<row label="Visitas" values="10000" />
<row label="Registros" values="1200" />
<row label="Demos" values="480" />
<row label="Propuestas" values="240" />
<row label="Ventas" values="60" />
</chart>

<concept term="Tasa de conversión">
<define>El porcentaje de personas de una etapa que pasa a la siguiente.</define>
<analogy>Como los alumnos que aprueban cada curso: no todos llegan al último.</analogy>
<formula>\text{conversión} = \frac{\text{personas que pasan}}{\text{personas de la etapa}}</formula>
<example>De 10 000 visitas, 1 200 se registran: 1 200 / 10 000 = 12 %.</example>
</concept>

<concept term="Cuello de botella">
<define>La etapa con la menor tasa de conversión, la que más gente pierde en proporción.</define>
<analogy>Como el cuello de una botella: por mucho que llenes arriba, sale lo que cabe por el punto más estrecho.</analogy>
<example>Aquí es el registro: solo el 12 % de las visitas pasa.</example>
</concept>

<concept term="Costo de adquisición (CAC)">
<define>Lo que se gasta en marketing para conseguir un cliente.</define>
<analogy>Como el precio de la invitación a una fiesta, repartido entre los que vienen.</analogy>
<formula>\text{CAC} = \frac{\text{gasto en marketing}}{\text{ventas}}</formula>
<example>6 000 € de marketing entre 60 ventas dan 100 € por cliente.</example>
</concept>

<stats title="El mes de octubre en tres números">
<stat value="0,6 %" label="conversión total de visitas a ventas" />
<stat value="30 000 €" label="ingresos: 60 ventas de 500 €" />
<stat value="100 €" label="costo de adquisición por cliente" />
</stats>

<compare id="mejorar" title="Mejorar una etapa mejora el resultado final en la misma proporción" a="Hoy" b="Última etapa al 30 %" ref="source.md:30-32">
<pair label="Propuestas" a="240" b="240" winner="tie" />
<pair label="Conversión de la última etapa" a="25 %" b="30 %" winner="b" />
<pair label="Ventas" a="60" b="72" winner="b" />
</compare>

<quiz question="Dos meses venden 60 licencias cada uno. ¿Por qué pueden pedir acciones distintas?">
<option correct="true" why="Cada mes puede perder gente en otra etapa, y cada cuello de botella se arregla de otra forma.">Porque el cuello de botella puede estar en etapas distintas</option>
<option why="Si las ventas son iguales, el dinero coincide; lo que cambia es dónde se pierde la gente.">Porque ganan dinero distinto</option>
<option why="Las ventas iguales no dicen nada sobre las etapas anteriores.">No piden acciones distintas</option>
</quiz>
